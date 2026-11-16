"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { AnimatePresence, motion } from "motion/react";
import {
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Tag,
  RotateCcw,
} from "lucide-react";
import {
  DEFAULT_MASTERING,
  FORMAT_SPECS,
  MasteringAdvice,
  MasteringSettings,
  OutputFormat,
  TrackItem,
} from "@/lib/types";
import { buildOutputFilename, getExtension } from "@/lib/format";
import {
  createSampleMediaFile,
  decodeMediaFile,
  renderProcessedAudio,
} from "@/lib/converter";
import {
  clearTracksDB,
  deleteTrackFromDB,
  loadTracksFromDB,
  saveTrackToDB,
} from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { UploadZone } from "@/components/UploadZone";
import { ConversionCard } from "@/components/ConversionCard";
import { EnhanceDialog } from "@/components/EnhanceDialog";

interface Notice {
  id: string;
  type: "success" | "error";
  message: string;
}

const FORMAT_BUTTONS: {
  id: OutputFormat;
  activeClass: string;
}[] = [
  {
    id: "mp3-320",
    activeClass: "bg-violet-600 text-white shadow-sm",
  },
  {
    id: "mp3-192",
    activeClass: "bg-indigo-600 text-white shadow-sm",
  },
  {
    id: "mp3-128",
    activeClass: "bg-sky-600 text-white shadow-sm",
  },
  {
    id: "wav-24",
    activeClass: "bg-amber-600 text-white shadow-sm",
  },
  {
    id: "wav-16",
    activeClass: "bg-emerald-600 text-white shadow-sm",
  },
];

