import { Mp3Encoder } from "@breezystack/lamejs";
import {
  AudioAnalysis,
  ConversionOptions,
  FORMAT_SPECS,
  MasteringSettings,
} from "./types";

function getAudioContextClass(): typeof AudioContext {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctx = w.AudioContext || w.webkitAudioContext;
  if (!Ctx) {
    throw new Error("Web Audio API is not supported in this browser.");
  }
  return Ctx;
}

// Zero-delay browser frame yield (avoids 4ms setTimeout clamping)
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof MessageChannel !== "undefined") {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => resolve();
      ch.port2.postMessage(null);
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export async function decodeMediaFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = getAudioContextClass();
  const ctx = new AudioCtx();
  try {
    // Pass arrayBuffer directly without copying to cut RAM & decode latency
    return await ctx.decodeAudioData(arrayBuffer);
  } catch {
    throw new Error(
      `Unable to decode audio track from "${file.name}". Ensure the file contains a supported audio stream.`
    );
  } finally {
    await ctx.close().catch(() => {});
  }
}

export function analyzeAudioBuffer(
  buffer: AudioBuffer,
  barCount = 72
): AudioAnalysis {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const durationSec = buffer.duration;

  // Strided analysis (~40k samples max) executes in < 5ms for any track length
  const stride = Math.max(1, Math.floor(length / 40960));
  const ch0 = buffer.getChannelData(0);
  const ch1 = numChannels > 1 ? buffer.getChannelData(1) : null;

  let peak = 0;
  let sumSquares = 0;
  let sampleCount = 0;
  let lowEnergy = 0;
  let midEnergy = 0;
  let highEnergy = 0;
  let lp1 = 0;
  let lp2 = 0;
  const alphaLow = Math.min(0.95, (2 * Math.PI * 250 * stride) / sampleRate);
  const alphaMid = Math.min(0.95, (2 * Math.PI * 3000 * stride) / sampleRate);

  for (let i = 0; i < length; i += stride) {
    const x = ch1 ? (ch0[i] + ch1[i]) * 0.5 : ch0[i];
    const abs = x < 0 ? -x : x;
    if (abs > peak) peak = abs;
    sumSquares += x * x;
    sampleCount++;

    lp1 += alphaLow * (x - lp1);
    lp2 += alphaMid * (x - lp2);
    const low = lp1;
    const mid = lp2 - lp1;
    const high = x - lp2;
    lowEnergy += low * low;
    midEnergy += mid * mid;
    highEnergy += high * high;
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, sampleCount));
  const peakDb = peak > 1e-6 ? 20 * Math.log10(peak) : -96;
  const rmsDb = rms > 1e-6 ? 20 * Math.log10(rms) : -96;
  const crestFactorDb = Math.max(0, peakDb - rmsDb);

  // Fast strided waveform peak bars
  const waveformPeaks: number[] = new Array(barCount);
  const step = Math.max(1, Math.floor(length / barCount));
  const innerStride = Math.max(1, Math.floor(step / 32));
  for (let b = 0; b < barCount; b++) {
    const start = b * step;
    const end = Math.min(length, start + step);
    let blockPeak = 0;
    for (let i = start; i < end; i += innerStride) {
      const val = ch0[i] < 0 ? -ch0[i] : ch0[i];
      if (val > blockPeak) blockPeak = val;
    }
    waveformPeaks[b] = Number(Math.min(1, blockPeak).toFixed(3));
  }

  const totalEnergy = Math.max(1e-9, lowEnergy + midEnergy + highEnergy);

  return {
    durationSec,
    sampleRate,
    channels: numChannels,
    peakDb: Number(peakDb.toFixed(1)),
    rmsDb: Number(rmsDb.toFixed(1)),
    crestFactorDb: Number(crestFactorDb.toFixed(1)),
    lowBandRatio: Number((lowEnergy / totalEnergy).toFixed(3)),
    midBandRatio: Number((midEnergy / totalEnergy).toFixed(3)),
    highBandRatio: Number((highEnergy / totalEnergy).toFixed(3)),
    waveformPeaks,
  };
}

