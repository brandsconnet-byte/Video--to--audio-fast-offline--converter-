"use client"

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function LocalStatusBadge() {
  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none md:pointer-events-auto">
      <div className="bg-white border border-slate-200 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="relative">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-ping absolute inset-0" />
          <div className="h-2 w-2 bg-green-500 rounded-full relative" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-green-600" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">Processing Locally</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none">Privacy Guaranteed</span>
        </div>
      </div>
    </div>
  );
}