export default function AudioSyncStudioPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [format, setFormat] = useState<OutputFormat>("mp3-320");
  const [renamePrefix, setRenamePrefix] = useState("");
  const [renameSuffix, setRenameSuffix] = useState("");
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [zipUrl, setZipUrl] = useState<string>("");
  const [isBuildingZip, setIsBuildingZip] = useState(false);
  const [enhancingTrackId, setEnhancingTrackId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const showNotice = useCallback((type: "success" | "error", message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotice({ id, type, message });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    loadTracksFromDB()
      .then((saved) => {
        if (!active) return;
        setTracks(saved);
        setIsHydrated(true);
      })
      .catch(() => {
        if (active) setIsHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const getDisplayName = useCallback(
    (track: TrackItem) =>
      buildOutputFilename(
        track.originalName,
        track.options.format,
        renamePrefix,
        renameSuffix
      ),
    [renamePrefix, renameSuffix]
  );

  // Pre-build offline ZIP Blob whenever 2+ tracks are ready so Save All is 100% synchronous
  useEffect(() => {
    const readyTracks = tracks.filter(
      (t) => t.status === "ready" && t.outputBlob
    );
    if (readyTracks.length < 2) {
      setZipUrl("");
      setIsBuildingZip(false);
      return;
    }

    let cancelled = false;
    let activeObjectUrl = "";
    setIsBuildingZip(true);

    const timer = setTimeout(async () => {
      try {
        const zip = new JSZip();
        const usedNames = new Map<string, number>();

        for (const track of readyTracks) {
          if (!track.outputBlob) continue;
          let name = buildOutputFilename(
            track.originalName,
            track.options.format,
            renamePrefix,
            renameSuffix
          );
          const count = usedNames.get(name) ?? 0;
          usedNames.set(name, count + 1);
          if (count > 0) {
            const dot = name.lastIndexOf(".");
            name =
              dot > 0
                ? `${name.slice(0, dot)}_${count + 1}${name.slice(dot)}`
                : `${name}_${count + 1}`;
          }
          zip.file(name, track.outputBlob);
        }

        const rawZip = await zip.generateAsync({ type: "blob" });
        const content = new Blob([rawZip], {
          type: "application/zip",
        });
        if (cancelled) return;
        activeObjectUrl = URL.createObjectURL(content);
        setZipUrl(activeObjectUrl);
      } catch {
        if (!cancelled) setZipUrl("");
      } finally {
        if (!cancelled) setIsBuildingZip(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    };
  }, [tracks, renamePrefix, renameSuffix]);

  const updateTrack = useCallback(
    (id: string, updater: (prev: TrackItem) => TrackItem) => {
      setTracks((prev) =>
        prev.map((item) => (item.id === id ? updater(item) : item))
      );
    },
    []
  );

  const processSingleTrack = useCallback(
    async (
      trackSnapshot: TrackItem,
      overrideOptions?: TrackItem["options"],
      overrideAdvice?: MasteringAdvice
    ) => {
      const effectiveOptions = overrideOptions ?? trackSnapshot.options;
      const sourceInput: File | undefined =
        trackSnapshot.sourceFile ??
        (trackSnapshot.outputBlob
          ? new File([trackSnapshot.outputBlob], trackSnapshot.outputName, {
              type: trackSnapshot.outputBlob.type || "audio/wav",
            })
          : undefined);

      if (!sourceInput) {
        updateTrack(trackSnapshot.id, (t) => ({
          ...t,
          status: "error",
          errorMessage:
            "Source audio is no longer in memory. Please upload the file again.",
        }));
        return;
      }

      updateTrack(trackSnapshot.id, (t) => ({
        ...t,
        status: "decoding",
        progress: 12,
        errorMessage: undefined,
        options: effectiveOptions,
        outputName: buildOutputFilename(t.originalName, effectiveOptions.format),
      }));

      try {
        const audioBuffer = await decodeMediaFile(sourceInput);

        updateTrack(trackSnapshot.id, (t) => ({
          ...t,
          status: "encoding",
          progress: 30,
        }));

        const { blob, analysis } = await renderProcessedAudio(
          audioBuffer,
          effectiveOptions,
          (pct) => {
            updateTrack(trackSnapshot.id, (t) => ({
              ...t,
              status: "encoding",
              progress: pct,
            }));
          }
        );

        const nextOutputName = buildOutputFilename(
          trackSnapshot.originalName,
          effectiveOptions.format
        );

        const completedTrack: TrackItem = {
          ...trackSnapshot,
          outputName: nextOutputName,
          options: effectiveOptions,
          outputBlob: blob,
          convertedSize: blob.size,
          analysis,
          masteringAdvice: overrideAdvice ?? trackSnapshot.masteringAdvice,
          status: "ready",
          progress: 100,
          errorMessage: undefined,
        };

        await saveTrackToDB(completedTrack);
        updateTrack(trackSnapshot.id, () => completedTrack);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Audio conversion failed.";
        updateTrack(trackSnapshot.id, (t) => ({
          ...t,
          status: "error",
          progress: 0,
          errorMessage: message,
        }));
        showNotice("error", message);
      }
    },
    [updateTrack, showNotice]
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const created: TrackItem[] = files.map((file) => {
        const id =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        return {
          id,
          originalName: file.name,
          outputName: buildOutputFilename(file.name, format),
          sourceExt: getExtension(file.name),
          sourceMime: file.type || "application/octet-stream",
          originalSize: file.size,
          convertedSize: null,
          status: "decoding",
          progress: 8,
          options: {
            format,
            sampleRate: 48000,
            channels: 2,
            normalize: true,
            trimStartSec: 0,
            trimEndSec: null,
            mastering: { ...DEFAULT_MASTERING },
          },
          createdAt: Date.now(),
          sourceFile: file,
        };
      });

      setTracks((prev) => [...created, ...prev]);

      const concurrency = 3;
      for (let i = 0; i < created.length; i += concurrency) {
        await Promise.all(
          created.slice(i, i + concurrency).map((item) => processSingleTrack(item))
        );
      }

      showNotice(
        "success",
        `Extracted ${created.length} ${
          created.length === 1 ? "track" : "tracks"
        } locally.`
      );
    },
    [format, processSingleTrack, showNotice]
  );

  const handleLoadSample = useCallback(async () => {
    setIsGeneratingSample(true);
    try {
      const sampleFile = await createSampleMediaFile();
      await handleFilesSelected([sampleFile]);
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Could not generate sample clip."
      );
    } finally {
      setIsGeneratingSample(false);
    }
  }, [handleFilesSelected, showNotice]);

  const handleConvertOne = useCallback(
    async (id: string) => {
      const target = tracks.find((t) => t.id === id);
      if (!target) return;
      await processSingleTrack(target);
    },
    [tracks, processSingleTrack]
  );

  const handleChangeTrackFormat = useCallback(
    async (id: string, nextFormat: OutputFormat) => {
      const target = tracks.find((t) => t.id === id);
      if (!target) return;
      const nextOptions = { ...target.options, format: nextFormat };
      await processSingleTrack(target, nextOptions);
    },
    [tracks, processSingleTrack]
  );

  const handleApplyMastering = useCallback(
    async (
      trackId: string,
      mastering: MasteringSettings,
      advice?: MasteringAdvice
    ) => {
      const target = tracks.find((t) => t.id === trackId);
      if (!target) return;
      const nextOptions = { ...target.options, mastering };
      await processSingleTrack(target, nextOptions, advice);
      showNotice("success", `Updated ${getDisplayName(target)} locally.`);
    },
    [tracks, processSingleTrack, showNotice, getDisplayName]
  );

  const handleSaveTranscript = useCallback(
    (trackId: string, transcript: string) => {
      setTracks((prev) =>
        prev.map((item) => {
          if (item.id !== trackId) return item;
          const updated = { ...item, transcript };
          saveTrackToDB(updated).catch(() => {});
          return updated;
        })
      );
    },
    []
  );

  const handleSavedNotice = useCallback(
    (filename: string) => {
      showNotice("success", `Saving ${filename} to your device.`);
    },
    [showNotice]
  );

  const handleRemoveTrack = useCallback(async (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    await deleteTrackFromDB(id);
  }, []);

  const handleClearAll = useCallback(async () => {
    setTracks([]);
    await clearTracksDB();
  }, []);

  const readyCount = useMemo(
    () => tracks.filter((t) => t.status === "ready" && t.outputBlob).length,
    [tracks]
  );

  const enhancingTrack = useMemo(
    () => tracks.find((t) => t.id === enhancingTrackId) ?? null,
    [tracks, enhancingTrackId]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav onAddFilesClick={() => fileInputRef.current?.click()} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-7 sm:py-10 space-y-5">
        {/* Balanced Bright Colorful Headline */}
        <div className="text-center space-y-1.5">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance]">
            Video to{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 bg-clip-text text-transparent">
              Audio Converter
            </span>
          </h1>
          <p className="text-sm text-slate-600">
            Fast local extraction in seconds — save directly to your device
            with zero internet.
          </p>
        </div>

        {/* Colorful Format Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-slate-600">Output:</span>
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-white/90 border border-indigo-200/80 rounded-xl shadow-sm">
            {FORMAT_BUTTONS.map(({ id, activeClass }) => {
              const active = format === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormat(id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? activeClass
                      : "text-slate-600 hover:text-slate-900 hover:bg-indigo-50/70"
                  }`}
                >
                  {FORMAT_SPECS[id].shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dropzone */}
        <UploadZone
          onFilesSelected={handleFilesSelected}
          onLoadSample={handleLoadSample}
          isGeneratingSample={isGeneratingSample}
          fileInputRef={fileInputRef}
        />

        {/* Batch Rename + Track List */}
        {isHydrated && tracks.length > 0 && (
          <section
            aria-label="Extracted offline audio files"
            className="space-y-3 pt-1"
          >
            {/* Compact Batch Rename Bar */}
            <div className="bg-white/95 backdrop-blur-sm border border-indigo-200/75 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-2.5 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900 shrink-0">
                <Tag className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                Batch Rename
              </div>

              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={renamePrefix}
                  onChange={(e) => setRenamePrefix(e.target.value)}
                  placeholder="Prefix (e.g. Pod_)"
                  aria-label="Filename prefix for all tracks"
                  className="h-8 px-2.5 text-xs bg-indigo-50/50 border border-indigo-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={renameSuffix}
                  onChange={(e) => setRenameSuffix(e.target.value)}
                  placeholder="Suffix (e.g. _clean)"
                  aria-label="Filename suffix for all tracks"
                  className="h-8 px-2.5 text-xs bg-indigo-50/50 border border-indigo-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {(renamePrefix || renameSuffix) && (
                <button
                  type="button"
                  onClick={() => {
                    setRenamePrefix("");
                    setRenameSuffix("");
                  }}
                  className="inline-flex items-center gap-1 px-2.5 h-8 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                  Reset
                </button>
              )}
            </div>

            {/* List Header & Save All */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-indigo-900 font-mono tabular-nums">
                {tracks.length} {tracks.length === 1 ? "track" : "tracks"} stored
                locally
              </span>

              <div className="flex items-center gap-2">
                {readyCount > 1 &&
                  (zipUrl ? (
                    <a
                      href={zipUrl}
                      download="audiosync-tracks.zip"
                      onClick={() =>
                        showNotice(
                          "success",
                          `Saving ${readyCount} tracks as audiosync-tracks.zip.`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" aria-hidden="true" />
                      Save All ZIP ({readyCount})
                    </a>
                  ) : isBuildingZip ? (
                    <span className="text-xs text-slate-500">
                      Preparing ZIP...
                    </span>
                  ) : null)}

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Clear
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              <AnimatePresence initial={false}>
                {tracks.map((track) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ConversionCard
                      track={track}
                      displayName={getDisplayName(track)}
                      onConvert={handleConvertOne}
                      onSavedNotice={handleSavedNotice}
                      onOpenEnhance={(t) => setEnhancingTrackId(t.id)}
                      onRemove={handleRemoveTrack}
                      onChangeTrackFormat={handleChangeTrackFormat}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </main>

      <EnhanceDialog
        track={enhancingTrack}
        onClose={() => setEnhancingTrackId(null)}
        onApplyMastering={handleApplyMastering}
        onSaveTranscript={handleSaveTranscript}
      />

      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.15 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-50 max-w-sm bg-white border border-indigo-200 shadow-lg rounded-xl px-4 py-3 flex items-start gap-2.5"
          >
            {notice.type === "success" ? (
              <CheckCircle2
                className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="w-4 h-4 text-rose-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
            )}
            <p className="text-xs font-medium text-slate-800 leading-relaxed flex-1">
              {notice.message}
            </p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
