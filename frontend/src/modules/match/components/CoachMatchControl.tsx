"use client";

import { ErrorNote, Loading, useAction } from "@/modules/payments";
import { FocusShell } from "@/components/feed";
import { matchApi } from "../api";
import type { MatchView } from "../types";
import { useLiveMatch } from "../useLiveMatch";
import { CoachScoringPanel } from "./CoachScoringPanel";
import { MatchPanel } from "./MatchTimer";
import { MatchSettingsForm } from "./MatchSettingsForm";

type Control = "start" | "pause" | "resume" | "finish" | "timeout" | "hydration";

export function CoachMatchControl({ id }: { id: string }) {
  const { match, seconds, error, loading, apply } = useLiveMatch(id);
  const action = useAction();

  if (loading)
    return (
      <FocusShell title="Kontrol pertandingan" exitHref="/open-play" status="Memuat">
        <Loading />
      </FocusShell>
    );
  if (!match)
    return (
      <FocusShell title="Kontrol pertandingan" exitHref="/open-play" status="Tidak tersedia">
        <ErrorNote message={error} />
      </FocusShell>
    );

  async function send(kind: Control) {
    const next = await action.run(() => matchApi[kind](id));
    if (next) apply(next);
  }
  const btn = (kind: Control, label: string, enabled: boolean) => (
    <button key={kind} type="button" disabled={!enabled || action.busy} onClick={() => send(kind)}>
      {label}
    </button>
  );
  const s = match.status;
  const status =
    s === "running"
      ? "Live"
      : s === "scheduled"
        ? "Belum mulai"
        : s === "paused"
          ? "Dijeda"
          : s === "finished"
            ? "Selesai"
            : "Dibatalkan";

  return (
    <FocusShell
      title="Kontrol pertandingan"
      exitHref="/open-play"
      status={status}
      actions={
        <>
          {btn("start", "Mulai", s === "scheduled")}
          {btn("pause", "Jeda", s === "running")}
          {btn("resume", "Lanjutkan", s === "paused")}
          {btn("timeout", "Jeda taktis", s === "running" && match.timeoutsLeft > 0)}
          {btn("hydration", "Istirahat minum", s === "running" && match.hydrationLeft > 0)}
          {btn("finish", "Akhiri", s === "running" || s === "paused")}
        </>
      }
    >
      <ErrorNote message={error} />
      <MatchPanel match={match} seconds={seconds} />
      <ErrorNote message={action.error} />
      <CoachScoringPanel match={match} />
      {s === "scheduled" && (
        <MatchSettingsForm match={match} onSaved={(m: MatchView) => apply(m)} />
      )}
    </FocusShell>
  );
}
