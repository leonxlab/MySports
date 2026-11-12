"use client";

import { useState } from "react";
import { ErrorNote, useAction } from "@/modules/payments";
import { scoringApi } from "../api";
import type { Scoreboard, ScoreEventView, Team } from "../types";

const KIND_LABEL: Record<ScoreEventView["kind"], string> = {
  basket_made: "Bola masuk ring",
  goal: "Gol",
  point: "Bola/kok mendarat",
};

function Suggestion({ event, onChange }: { event: ScoreEventView; onChange: (b: Scoreboard) => void }) {
  const [team, setTeam] = useState<Team | null>(event.team);
  const [points, setPoints] = useState<2 | 3 | null>(event.pointsConfirmed ? (event.points as 2 | 3) : null);
  const run = useAction();
  const needsPoints = event.kind === "basket_made";
  const ready = team !== null && (!needsPoints || points !== null);

  async function confirm() {
    if (!team) return;
    const board = await run.run(() =>
      scoringApi.reviewScoreEvent(event.id, { action: "confirm", team, ...(needsPoints && points ? { points } : {}) }),
    );
    if (board) onChange(board);
  }
  async function reject() {
    const board = await run.run(() => scoringApi.voidScoreEvent(event.id));
    if (board) onChange(board);
  }

  return (
    <li style={{ border: "1px solid #8884", borderRadius: 8, padding: 8, marginBottom: 8 }}>
      <fieldset disabled={run.busy} style={{ border: "none", padding: 0 }}>
        <legend>
          {KIND_LABEL[event.kind]}
          {event.confidence !== null && ` (keyakinan AI ${Math.round(event.confidence * 100)}%)`}
        </legend>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(["home", "away"] as const).map((t) => (
            <button key={t} type="button" aria-pressed={team === t} onClick={() => setTeam(t)}>
              {t === "home" ? "Home" : "Away"}
            </button>
          ))}
          {needsPoints &&
            ([2, 3] as const).map((p) => (
              <button key={p} type="button" aria-pressed={points === p} onClick={() => setPoints(p)}>
                {p} poin
              </button>
            ))}
          <button type="button" disabled={!ready} onClick={confirm}>
            Konfirmasi
          </button>
          <button type="button" onClick={reject}>
            Tolak
          </button>
        </div>
        <ErrorNote message={run.error} />
      </fieldset>
    </li>
  );
}

/**
 * Antrean usulan AI untuk Coach: konfirmasi (pilih tim dan, untuk basket, 2 atau 3 poin) atau tolak.
 * Dipasang di halaman control menu match (milik modul match).
 */
export function SuggestionQueue({ suggestions, onChange }: { suggestions: ScoreEventView[]; onChange: (b: Scoreboard) => void }) {
  if (suggestions.length === 0) return <p>Tidak ada usulan AI yang menunggu.</p>;
  return (
    <section aria-label="Usulan AI">
      <h2>Usulan AI ({suggestions.length})</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {suggestions.map((s) => (
          <Suggestion key={s.id} event={s} onChange={onChange} />
        ))}
      </ul>
    </section>
  );
}
