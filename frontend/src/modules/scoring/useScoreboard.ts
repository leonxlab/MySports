"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/modules/payments";
import { scoringApi } from "./api";
import type { Scoreboard, ScoringLiveMessage } from "./types";

const POLL_MS = 15_000;

/**
 * Papan skor langsung. Sumber utama WebSocket kanal match (token login lewat ?token=);
 * polling 15 detik sebagai cadangan bila koneksi putus. Skor dihitung di backend, bukan di sini.
 */
export function useScoreboard(matchId: string) {
  const [board, setBoard] = useState<Scoreboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setBoard(await scoringApi.getScoreboard(matchId));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let closed = false;
    void refresh();
    const poll = window.setInterval(() => void refresh(), POLL_MS);
    void scoringApi.liveUrl(matchId).then((url) => {
      if (closed) return;
      try {
        socket = new WebSocket(url);
        socket.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as ScoringLiveMessage;
            if (msg.type === "score" && msg.scoreboard.matchId === matchId) setBoard(msg.scoreboard);
            if (msg.type === "suggestions") setBoard((b) => (b ? { ...b, suggestions: msg.suggestions } : b));
          } catch {
            /* pesan tidak dikenal diabaikan */
          }
        };
      } catch {
        /* tanpa WebSocket, polling tetap jalan */
      }
    });
    return () => {
      closed = true;
      window.clearInterval(poll);
      socket?.close();
    };
  }, [matchId, refresh]);

  return { board, error, loading, refresh, apply: setBoard };
}
