"use client";

import React, { useState, useCallback } from "react";
import { Upload, Disc3 } from "lucide-react";

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: () => void;
  isGeneratingSample: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const ACCEPTED_EXTENSIONS =
  "video/*,audio/*,.mp4,.mov,.webm,.mkv,.avi,.m4a,.mp3,.wav,.ogg,.flac";

export function UploadZone({
  onFilesSelected,
  onLoadSample,
  isGeneratingSample,
  fileInputRef,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0) {
        onFilesSelected(dropped);
      }
    },
    [onFilesSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.files ? Array.from(e.target.files) : [];
      if (picked.length > 0) {
        onFilesSelected(picked);
      }
      e.target.value = "";
    },
    [onFilesSelected]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-150 px-6 py-8 text-center shadow-sm ${
        isDragging
          ? "border-cyan-500 bg-cyan-50/90"
          : "border-indigo-300/80 bg-white/90 backdrop-blur-sm hover:border-violet-400 hover:bg-white"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleInputChange}
        className="sr-only"
        aria-label="Select video or audio files to convert"
      />

      <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-500 to-fuchsia-500 text-white flex items-center justify-center mb-3 shadow-sm">
        <Upload className="w-5 h-5" aria-hidden="true" />
      </div>

      <p className="font-display text-base font-semibold text-slate-900">
        Drop your video here to extract audio instantly
      </p>
      <p className="text-xs text-slate-600 mt-1">
        MP4, MOV, WebM, MKV, M4A, MP3, WAV · Extracts in seconds &amp; works
        offline
      </p>

      <div
        className="mt-5 flex flex-wrap items-center justify-center gap-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Choose Video
        </button>

        <button
          type="button"
          onClick={onLoadSample}
          disabled={isGeneratingSample}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-cyan-800 bg-cyan-50 border border-cyan-200 hover:bg-cyan-100 rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <Disc3 className="w-3.5 h-3.5 text-cyan-600" aria-hidden="true" />
          {isGeneratingSample ? "Generating..." : "Try Sample"}
        </button>
      </div>
    </div>
  );
}
