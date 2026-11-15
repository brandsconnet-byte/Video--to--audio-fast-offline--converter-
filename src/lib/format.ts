import { OutputFormat, FORMAT_SPECS } from "./types";

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, idx);
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return "00:00.0";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
}

export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "MEDIA";
  return parts[parts.length - 1].toUpperCase();
}

export function sanitizeFilenamePart(part: string): string {
  return part.replace(/[\\/:*?"<>|]/g, "").trimStart();
}

export function buildOutputFilename(
  originalName: string,
  format: OutputFormat,
  prefix = "",
  suffix = ""
): string {
  const spec = FORMAT_SPECS[format];
  const lastDot = originalName.lastIndexOf(".");
  const base = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
  const cleanPrefix = sanitizeFilenamePart(prefix);
  const cleanSuffix = sanitizeFilenamePart(suffix);
  return `${cleanPrefix}${base}${cleanSuffix}.${spec.extension}`;
}
