"use client";

import React from "react";
import { Plus, AudioWaveform } from "lucide-react";
import { PWAInstallButton } from "./PWAControls";

interface TopNavProps {
  onAddFilesClick: () => void;
}

export function TopNav({ onAddFilesClick }: TopNavProps) {
  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-indigo-200/60">
      <div className="max-w-3xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 via-indigo-600 to-fuchsia-600 flex items-center justify-center shadow-sm">
            <AudioWaveform className="w-4 h-4 text-white" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-slate-900">
            AudioSync
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onAddFilesClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Upload Video
          </button>
        </div>
      </div>
    </header>
  );
}
