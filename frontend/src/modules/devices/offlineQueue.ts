"use client";

/**
 * Antrean segmen di device (IndexedDB). Segmen ditahan sementara saat jaringan putus, dikirim
 * berurutan saat tersambung, lalu DIHAPUS dari device. Video tidak disimpan permanen di HP.
 * TODO(decision): batas antrean (menit atau MB), pertanyaan terbuka #4. Sementara: MAX_QUEUED_BYTES.
 */
export const MAX_QUEUED_BYTES = 1024 * 1024 * 1024; // 1 GB, asumsi sementara

export interface QueuedSegment {
  key: string; // `${sessionId}:${seq}`
  sessionId: string;
  seq: number;
  blob: Blob;
  mimeType: "video/webm" | "video/mp4";
  startOffsetMs: number;
  durationMs: number;
}

const DB = "openplay-camera";
const STORE = "segments";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "key" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const offlineQueue = {
  async put(segment: QueuedSegment) {
    const used = (await this.list(segment.sessionId)).reduce((sum, s) => sum + s.blob.size, 0);
    if (used + segment.blob.size > MAX_QUEUED_BYTES) throw new Error("QUEUE_FULL");
    await tx("readwrite", (s) => s.put(segment));
  },
  /** Segmen satu sesi, urut menurut seq (dikirim berurutan). */
  async list(sessionId: string): Promise<QueuedSegment[]> {
    const all = await tx<QueuedSegment[]>("readonly", (s) => s.getAll() as IDBRequest<QueuedSegment[]>);
    return all.filter((x) => x.sessionId === sessionId).sort((a, b) => a.seq - b.seq);
  },
  async remove(key: string) {
    await tx("readwrite", (s) => s.delete(key));
  },
};
