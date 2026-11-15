"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { formatClock } from "@/lib/format";

interface WaveformPlayerProps {
  blob: Blob;
  peaks: number[];
  durationSec: number;
}

export function WaveformPlayer({
  blob,
  peaks,
  durationSec,
}: WaveformPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [audioUrl, setAudioUrl] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [resolvedDuration, setResolvedDuration] = useState(durationSec);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setResolvedDuration(durationSec);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob, durationSec]);

  const drawWaveform = useCallback(
    (progressRatio: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor(rect.height * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const grad = ctx.createLinearGradient(0, 0, rect.width, 0);
      grad.addColorStop(0, "#0284C7");
      grad.addColorStop(0.5, "#6366F1");
      grad.addColorStop(1, "#EC4899");

      const bars = peaks.length > 0 ? peaks : Array(72).fill(0.25);
      const count = bars.length;
      const slotWidth = rect.width / count;
      const barWidth = Math.max(2, slotWidth * 0.62);
      const midY = rect.height / 2;

      for (let i = 0; i < count; i++) {
        const amp = Math.max(0.12, Math.min(1, bars[i]));
        const barHeight = amp * (rect.height - 4);
        const x = i * slotWidth + (slotWidth - barWidth) / 2;
        const y = midY - barHeight / 2;
        const barProgress = (i + 0.5) / count;

        ctx.fillStyle = barProgress <= progressRatio ? grad : "#CBD5E1";
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1.5);
        ctx.fill();
      }

      ctx.restore();
    },
    [peaks]
  );

  useEffect(() => {
    const ratio =
      resolvedDuration > 0 ? Math.min(1, currentTime / resolvedDuration) : 0;
    drawWaveform(ratio);
  }, [currentTime, resolvedDuration, drawWaveform]);

  useEffect(() => {
    const handleResize = () => {
      const ratio =
        resolvedDuration > 0 ? Math.min(1, currentTime / resolvedDuration) : 0;
      drawWaveform(ratio);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [currentTime, resolvedDuration, drawWaveform]);

  useEffect(() => {
    const tick = () => {
      const el = audioRef.current;
      if (el && !el.paused) {
        setCurrentTime(el.currentTime);
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const el = audioRef.current;
    if (!canvas || !el || resolvedDuration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickRatio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const targetTime = clickRatio * resolvedDuration;
    el.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  return (
    <div className="flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-200/70 rounded-xl px-2.5 py-2">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setResolvedDuration(d);
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}

      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 flex items-center justify-center text-white shrink-0 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
        ) : (
          <Play
            className="w-3.5 h-3.5 fill-current ml-0.5"
            aria-hidden="true"
          />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="w-full h-8 cursor-pointer block"
          aria-label="Audio waveform scrubber"
        />
      </div>

      <span className="font-mono text-[11px] tabular-nums text-slate-600 whitespace-nowrap shrink-0">
        {formatClock(currentTime)} / {formatClock(resolvedDuration)}
      </span>
    </div>
  );
}
