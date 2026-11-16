"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Sliders,
  FileText,
  Sparkles,
  RotateCcw,
  Check,
  Copy,
  Save,
  Loader2,
} from "lucide-react";
import {
  DEFAULT_MASTERING,
  MasteringAdvice,
  MasteringSettings,
  TrackItem,
} from "@/lib/types";
import { encodeForTranscription, saveAudioToDevice } from "@/lib/converter";

interface EnhanceDialogProps {
  track: TrackItem | null;
  onClose: () => void;
  onApplyMastering: (
    trackId: string,
    settings: MasteringSettings,
    advice?: MasteringAdvice
  ) => Promise<void>;
  onSaveTranscript: (trackId: string, transcript: string) => void;
}

type ActiveTab = "mastering" | "transcription";
type TargetProfile = "podcast" | "music" | "dialogue" | "ambient";

const PROFILE_OPTIONS: { id: TargetProfile; label: string }[] = [
  { id: "podcast", label: "Podcast Voice" },
  { id: "music", label: "Music Master" },
  { id: "dialogue", label: "Broadcast Dialogue" },
  { id: "ambient", label: "Clean Natural" },
];

export function EnhanceDialog({
  track,
  onClose,
  onApplyMastering,
  onSaveTranscript,
}: EnhanceDialogProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("mastering");
  const [targetProfile, setTargetProfile] = useState<TargetProfile>("music");
  const [notes, setNotes] = useState("");
  const [settings, setSettings] = useState<MasteringSettings>(DEFAULT_MASTERING);
  const [advice, setAdvice] = useState<MasteringAdvice | undefined>(undefined);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!track) return;
    setSettings({
      ...track.options.mastering,
      enabled: true,
    });
    setAdvice(track.masteringAdvice);
    setTranscript(track.transcript ?? "");
    setErrorMsg(null);
    setCopied(false);
  }, [track]);

  useEffect(() => {
    if (!track) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [track, onClose]);

  if (!track) return null;

  const analysis = track.analysis;

  const handleAnalyzeWithGemini = async () => {
    if (!analysis) return;
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gemini/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: track.originalName,
          targetProfile,
          analysis,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze audio telemetry.");
      }
      const received = data as MasteringAdvice;
      setAdvice(received);
      setSettings(received.settings);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "AI Mastering requires an active internet connection. You can still adjust EQ & Compressor sliders offline."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    setErrorMsg(null);
    try {
      await onApplyMastering(track.id, { ...settings, enabled: true }, advice);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to re-encode audio."
      );
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetFlat = () => {
    setSettings({ ...DEFAULT_MASTERING, enabled: false });
    setAdvice(undefined);
  };

  const handleTranscribe = async () => {
    if (!track.outputBlob) return;
    setIsTranscribing(true);
    setErrorMsg(null);
    try {
      const { base64, mimeType } = await encodeForTranscription(track.outputBlob);
      const res = await fetch("/api/gemini/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64Audio: base64,
          mimeType,
          filename: track.originalName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Audio transcription failed.");
      }
      const text = (data.transcript as string) || "";
      setTranscript(text);
      onSaveTranscript(track.id, text);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Transcription requires an internet connection."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopyTranscript = async () => {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSaveTranscript = async () => {
    if (!transcript) return;
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const base = track.outputName.replace(/\.[^.]+$/, "");
    await saveAudioToDevice(blob, `${base}_transcript.txt`).catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enhance-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-indigo-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto text-slate-900">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-indigo-100 flex items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/70 via-white to-cyan-50/70">
          <div className="min-w-0">
            <h2
              id="enhance-dialog-title"
              className="font-display text-base font-semibold text-slate-900 truncate"
            >
              {track.outputName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Offline Web Audio DSP mastering and speech transcription
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close mastering workbench"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Segmented Tab Bar */}
        <div className="px-6 pt-4">
          <div className="inline-flex items-center p-1 bg-indigo-50 border border-indigo-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setActiveTab("mastering");
                setErrorMsg(null);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "mastering"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
              DSP Mastering
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("transcription");
                setErrorMsg(null);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "transcription"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              AI Transcription
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3.5 py-2.5">
              {errorMsg}
            </div>
          )}

          {activeTab === "mastering" && (
            <>
              {analysis && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/60 border border-indigo-200/70 rounded-xl p-3.5">
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">
                      Peak Level
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-cyan-700 mt-0.5">
                      {analysis.peakDb} dBFS
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">
                      RMS Loudness
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-indigo-700 mt-0.5">
                      {analysis.rmsDb} dBFS
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">
                      Crest Factor
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-amber-700 mt-0.5">
                      {analysis.crestFactorDb} dB
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-500">
                      L / M / H Balance
                    </div>
                    <div className="font-mono text-xs font-semibold tabular-nums text-emerald-700 mt-1">
                      {Math.round(analysis.lowBandRatio * 100)} /{" "}
                      {Math.round(analysis.midBandRatio * 100)} /{" "}
                      {Math.round(analysis.highBandRatio * 100)}%
                    </div>
                  </div>
                </div>
              )}

              {/* Gemini AI Mastering Advisor */}
              <div className="border border-indigo-200/80 bg-slate-50/70 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      AI Mastering Advisor
                    </h3>
                    <p className="text-xs text-slate-500">
                      Auto-tune EQ &amp; compression from measured audio telemetry
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAnalyzeWithGemini}
                    disabled={isAnalyzing || !analysis}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-lg transition-all whitespace-nowrap shrink-0 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {isAnalyzing ? "Analyzing..." : "Analyze with Gemini"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {PROFILE_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setTargetProfile(p.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                        targetProfile === p.id
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional note (e.g., brighten vocals, reduce rumble)"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {advice && (
                  <div className="bg-cyan-50 border border-cyan-200 rounded-lg px-3.5 py-2.5 space-y-1">
                    <div className="text-xs font-semibold text-cyan-900">
                      {advice.recommendedPresetName}
                    </div>
                    <p className="text-xs text-cyan-800 leading-relaxed">
                      {advice.rationale}
                    </p>
                  </div>
                )}
              </div>

              {/* Manual DSP Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <SliderControl
                  label="High-Pass Filter"
                  valueLabel={`${settings.highPassHz} Hz`}
                  min={20}
                  max={180}
                  step={5}
                  value={settings.highPassHz}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, highPassHz: v }))
                  }
                />
                <SliderControl
                  label="Normalize Ceiling"
                  valueLabel={`${settings.normalizePeakDb.toFixed(1)} dBFS`}
                  min={-3.0}
                  max={-0.1}
                  step={0.1}
                  value={settings.normalizePeakDb}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, normalizePeakDb: v }))
                  }
                />
                <SliderControl
                  label="Low Shelf (120 Hz)"
                  valueLabel={`${settings.lowGainDb >= 0 ? "+" : ""}${settings.lowGainDb.toFixed(1)} dB`}
                  min={-8}
                  max={8}
                  step={0.5}
                  value={settings.lowGainDb}
                  onChange={(v) => setSettings((s) => ({ ...s, lowGainDb: v }))}
                />
                <SliderControl
                  label="Mid Peak (1.5 kHz)"
                  valueLabel={`${settings.midGainDb >= 0 ? "+" : ""}${settings.midGainDb.toFixed(1)} dB`}
                  min={-8}
                  max={8}
                  step={0.5}
                  value={settings.midGainDb}
                  onChange={(v) => setSettings((s) => ({ ...s, midGainDb: v }))}
                />
                <SliderControl
                  label="High Shelf (6.0 kHz)"
                  valueLabel={`${settings.highGainDb >= 0 ? "+" : ""}${settings.highGainDb.toFixed(1)} dB`}
                  min={-8}
                  max={8}
                  step={0.5}
                  value={settings.highGainDb}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, highGainDb: v }))
                  }
                />
                <SliderControl
                  label="Compressor Threshold"
                  valueLabel={`${settings.compThresholdDb.toFixed(0)} dB`}
                  min={-36}
                  max={-4}
                  step={1}
                  value={settings.compThresholdDb}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, compThresholdDb: v }))
                  }
                />
                <SliderControl
                  label="Compressor Ratio"
                  valueLabel={`${settings.compRatio.toFixed(1)} : 1`}
                  min={1.0}
                  max={10.0}
                  step={0.2}
                  value={settings.compRatio}
                  onChange={(v) => setSettings((s) => ({ ...s, compRatio: v }))}
                />
                <SliderControl
                  label="Fade In / Out"
                  valueLabel={`${settings.fadeInSec.toFixed(2)}s / ${settings.fadeOutSec.toFixed(2)}s`}
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={settings.fadeInSec}
                  onChange={(v) =>
                    setSettings((s) => ({
                      ...s,
                      fadeInSec: v,
                      fadeOutSec: v,
                    }))
                  }
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-indigo-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetFlat}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  Reset Flat
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={isApplying}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isApplying && (
                      <Loader2
                        className="w-3.5 h-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    {isApplying ? "Rendering..." : "Apply & Save Offline"}
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "transcription" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Speech-to-Text Transcription
                  </h3>
                  <p className="text-xs text-slate-500">
                    Transcribes spoken audio via Gemini (requires connection)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded-lg transition-all whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {isTranscribing ? (
                    <Loader2
                      className="w-3.5 h-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  {isTranscribing
                    ? "Transcribing..."
                    : transcript
                    ? "Re-run Transcription"
                    : "Transcribe Audio"}
                </button>
              </div>

              {transcript ? (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-indigo-100 rounded-xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {transcript}
                  </div>
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <Check
                          className="w-3.5 h-3.5 text-emerald-600"
                          aria-hidden="true"
                        />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      {copied ? "Copied" : "Copy Text"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveTranscript}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" aria-hidden="true" />
                      Save .txt
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-indigo-200 rounded-xl py-10 px-4 text-center">
                  <p className="text-sm font-medium text-slate-700">
                    No transcript generated yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &ldquo;Transcribe Audio&rdquo; to extract spoken
                    dialogue from this file.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SliderControlProps {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function SliderControl({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
}: SliderControlProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-mono tabular-nums text-indigo-700 font-semibold">
          {valueLabel}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
    </div>
  );
}
