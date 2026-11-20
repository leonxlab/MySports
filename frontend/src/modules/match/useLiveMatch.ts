"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/modules/payments";
import { matchApi } from "./api";
import type { LiveMessage, MatchView } from "./types";

interface Snapshot {
  match: MatchView;
  /** Waktu perangkat saat snapshot diterima. Dipakai menghitung selisih tanpa bergantung pada jam server. */
  receivedAt: number;
}

const POLL_MS = 15_000;

/**
 * Status match + detik berjalan. Sumber utama WebSocket; polling 15 detik sebagai cadangan
 * bila koneksi putus. Detik berjalan dihitung dari snapshot server terakhir, bukan dari jam perangkat.
 */
export function useLiveMatch(id: string) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const apply = useCallback((match: MatchView) => setSnap({ match, receivedAt: Date.now() }), []);

  const refresh = useCallback(async () => {
    try {
      apply(await matchApi.get(id));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id, apply]);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => void refresh(), POLL_MS);
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(matchApi.liveUrl(id));
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as LiveMessage;
          if (msg.type === "match" && msg.match.id === id) apply(msg.match);
        } catch {
          /* pesan tidak dikenal diabaikan */
        }
      };
    } catch {
      /* tanpa WebSocket, polling tetap jalan */
    }
    return () => {
      window.clearInterval(poll);
      socket?.close();
    };
  }, [id, refresh, apply]);

  const running = snap?.match.status === "running";
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, [running]);

  const seconds = snap
    ? snap.match.elapsedSeconds + (running ? Math.max(0, Math.floor((now - snap.receivedAt) / 1000)) : 0)
    : 0;

  return { match: snap?.match ?? null, seconds, error, refresh, apply, loading: !snap && !error };
}
