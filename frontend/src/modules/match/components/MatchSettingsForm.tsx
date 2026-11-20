"use client";

import { useState } from "react";
import { Card, ErrorNote, Loading, useAction, useLoad } from "@/modules/payments";
import { matchApi } from "../api";
import type { MatchView } from "../types";

/** Edit setting sebelum match dimulai. Nilai awal dari server; angka bawaan cabang ditentukan di backend. */
export function MatchSettingsForm({ match, onSaved }: { match: MatchView; onSaved: (m: MatchView) => void }) {
  const s = match.settings;
  const [durationMinutes, setDuration] = useState(s.durationMinutes);
  const [playersPerSide, setPlayers] = useState(s.playersPerSide);
  const [timeoutCount, setTimeoutCount] = useState(s.timeout.count);
  const [timeoutSeconds, setTimeoutSeconds] = useState(s.timeout.seconds);
  const [hydrationCount, setHydrationCount] = useState(s.hydration.count);
  const [hydrationSeconds, setHydrationSeconds] = useState(s.hydration.seconds);
  const [breakMinutes, setBreak] = useState(s.breakMinutes);
  const { busy, error, run } = useAction();
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const next = await run(() =>
      matchApi.updateSettings(match.id, {
        durationMinutes,
        playersPerSide,
        breakMinutes,
        timeout: { count: timeoutCount, seconds: timeoutSeconds },
        hydration: { count: hydrationCount, seconds: hydrationSeconds },
      }),
    );
    if (next) {
      onSaved(next);
      setSaved(true);
    }
  }

  const num = (label: string, value: number, set: (n: number) => void, min = 0) => (
    <label style={{ display: "block", margin: "4px 0" }}>
      {label}{" "}
      <input type="number" min={min} value={value} onChange={(e) => set(Number(e.target.value))} style={{ width: 80 }} />
    </label>
  );

  return (
    <Card>
      <form onSubmit={submit}>
        <strong>Setting match</strong>
        {num("Durasi (menit)", durationMinutes, setDuration, 1)}
        {num("Pemain per sisi", playersPerSide, setPlayers, 1)}
        {num("Jeda antar ronde (menit)", breakMinutes, setBreak)}
        {num("Jatah time out", timeoutCount, setTimeoutCount)}
        {num("Detik per time out", timeoutSeconds, setTimeoutSeconds)}
        {num("Jatah hydration break", hydrationCount, setHydrationCount)}
        {num("Detik per hydration break", hydrationSeconds, setHydrationSeconds)}
        <button type="submit" disabled={busy}>
          Simpan setting
        </button>
        {saved && <span role="status"> Tersimpan.</span>}
        <ErrorNote message={error} />
      </form>
    </Card>
  );
}

/** Halaman setting mandiri: memuat match lalu menampilkan form (atau pesan bila sudah dimulai). */
export function MatchSettingsEditor({ id }: { id: string }) {
  const [match, setMatch] = useState<MatchView | null>(null);
  const load = useLoad(() => matchApi.get(id), [id]);
  const current = match ?? load.data;
  if (load.loading) return <Loading />;
  if (!current) return <ErrorNote message={load.error ?? "Match tidak ditemukan"} />;
  if (current.status !== "scheduled") return <p>Setting tidak bisa diubah setelah match dimulai.</p>;
  return <MatchSettingsForm match={current} onSaved={setMatch} />;
}