function computePeakGain(buffer: AudioBuffer, targetPeakDb: number): number {
  let maxPeak = 0;
  const stride = Math.max(1, Math.floor(buffer.length / 100000));
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i += stride) {
      const abs = data[i] < 0 ? -data[i] : data[i];
      if (abs > maxPeak) maxPeak = abs;
    }
  }
  if (maxPeak < 1e-6) return 1;
  const targetLinear = Math.pow(10, targetPeakDb / 20);
  return targetLinear / maxPeak;
}

function applyGainInPlace(buffer: AudioBuffer, gain: number): void {
  if (Math.abs(gain - 1) < 0.01) return;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const s = data[i] * gain;
      data[i] = s > 1 ? 1 : s < -1 ? -1 : s;
    }
  }
}

export async function renderProcessedAudio(
  sourceBuffer: AudioBuffer,
  options: ConversionOptions,
  onProgress?: (percent: number) => void
): Promise<{ blob: Blob; processedBuffer: AudioBuffer; analysis: AudioAnalysis }> {
  onProgress?.(20);

  const m: MasteringSettings = options.mastering;
  const needsTrim =
    options.trimStartSec > 0 ||
    (options.trimEndSec !== null && options.trimEndSec < sourceBuffer.duration - 0.05);
  const needsResampleOrMix =
    sourceBuffer.sampleRate !== options.sampleRate ||
    sourceBuffer.numberOfChannels !== options.channels;

  let renderedBuffer: AudioBuffer;

  // Fast-path: skip OfflineAudioContext graph when format matches & no DSP/trim is active
  if (!m.enabled && !needsTrim && !needsResampleOrMix) {
    renderedBuffer = sourceBuffer;
  } else {
    const trimStart = Math.max(
      0,
      Math.min(options.trimStartSec, sourceBuffer.duration - 0.1)
    );
    const trimEnd =
      options.trimEndSec !== null && options.trimEndSec > trimStart
        ? Math.min(options.trimEndSec, sourceBuffer.duration)
        : sourceBuffer.duration;
    const outputDuration = Math.max(0.1, trimEnd - trimStart);

    const targetLength = Math.max(
      1,
      Math.ceil(outputDuration * options.sampleRate)
    );
    const offline = new OfflineAudioContext(
      options.channels,
      targetLength,
      options.sampleRate
    );

    const source = offline.createBufferSource();
    source.buffer = sourceBuffer;

    let currentNode: AudioNode = source;

    if (m.enabled) {
      const hp = offline.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = Math.max(20, Math.min(250, m.highPassHz));
      currentNode.connect(hp);
      currentNode = hp;

      if (Math.abs(m.lowGainDb) > 0.05) {
        const lowEq = offline.createBiquadFilter();
        lowEq.type = "lowshelf";
        lowEq.frequency.value = 120;
        lowEq.gain.value = m.lowGainDb;
        currentNode.connect(lowEq);
        currentNode = lowEq;
      }

      if (Math.abs(m.midGainDb) > 0.05) {
        const midEq = offline.createBiquadFilter();
        midEq.type = "peaking";
        midEq.frequency.value = 1500;
        midEq.Q.value = 1.0;
        midEq.gain.value = m.midGainDb;
        currentNode.connect(midEq);
        currentNode = midEq;
      }

      if (Math.abs(m.highGainDb) > 0.05) {
        const highEq = offline.createBiquadFilter();
        highEq.type = "highshelf";
        highEq.frequency.value = 6000;
        highEq.gain.value = m.highGainDb;
        currentNode.connect(highEq);
        currentNode = highEq;
      }

      const comp = offline.createDynamicsCompressor();
      comp.threshold.value = Math.max(-45, Math.min(0, m.compThresholdDb));
      comp.ratio.value = Math.max(1, Math.min(12, m.compRatio));
      comp.knee.value = 6;
      comp.attack.value = 0.005;
      comp.release.value = 0.15;
      currentNode.connect(comp);
      currentNode = comp;
    }

    const fadeGain = offline.createGain();
    fadeGain.gain.setValueAtTime(1, 0);
    if (m.enabled && m.fadeInSec > 0 && m.fadeInSec < outputDuration * 0.45) {
      fadeGain.gain.setValueAtTime(0.0001, 0);
      fadeGain.gain.linearRampToValueAtTime(1, m.fadeInSec);
    }
    if (m.enabled && m.fadeOutSec > 0 && m.fadeOutSec < outputDuration * 0.45) {
      const fadeOutStart = Math.max(0, outputDuration - m.fadeOutSec);
      fadeGain.gain.setValueAtTime(1, fadeOutStart);
      fadeGain.gain.linearRampToValueAtTime(0.0001, outputDuration);
    }

    currentNode.connect(fadeGain);
    fadeGain.connect(offline.destination);

    source.start(0, trimStart, outputDuration);
    renderedBuffer = await offline.startRendering();
  }

  onProgress?.(45);

  if (options.normalize || m.enabled) {
    const targetPeak = m.enabled ? m.normalizePeakDb : -1.0;
    const gain = computePeakGain(renderedBuffer, targetPeak);
    applyGainInPlace(renderedBuffer, gain);
  }

  const analysis = analyzeAudioBuffer(renderedBuffer);
  onProgress?.(55);

  let blob: Blob;
  if (options.format === "wav-16") {
    blob = encodeWav(renderedBuffer, 16);
    onProgress?.(100);
  } else if (options.format === "wav-24") {
    blob = encodeWav(renderedBuffer, 24);
    onProgress?.(100);
  } else {
    const kbps =
      options.format === "mp3-320"
        ? 320
        : options.format === "mp3-192"
        ? 192
        : 128;
    blob = await encodeMp3(renderedBuffer, kbps, (p) => {
      onProgress?.(Math.round(55 + p * 45));
    });
    onProgress?.(100);
  }

  return { blob, processedBuffer: renderedBuffer, analysis };
}

