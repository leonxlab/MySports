"use client";

import { Card, ErrorNote, formatDuration, Loading, SPORT_LABEL } from "@/modules/payments";
import type { MatchStatus } from "../types";
import { useLiveMatch } from "../useLiveMatch";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "Belum mulai",
  running: "Berjalan",
  paused: "Dijeda",
  finished: "Selesai",
  cancelled: "Dibatalkan",
};
const PAUSE_LABEL = { manual: "Jeda", timeout: "Time out", hydration: "Hydration break" } as const;

/** Tampilan timer langsung untuk semua pengguna (hanya baca). */
export function MatchTimer({ id }: { id: string }) {
  const { match, seconds, error, loading } = useLiveMatch(id);
  if (loading) return <Loading />;
  if (!match) return <ErrorNote message={error} />;
  return (
    <>
      <ErrorNote message={error} />
      <MatchPanel match={match} seconds={seconds} />
    </>
  );
}

export function MatchPanel({
  match,
  seconds,
}: {
  match: NonNullable<ReturnType<typeof useLiveMatch>["match"]>;
  seconds: number;
}) {
  const total = match.settings.durationMinutes * 60;
  return (
    <Card>
      <div>
        {SPORT_LABEL[match.sport]} · {STATUS_LABEL[match.status]}
        {match.status === "paused" && match.pauseReason ? ` (${PAUSE_LABEL[match.pauseReason]})` : ""}
      </div>
      <div style={{ fontSize: 48, fontVariantNumeric: "tabular-nums" }} aria-live="off">
        {formatDuration(seconds)}
      </div>
      <div style={{ opacity: 0.7 }}>
        Durasi {match.settings.durationMinutes} menit
        {seconds > total && match.status !== "finished" ? " · melewati waktu" : ""}
      </div>
      <div>
        Time out tersisa {match.timeoutsLeft} · Hydration tersisa {match.hydrationLeft}
      </div>
    </Card>
  );
}
