"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/modules/payments";
import { devicesApi } from "./api";
import type { DevicesLiveMessage, SessionView } from "./types";

const POLL_MS = 10_000;

/** Status sesi dan device. WebSocket utama, polling sebagai cadangan. */
export function useSessionLive(id: string | null) {
  const [session, setSession] = useState<SessionView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setSession(await devicesApi.getSession(id));
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let socket: WebSocket | null = null;
    let closed = false;
    void refresh();
    const poll = window.setInterval(() => void refresh(), POLL_MS);
    void devicesApi.liveUrl(id).then((url) => {
      if (closed) return;
      try {
        socket = new WebSocket(url);
        socket.onmessage = (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as DevicesLiveMessage;
            // Siaran tidak membawa kode pairing; pertahankan kode dari respons HTTP.
            if (msg.type === "session") setSession((prev) => ({ ...msg.session, code: prev?.code ?? null }));
          } catch {
            /* abaikan */
          }
        };
      } catch {
        /* polling tetap jalan */
      }
    });
    return () => {
      closed = true;
      window.clearInterval(poll);
      socket?.close();
    };
  }, [id, refresh]);

  return { session, error, setSession, refresh };
}
