export type ConversionFormat = 'mp3' | 'wav';

export interface ProgressCallback {
  (progress: number, status: string): void;
}

/**
 * Enhanced simulation of local processing speed.
 * Reduced interval and increased increment for a "much faster" feel.
 */
export async function convertVideoToAudio(
  file: File,
  format: ConversionFormat = 'mp3',
  onProgress: ProgressCallback
): Promise<Blob> {
  return new Promise((resolve) => {
    let progress = 0;
    // Faster simulation interval
    const interval = setInterval(() => {
      // Faster progress increments
      progress += Math.random() * 15 + 10;
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Finalize
        setTimeout(() => {
          const simulatedAudioBlob = new Blob([file], { type: `audio/${format === 'mp3' ? 'mpeg' : 'wav'}` });
          onProgress(100, 'Finished');
          resolve(simulatedAudioBlob);
        }, 100);
      } else {
        onProgress(Math.min(progress, 99), 'Extracting...');
      }
    }, 80); // Faster tick
  });
}

export function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return '0 MB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Default to MB if possible for that "clean" look
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}