export function encodeWav(buffer: AudioBuffer, bitDepth: 16 | 24): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  if (bitDepth === 16) {
    const pcm = new Int16Array(arrayBuffer, 44);
    if (numChannels === 1) {
      const ch0 = buffer.getChannelData(0);
      for (let i = 0; i < numFrames; i++) {
        const s = ch0[i];
        const clamped = s > 1 ? 1 : s < -1 ? -1 : s;
        pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      }
    } else {
      const ch0 = buffer.getChannelData(0);
      const ch1 = buffer.getChannelData(1);
      let idx = 0;
      for (let i = 0; i < numFrames; i++) {
        const s0 = ch0[i] > 1 ? 1 : ch0[i] < -1 ? -1 : ch0[i];
        const s1 = ch1[i] > 1 ? 1 : ch1[i] < -1 ? -1 : ch1[i];
        pcm[idx++] = s0 < 0 ? s0 * 0x8000 : s0 * 0x7fff;
        pcm[idx++] = s1 < 0 ? s1 * 0x8000 : s1 * 0x7fff;
      }
    }
  } else {
    const out = new Uint8Array(arrayBuffer, 44);
    const channels: Float32Array[] = [];
    for (let ch = 0; ch < numChannels; ch++) {
      channels.push(buffer.getChannelData(ch));
    }
    let offset = 0;
    for (let i = 0; i < numFrames; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const s = channels[ch][i];
        const clamped = s > 1 ? 1 : s < -1 ? -1 : s;
        const intVal = Math.round(
          clamped < 0 ? clamped * 0x800000 : clamped * 0x7fffff
        );
        out[offset++] = intVal & 0xff;
        out[offset++] = (intVal >> 8) & 0xff;
        out[offset++] = (intVal >> 16) & 0xff;
      }
    }
  }

  return new Blob([arrayBuffer], {
    type: FORMAT_SPECS[`wav-${bitDepth}`].mimeType,
  });
}

function floatTo16BitPCM(float32: Float32Array): Int16Array {
  const len = float32.length;
  const int16 = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    const s = float32[i];
    const clamped = s > 1 ? 1 : s < -1 ? -1 : s;
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return int16;
}

