import { FORMAT_SPECS, TrackItem } from "./types";

const DB_NAME = "audiosync_studio_db";
const DB_VERSION = 1;
const STORE_NAME = "tracks";

export type PersistedTrack = Omit<TrackItem, "sourceFile">;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function hydrateTrackBlob(row: PersistedTrack): TrackItem {
  if (row.outputBlob) {
    const expectedMime =
      FORMAT_SPECS[row.options?.format]?.mimeType || "audio/mpeg";
    if (!(row.outputBlob instanceof Blob) || !row.outputBlob.type) {
      row.outputBlob = new Blob([row.outputBlob], { type: expectedMime });
    }
  }
  return row;
}

export async function saveTrackToDB(track: TrackItem): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const { sourceFile: _omit, ...rest } = track;
    store.put(rest);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn("IndexedDB save skipped:", err);
  }
}

export async function loadTracksFromDB(): Promise<TrackItem[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    const rows = await new Promise<PersistedTrack[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as PersistedTrack[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.map(hydrateTrackBlob).sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function loadTrackByIdFromDB(
  id: string
): Promise<TrackItem | null> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    const row = await new Promise<PersistedTrack | undefined>(
      (resolve, reject) => {
        req.onsuccess = () => resolve(req.result as PersistedTrack | undefined);
        req.onerror = () => reject(req.error);
      }
    );
    db.close();
    return row ? hydrateTrackBlob(row) : null;
  } catch {
    return null;
  }
}

export async function deleteTrackFromDB(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}

export async function clearTracksDB(): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore cleanup errors
  }
}
