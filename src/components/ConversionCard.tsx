
"use client"

import React from 'react';
import { 
  FileAudio,
  Trash2, 
  Download,
  Play,
  Loader2,
  Sparkles,
  Music,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/converter';
import { ConversionRecord } from '@/lib/db';
import { cn } from '@/lib/utils';

interface ConversionCardProps {
  record?: ConversionRecord;
  fileName?: string;
  fileSize?: number;
  progress?: number;
  status?: string;
  isProcessing?: boolean;
  format?: string;
  onStart?: () => void;
  onRemove?: () => void;
  onDelete?: (id: string) => void;
  onEnhance?: () => void;
}

export function ConversionCard({ 
  record, 
  fileName, 
  fileSize, 
  progress = 0, 
  status = 'Ready', 
  isProcessing = false,
  format = 'MP3',
  onStart,
  onRemove,
  onDelete,
  onEnhance
}: ConversionCardProps) {
  
  const handleDownload = () => {
    if (!record) return;
    const url = URL.createObjectURL(record.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const name = record ? record.name : fileName;
  const size = record ? record.size : fileSize;
  const badgeText = record ? record.type.split('/')[1].toUpperCase() : format.toUpperCase();

  return (
    <div className={cn(
      "group relative flex items-center gap-5 p-5 rounded-[2rem] bg-white border border-slate-200/60 transition-all hover:border-slate-300/60 hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.05)]",
      isProcessing && "border-primary/20 ring-4 ring-primary/5"
    )}>
      {/* Icon Area */}
      <div className={cn(
        "h-14 w-14 rounded-2xl flex items-center justify-center relative shrink-0 transition-transform group-hover:scale-105 duration-300",
        record ? "bg-primary/5 text-primary" : "bg-slate-50 text-slate-400"
      )}>
        {isProcessing ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : record ? (
          <Music className="h-6 w-6" />
        ) : (
          <FileAudio className="h-6 w-6" />
        )}
      </div>
      
      {/* Text Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-slate-900 truncate pr-4">
          {name}
        </h4>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
            {badgeText}
          </span>
          <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            {formatBytes(size || 0)}
          </span>
          {record && (
            <div className="flex items-center gap-1.5 ml-auto text-green-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[8px] font-black uppercase tracking-[0.15em]">Ready</span>
            </div>
          )}
          {isProcessing && (
            <span className="text-[9px] font-black text-primary animate-pulse uppercase tracking-widest ml-auto">
              {status} {Math.round(progress)}%
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar Line */}
      {!record && isProcessing && (
        <div className="absolute bottom-0 left-6 right-6 h-[3px] bg-slate-50 overflow-hidden rounded-full">
          <div 
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!record ? (
          <>
            <Button 
              size="sm"
              variant={isProcessing ? "ghost" : "default"}
              onClick={onStart}
              disabled={isProcessing}
              className="rounded-xl px-5 h-10 font-bold text-xs bg-slate-900 text-white hover:bg-slate-800"
            >
              {isProcessing ? "..." : <><Play className="w-3 h-3 mr-2 fill-current" /> Extract</>}
            </Button>
            {!isProcessing && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-xl h-10 w-10 text-slate-300 hover:text-destructive hover:bg-destructive/5"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <>
            <Button 
              size="sm"
              variant="outline"
              onClick={onEnhance}
              className="hidden md:flex rounded-xl px-5 h-10 font-bold text-xs border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Polish AI
            </Button>
            <Button 
              size="sm"
              onClick={handleDownload}
              className="rounded-xl px-5 h-10 font-bold text-xs bg-primary text-white hover:bg-primary/90 shadow-[0_8px_16px_-4px_rgba(37,99,235,0.2)]"
            >
              <Download className="w-3.5 h-3.5 md:mr-2" />
              <span className="hidden md:inline">Save</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl h-10 w-10 text-slate-300 hover:text-destructive hover:bg-destructive/5"
              onClick={() => onDelete?.(record.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