export async function encodeMp3(
  buffer: AudioBuffer,
  kbps: number,
  onProgress?: (fraction: number) => void
): Promise<Blob> {
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const encoder = new Mp3Encoder(numChannels, buffer.sampleRate, kbps);
  const left = floatTo16BitPCM(buffer.getChannelData(0));
  const right =
    numChannels > 1 ? floatTo16BitPCM(buffer.getChannelData(1)) : undefined;

  const mp3Chunks: Uint8Array[] = [];
  // Large 64-frame batching (73,728 samples) encodes ~10x faster in JS
  const blockSize = 1152 * 64;
  const total = left.length;
  let batchCount = 0;

  for (let i = 0; i < total; i += blockSize) {
    const end = Math.min(total, i + blockSize);
    const leftSlice = left.subarray(i, end);
    const rightSlice = right ? right.subarray(i, end) : undefined;
    const encoded = encoder.encodeBuffer(leftSlice, rightSlice);
    if (encoded.length > 0) {
      mp3Chunks.push(new Uint8Array(encoded));
    }
    batchCount++;
    if (batchCount % 4 === 0) {
      onProgress?.(end / total);
      await yieldToMain();
    }
  }

  const flushed = encoder.flush();
  if (flushed.length > 0) {
    mp3Chunks.push(new Uint8Array(flushed));
  }
  onProgress?.(1);

  return new Blob(mp3Chunks, { type: "audio/mpeg" });
}

export async function encodeForTranscription(
  blob: Blob
): Promise<{ base64: string; mimeType: string }> {
  const arr = await blob.arrayBuffer();
  const AudioCtx = getAudioContextClass();
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arr);
  } finally {
    await ctx.close().catch(() => {});
  }

  const maxDuration = Math.min(decoded.duration, 480);
  const targetRate = 16000;
  const offline = new OfflineAudioContext(
    1,
    Math.ceil(maxDuration * targetRate),
    targetRate
  );
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0, 0, maxDuration);
  const mono16k = await offline.startRendering();

  const compactMp3 = await encodeMp3(mono16k, 64);
  const base64 = await blobToBase64(compactMp3);
  return { base64, mimeType: "audio/mp3" };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.onerror = () => reject(new Error("Failed to encode audio payload."));
    reader.readAsDataURL(blob);
  });
}

// Save directly onto user's local device without network dependency
export async function saveAudioToDevice(
  blob: Blob,
  filename: string
): Promise<"filesystem" | "blob"> {
  const isTopLevel =
    typeof window !== "undefined" && window.self === window.top;
  const win = window as unknown as {
    showSaveFilePicker?: (opts: {
      suggestedName: string;
      types?: { description: string; accept: Record<string, string[]> }[];
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  if (isTopLevel && typeof win.showSaveFilePicker === "function") {
    try {
      const isWav = filename.toLowerCase().endsWith(".wav");
      const handle = await win.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: isWav ? "WAV Audio" : "MP3 Audio",
            accept: isWav
              ? { "audio/wav": [".wav"] }
              : { "audio/mpeg": [".mp3"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "filesystem";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
  }, 250);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "blob";
}

export async function createSampleMediaFile(): Promise<File> {
  const sampleRate = 48000;
  const duration = 6.0;
  const offline = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  const chordFreqs = [
    [220.0, 261.63, 329.63, 392.0],
    [174.61, 220.0, 261.63, 329.63],
    [196.0, 246.94, 293.66, 349.23],
  ];

  chordFreqs.forEach((chord, barIdx) => {
    const startTime = barIdx * 2.0;
    const stopTime = startTime + 1.95;

    chord.forEach((freq, voiceIdx) => {
      const osc = offline.createOscillator();
      const gain = offline.createGain();
      const pan = offline.createStereoPanner();

      osc.type = voiceIdx === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      pan.pan.value = voiceIdx % 2 === 0 ? -0.25 : 0.25;

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.09, startTime + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.04, stopTime - 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

      osc.connect(gain);
      gain.connect(pan);
      pan.connect(offline.destination);

      osc.start(startTime);
      osc.stop(stopTime);
    });
  });

  const rendered = await offline.startRendering();
  const wavBlob = encodeWav(rendered, 16);
  return new File([wavBlob], "Studio_Chord_Demo.wav", {
    type: "audio/wav",
  });
}
