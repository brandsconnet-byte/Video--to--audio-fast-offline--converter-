import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getGeminiClient } from "@/lib/gemini";
import type { AudioAnalysis, MasteringAdvice } from "@/lib/types";

interface EnhanceRequestBody {
  filename: string;
  targetProfile: "podcast" | "music" | "dialogue" | "ambient";
  analysis: AudioAnalysis;
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EnhanceRequestBody;
    const { filename, targetProfile, analysis, notes } = body;

    if (!analysis || typeof analysis.peakDb !== "number") {
      return NextResponse.json(
        { error: "Audio acoustic analysis telemetry is required." },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    const prompt = [
      `Analyze the measured acoustic telemetry for media track "${filename}" and recommend Web Audio DSP mastering settings.`,
      `Target Mastering Profile: ${targetProfile}`,
      `Measured Telemetry:`,
      `- Duration: ${analysis.durationSec.toFixed(2)}s`,
      `- Sample Rate: ${analysis.sampleRate} Hz, Channels: ${analysis.channels}`,
      `- Peak Level: ${analysis.peakDb} dBFS`,
      `- RMS Loudness: ${analysis.rmsDb} dBFS`,
      `- Crest Factor: ${analysis.crestFactorDb} dB`,
      `- Spectral Energy Ratios -> Low (<250Hz): ${(analysis.lowBandRatio * 100).toFixed(1)}%, Mid (250Hz-3kHz): ${(analysis.midBandRatio * 100).toFixed(1)}%, High (>3kHz): ${(analysis.highBandRatio * 100).toFixed(1)}%`,
      notes ? `Engineer Notes: ${notes}` : "",
      `Bounds to obey:`,
      `- highPassHz: integer between 20 and 180`,
      `- lowGainDb, midGainDb, highGainDb: numbers between -8.0 and +8.0`,
      `- compThresholdDb: number between -32 and -6`,
      `- compRatio: number between 1.2 and 8.0`,
      `- normalizePeakDb: number between -3.0 and -0.2`,
      `- fadeInSec and fadeOutSec: numbers between 0 and 1.5`,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a senior audio mastering engineer. Provide precise, conservative, musical Web Audio DSP filter and compressor parameters tailored to the measured telemetry and target profile. Keep the rationale concise (2 sentences).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedPresetName: {
              type: Type.STRING,
              description: "Short name of the tailored mastering chain.",
            },
            rationale: {
              type: Type.STRING,
              description: "Concise 2-sentence engineering explanation grounded in the measured dBFS and spectral numbers.",
            },
            highPassHz: { type: Type.NUMBER },
            lowGainDb: { type: Type.NUMBER },
            midGainDb: { type: Type.NUMBER },
            highGainDb: { type: Type.NUMBER },
            compThresholdDb: { type: Type.NUMBER },
            compRatio: { type: Type.NUMBER },
            normalizePeakDb: { type: Type.NUMBER },
            fadeInSec: { type: Type.NUMBER },
            fadeOutSec: { type: Type.NUMBER },
          },
          required: [
            "recommendedPresetName",
            "rationale",
            "highPassHz",
            "lowGainDb",
            "midGainDb",
            "highGainDb",
            "compThresholdDb",
            "compRatio",
            "normalizePeakDb",
            "fadeInSec",
            "fadeOutSec",
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());

    const clamp = (val: unknown, min: number, max: number, fallback: number) => {
      const n = Number(val);
      if (!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, Number(n.toFixed(1))));
    };

    const advice: MasteringAdvice = {
      recommendedPresetName:
        typeof parsed.recommendedPresetName === "string" && parsed.recommendedPresetName.trim()
          ? parsed.recommendedPresetName.trim()
          : `${targetProfile.charAt(0).toUpperCase() + targetProfile.slice(1)} Master`,
      rationale:
        typeof parsed.rationale === "string" && parsed.rationale.trim()
          ? parsed.rationale.trim()
          : "Balanced EQ and dynamic leveling applied based on measured RMS and spectral balance.",
      settings: {
        enabled: true,
        highPassHz: Math.round(clamp(parsed.highPassHz, 20, 180, 60)),
        lowGainDb: clamp(parsed.lowGainDb, -8, 8, 0),
        midGainDb: clamp(parsed.midGainDb, -8, 8, 1.0),
        highGainDb: clamp(parsed.highGainDb, -8, 8, 1.5),
        compThresholdDb: clamp(parsed.compThresholdDb, -32, -6, -18),
        compRatio: clamp(parsed.compRatio, 1.2, 8, 2.8),
        normalizePeakDb: clamp(parsed.normalizePeakDb, -3.0, -0.2, -1.0),
        fadeInSec: clamp(parsed.fadeInSec, 0, 1.5, 0.05),
        fadeOutSec: clamp(parsed.fadeOutSec, 0, 1.5, 0.1),
      },
    };

    return NextResponse.json(advice);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to compute mastering recommendations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
