"use client"

import React, { useRef } from 'react';
import { Plus, Video } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelect: (files: File[]) => void;
}

export function UploadZone({ onFilesSelect }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelect(files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className="group relative h-48 md:h-56 w-full rounded-[2.5rem] bg-white border-2 border-dashed border-slate-200 hover:border-primary/40 hover:bg-slate-50 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-3"
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="video/*"
        onChange={handleFileChange}
      />
      
      <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-white primary-glow group-hover:scale-105 group-active:scale-95 transition-all duration-300">
        <Video className="w-8 h-8" />
      </div>

      <div className="text-center space-y-1">
        <p className="font-bold text-lg text-slate-900 tracking-tight">Add Video Files</p>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black opacity-80">Select files to extract high-fidelity audio</p>
      </div>

      <div className="absolute top-4 right-4 h-8 w-8 rounded-full border border-slate-100 flex items-center justify-center bg-white shadow-sm">
        <Plus className="w-4 h-4 text-primary" />
      </div>
    </div>
  );
}