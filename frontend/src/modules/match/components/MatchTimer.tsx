"use client";

import { ErrorNote, formatDuration, Loading, SPORT_LABEL } from "@/modules/payments";
import { FocusShell, focusStyles } from "@/components/feed";
import type { MatchStatus } from "../types";
import { useLiveMatch } from "../useLiveMatch";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "Belum mulai",
  running: "Berjalan",
  paused: "Dijeda",
  finished: "Selesai",
  cancelled: "Dibatalkan",
};
const PAUSE_LABEL = {
  manual: "Jeda",
  timeout: "Jeda taktis",
  hydration: "Istirahat minum",
} as const;

/** Tampilan timer langsung untuk semua pengguna (hanya baca). */
export function MatchTimer({ id }: { id: string }) {
  const { match, seconds, error, loading } = useLiveMatch(id);
  if (loading)
    return (
      <FocusShell title="Pertandingan" exitHref="/open-play" status="Memuat">
        <Loading />
      </FocusShell>
    );
  if (!match)
    return (
      <FocusShell title="Pertandingan" exitHref="/open-play" status="Tidak tersedia">
        <ErrorNote message={error} />
      </FocusShell>
    );
  const status = match.status === "running" ? "Live" : STATUS_LABEL[match.status];
  return (
    <FocusShell title="Pertandingan" exitHref="/open-play" status={status}>
      <ErrorNote message={error} />
      <MatchPanel match={match} seconds={seconds} />
    </FocusShell>
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
    <section className={focusStyles.matchCard}>
      <div className={focusStyles.muted}>
        {SPORT_LABEL[match.sport]} · {STATUS_LABEL[match.status]}
        {match.status === "paused" && match.pauseReason
          ? ` (${PAUSE_LABEL[match.pauseReason]})`
          : ""}
      </div>
      <div className={focusStyles.matchClock} aria-live="off">
        {formatDuration(seconds)}
      </div>
      <div className={focusStyles.muted}>
        Durasi pertandingan {match.settings.durationMinutes} menit
        {seconds > total && match.status !== "finished" ? " · melewati waktu" : ""}
      </div>
      <div>
        Jeda taktis tersisa {match.timeoutsLeft} · Istirahat minum tersisa {match.hydrationLeft}
      </div>
    </section>
  );
}
