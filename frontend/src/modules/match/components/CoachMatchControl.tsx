"use client";

import { ErrorNote, Loading, useAction } from "@/modules/payments";
import { matchApi } from "../api";
import type { MatchView } from "../types";
import { useLiveMatch } from "../useLiveMatch";
import { MatchPanel } from "./MatchTimer";
import { MatchSettingsForm } from "./MatchSettingsForm";

type Control = "start" | "pause" | "resume" | "finish" | "timeout" | "hydration";

export function CoachMatchControl({ id }: { id: string }) {
  const { match, seconds, error, loading, apply } = useLiveMatch(id);
  const action = useAction();

  if (loading) return <Loading />;
  if (!match) return <ErrorNote message={error} />;

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

  return (
    <>
      <ErrorNote message={error} />
      <MatchPanel match={match} seconds={seconds} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {btn("start", "Mulai", s === "scheduled")}
        {btn("pause", "Pause", s === "running")}
        {btn("resume", "Lanjut", s === "paused")}
        {btn("timeout", "Time out", s === "running" && match.timeoutsLeft > 0)}
        {btn("hydration", "Hydration break", s === "running" && match.hydrationLeft > 0)}
        {btn("finish", "Selesai", s === "running" || s === "paused")}
      </div>
      <ErrorNote message={action.error} />
      {s === "scheduled" && <MatchSettingsForm match={match} onSaved={(m: MatchView) => apply(m)} />}
    </>
  );
}
