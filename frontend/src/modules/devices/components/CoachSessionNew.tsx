"use client";

import { useState } from "react";
import { ErrorNote, useAction } from "@/modules/payments";
import type { Sport } from "@/modules/venues";
import { devicesApi } from "../api";
import { useSessionLive } from "../useSessionLive";
import { DeviceList } from "./DeviceList";

const SPORTS: Sport[] = ["basketball", "futsal", "badminton", "tennis", "padel"];

/**
 * Coach membuat sesi pairing dan memantau device yang masuk.
 * TODO(integration): render kode sebagai QR. Library QR belum dipasang (lihat PR); sementara kode
 * dan tautan pairing ditampilkan besar agar bisa diketik atau dibagikan.
 */
export function CoachSessionNew({ matchId }: { matchId?: string }) {
  const [sport, setSport] = useState<Sport>("basketball");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const live = useSessionLive(sessionId);
  const action = useAction();

  async function create() {
    const s = await action.run(() => devicesApi.createSession(matchId ? { matchId } : { sport }));
    if (s) {
      live.setSession(s);
      setSessionId(s.id);
    }
  }

  const s = live.session;
  if (!s) {
    return (
      <>
        {!matchId && (
          <label>
            Cabang{" "}
            <select value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
              {SPORTS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        )}{" "}
        <button type="button" disabled={action.busy} onClick={create}>
          Buat sesi
        </button>
        <ErrorNote message={action.error} />
      </>
    );
  }

  const pairUrl = s.code && typeof window !== "undefined" ? `${window.location.origin}/device/pair?code=${s.code}` : null;
  return (
    <>
      {s.code && (
        <section aria-label="Kode sesi" style={{ textAlign: "center", margin: "16px 0" }}>
          <p>Masukkan kode ini di HP kamera:</p>
          <p style={{ fontSize: 40, fontWeight: 700, letterSpacing: 8 }}>{s.code}</p>
          {pairUrl && <p style={{ wordBreak: "break-all" }}>{pairUrl}</p>}
          <p>Berlaku sampai {new Date(s.expiresAt).toLocaleTimeString()}</p>
        </section>
      )}
      <p>Persetujuan pemain: {s.consentAt ? `dicatat ${new Date(s.consentAt).toLocaleTimeString()}` : "belum"}</p>
      <p>Kalibrasi: {s.calibrated ? "sudah" : "belum"}</p>
      <DeviceList devices={s.devices} />
      <ErrorNote message={live.error} />
    </>
  );
}
