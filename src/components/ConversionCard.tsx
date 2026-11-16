"use client";

import React, { useEffect, useState } from "react";
import {
  Save,
  Sliders,
  X,
  RotateCcw,
  Loader2,
  AlertCircle,
  HardDrive,
  Share2,
} from "lucide-react";
import { FORMAT_SPECS, OutputFormat, TrackItem } from "@/lib/types";
import { formatBytes, formatClock } from "@/lib/format";
import { WaveformPlayer } from "./WaveformPlayer";

interface ConversionCardProps {
  track: TrackItem;
  displayName: string;
  onConvert: (id: string) => void;
  onSavedNotice: (filename: string) => void;
  onOpenEnhance: (track: TrackItem) => void;
  onRemove: (id: string) => void;
  onChangeTrackFormat: (id: string, format: OutputFormat) => void;
}

const FORMAT_OPTIONS: OutputFormat[] = [
  "mp3-320",
  "mp3-192",
  "mp3-128",
  "wav-24",
  "wav-16",
];

export function ConversionCard({
  track,
  displayName,
  onConvert,
  onSavedNotice,
  onOpenEnhance,
  onRemove,
  onChangeTrackFormat,
}: ConversionCardProps) {
  const spec = FORMAT_SPECS[track.options.format];
  const isBusy = track.status === "decoding" || track.status === "encoding";
  const canReconvert = Boolean(track.sourceFile || track.outputBlob);

  const [downloadUrl, setDownloadUrl] = useState<string>("");
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (!track.outputBlob) {
      setDownloadUrl("");
      return;
    }
    const downloadBlob = new Blob([track.outputBlob], {
      type: track.outputBlob.type || spec.mimeType,
    });
    const url = URL.createObjectURL(downloadBlob);
    setDownloadUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [track.outputBlob, spec.mimeType]);

  useEffect(() => {
    if (!track.outputBlob) {
      setCanNativeShare(false);
      return;
    }
    try {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.canShare === "function"
      ) {
        const testFile = new File([track.outputBlob], displayName, {
          type: track.outputBlob.type || spec.mimeType,
        });
        setCanNativeShare(navigator.canShare({ files: [testFile] }));
      }
    } catch {
      setCanNativeShare(false);
    }
  }, [track.outputBlob, displayName, spec.mimeType]);

  const handleNativeShare = async () => {
    if (!track.outputBlob) return;
    try {
      const file = new File([track.outputBlob], displayName, {
        type: track.outputBlob.type || spec.mimeType,
      });
      await navigator.share({
        files: [file],
        title: displayName,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  return (
    <article className="bg-white/95 backdrop-blur-sm border border-indigo-200/75 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Track Info */}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold text-slate-900 truncate">
            {track.status === "ready" ? displayName : track.originalName}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 mt-0.5">
            <span className="font-mono tabular-nums text-indigo-700 font-semibold">
              {track.sourceExt} → {spec.shortLabel}
            </span>
            {track.analysis && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="font-mono tabular-nums">
                  {formatClock(track.analysis.durationSec)}
                </span>
              </>
            )}
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono tabular-nums">
              {track.convertedSize
                ? formatBytes(track.convertedSize)
                : formatBytes(track.originalSize)}
            </span>
            {track.status === "ready" && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <HardDrive className="w-3 h-3" aria-hidden="true" />
                  Stored Locally
                </span>
              </>
            )}
            {isBusy && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-amber-700 font-medium font-mono tabular-nums">
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                  {track.progress}%
                </span>
              </>
            )}
            {track.status === "error" && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                  <AlertCircle className="w-3 h-3" aria-hidden="true" />
                  Failed
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canReconvert && !isBusy && (
            <select
              aria-label={`Format for ${track.originalName}`}
              value={track.options.format}
              onChange={(e) =>
                onChangeTrackFormat(track.id, e.target.value as OutputFormat)
              }
              className="h-8 px-2 text-xs font-medium text-slate-700 bg-indigo-50/70 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {FORMAT_SPECS[opt].shortLabel}
                </option>
              ))}
            </select>
          )}

          {track.status === "error" && (
            <button
              type="button"
              onClick={() => onConvert(track.id)}
              className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
          )}

          {track.status === "ready" && track.outputBlob && downloadUrl && (
            <>
              <button
                type="button"
                onClick={() => onOpenEnhance(track)}
                title="Master EQ or Transcribe Audio"
                className="inline-flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                Enhance
              </button>

              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  title="Save via device Share / Files menu"
                  className="inline-flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium text-cyan-800 bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Files
                </button>
              )}

              <a
                href={downloadUrl}
                download={displayName}
                onClick={() => onSavedNotice(displayName)}
                className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                Save File
              </a>
            </>
          )}

          <button
            type="button"
            onClick={() => onRemove(track.id)}
            disabled={isBusy}
            aria-label={`Remove ${track.originalName}`}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0 disabled:opacity-40"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isBusy && (
        <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 transition-all duration-150"
            style={{ width: `${Math.max(6, track.progress)}%` }}
          />
        </div>
      )}

      {track.status === "error" && track.errorMessage && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {track.errorMessage}
        </p>
      )}

      {track.status === "ready" && track.outputBlob && track.analysis && (
        <WaveformPlayer
          blob={track.outputBlob}
          peaks={track.analysis.waveformPeaks}
          durationSec={track.analysis.durationSec}
        />
      )}
    </article>
  );
}
