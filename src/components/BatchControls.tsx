
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ConversionFormat } from '@/lib/converter';
import { Play, RotateCcw } from 'lucide-react';

interface BatchControlsProps {
  format: ConversionFormat;
  onFormatChange: (format: ConversionFormat) => void;
  onProcessAll: () => void;
  onReset: () => void;
  count: number;
}

export function BatchControls({ format, onFormatChange, onProcessAll, onReset, count }: BatchControlsProps) {
  return (
    <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="px-1">
        <Select value={format} onValueChange={(v) => onFormatChange(v as ConversionFormat)}>
          <SelectTrigger className="border-none bg-slate-50 hover:bg-slate-100 rounded-xl h-10 w-20 md:w-24 font-bold focus:ring-0 text-slate-600 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 rounded-xl overflow-hidden shadow-xl">
            <SelectItem value="mp3" className="font-bold py-3">MP3</SelectItem>
            <SelectItem value="wav" className="font-bold py-3">WAV</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-6 w-[1px] bg-slate-100 mx-1" />

      <Button 
        variant="ghost" 
        size="icon"
        className="rounded-xl h-10 w-10 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
        onClick={onReset}
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      <Button 
        className="rounded-xl h-10 px-5 md:px-8 font-bold text-xs bg-primary text-white hover:bg-primary/90 shadow-[0_8px_16px_-4px_rgba(37,99,235,0.25)] transition-all active:scale-95"
        onClick={onProcessAll}
      >
        <Play className="w-3.5 h-3.5 mr-2 fill-current hidden md:inline" />
        Start Extraction
      </Button>
    </div>
  );
}
