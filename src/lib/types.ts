export type OutputFormat =
  | "mp3-320"
  | "mp3-192"
  | "mp3-128"
  | "wav-24"
  | "wav-16";

export type SampleRateOption = 44100 | 48000;
export type ChannelOption = 1 | 2;

export interface MasteringSettings {
  enabled: boolean;
  highPassHz: number; // 20 - 200 Hz
  lowGainDb: number; // -12 to +12 dB (120Hz shelf)
  midGainDb: number; // -12 to +12 dB (1.5kHz peaking)
  highGainDb: number; // -12 to +12 dB (6kHz shelf)
  compThresholdDb: number; // -40 to 0 dB
  compRatio: number; // 1 to 12
  normalizePeakDb: number; // -3.0 to -0.1 dBFS
  fadeInSec: number; // 0 to 3 sec
  fadeOutSec: number; // 0 to 3 sec
}

export const DEFAULT_MASTERING: MasteringSettings = {
  enabled: false,
  highPassHz: 40,
  lowGainDb: 0,
  midGainDb: 0,
  highGainDb: 0,
  compThresholdDb: -18,
  compRatio: 2.5,
  normalizePeakDb: -1.0,
  fadeInSec: 0,
  fadeOutSec: 0,
};

export interface ConversionOptions {
  format: OutputFormat;
  sampleRate: SampleRateOption;
  channels: ChannelOption;
  normalize: boolean;
  trimStartSec: number;
  trimEndSec: number | null;
  mastering: MasteringSettings;
}

export interface AudioAnalysis {
  durationSec: number;
  sampleRate: number;
  channels: number;
  peakDb: number;
  rmsDb: number;
  crestFactorDb: number;
  lowBandRatio: number;
  midBandRatio: number;
  highBandRatio: number;
  waveformPeaks: number[];
}

export interface MasteringAdvice {
  recommendedPresetName: string;
  rationale: string;
  settings: MasteringSettings;
}

export type TrackStatus = "queued" | "decoding" | "encoding" | "ready" | "error";

export interface TrackItem {
  id: string;
  originalName: string;
  outputName: string;
  sourceExt: string;
  sourceMime: string;
  originalSize: number;
  convertedSize: number | null;
  status: TrackStatus;
  progress: number; // 0 - 100
  errorMessage?: string;
  options: ConversionOptions;
  analysis?: AudioAnalysis;
  masteringAdvice?: MasteringAdvice;
  transcript?: string;
  createdAt: number;
  // Runtime-only / IDB-persisted references
  sourceFile?: File;
  outputBlob?: Blob;
}

export interface FormatSpec {
  id: OutputFormat;
  label: string;
  shortLabel: string;
  extension: string;
  mimeType: string;
  bitrateLabel: string;
  compression: string;
  useCase: string;
}

export const FORMAT_SPECS: Record<OutputFormat, FormatSpec> = {
  "mp3-320": {
    id: "mp3-320",
    label: "MP3 · 320 kbps",
    shortLabel: "MP3 320k",
    extension: "mp3",
    mimeType: "audio/mpeg",
    bitrateLabel: "320 kbps CBR",
    compression: "Lossy (MPEG-1 Layer III)",
    useCase: "Music mastering preview, high-fidelity portable playback",
  },
  "mp3-192": {
    id: "mp3-192",
    label: "MP3 · 192 kbps",
    shortLabel: "MP3 192k",
    extension: "mp3",
    mimeType: "audio/mpeg",
    bitrateLabel: "192 kbps CBR",
    compression: "Lossy (MPEG-1 Layer III)",
    useCase: "Podcasts, spoken-word interviews, compact voice distribution",
  },
  "mp3-128": {
    id: "mp3-128",
    label: "MP3 · 128 kbps",
    shortLabel: "MP3 128k",
    extension: "mp3",
    mimeType: "audio/mpeg",
    bitrateLabel: "128 kbps CBR",
    compression: "Lossy (MPEG-1 Layer III)",
    useCase: "Voice memos, lecture notes, lightweight web embedding",
  },
  "wav-24": {
    id: "wav-24",
    label: "WAV · 24-bit PCM",
    shortLabel: "WAV 24-bit",
    extension: "wav",
    mimeType: "audio/wav",
    bitrateLabel: "2,304 kbps (48kHz)",
    compression: "Uncompressed Lossless",
    useCase: "DAW editing, film post-production, archival stems",
  },
  "wav-16": {
    id: "wav-16",
    label: "WAV · 16-bit PCM",
    shortLabel: "WAV 16-bit",
    extension: "wav",
    mimeType: "audio/wav",
    bitrateLabel: "1,411 kbps (44.1kHz)",
    compression: "Uncompressed Lossless",
    useCase: "CD-standard audio, broadcast delivery, clean voice stems",
  },
};
