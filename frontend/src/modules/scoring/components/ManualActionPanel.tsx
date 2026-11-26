"use client";

import { useState } from "react";
import { ErrorNote, useAction } from "@/modules/payments";
import type { Sport } from "@/modules/venues";
import { scoringApi } from "../api";
import type { AddEventBody, Scoreboard, Team } from "../types";

/**
 * Label aksi yang tidak bisa dideteksi AI (jenis tembakan, tendangan, pukulan). Hanya label untuk
 * statistik; poin dan validasinya dihitung backend. TODO(decision): daftar final per cabang.
 */
const ACTIONS: Record<Sport, string[]> = {
  basketball: ["layup", "jump shot", "dunk", "free throw"],
  futsal: ["tendangan kaki kanan", "tendangan kaki kiri", "sundulan", "penalti"],
  badminton: ["smash", "lob", "drop shot", "drive", "netting"],
  tennis: ["ace", "forehand", "backhand", "volley", "smash"],
  padel: ["bandeja", "vibora", "volley", "smash", "lob"],
};

interface Props {
  matchId: string;
  sport: Sport;
  team: Team;
  scorerId: string | null;
  onScored: (board: Scoreboard) => void;
}

/** Input skor manual Coach. Selalu tersedia, termasuk saat kamera terputus. */
export function ManualActionPanel({ matchId, sport, team, scorerId, onScored }: Props) {
  const [action, setAction] = useState("");
  const run = useAction();

  async function send(body: Omit<AddEventBody, "team" | "scorerId" | "action">) {
    const board = await run.run(() =>
      scoringApi.addScoreEvent(matchId, {
        ...body,
        team,
        ...(scorerId ? { scorerId } : {}),
        ...(action ? { action } : {}),
      }),
    );
    if (board) {
      onScored(board);
      setAction("");
    }
  }

  const teamLabel = team === "home" ? "Home" : "Away";
  return (
    <fieldset disabled={run.busy}>
      <legend>Input skor ({teamLabel})</legend>
      <label>
        Jenis aksi{" "}
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">(tidak dicatat)</option>
          {ACTIONS[sport].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {sport === "basketball" &&
          ([1, 2, 3] as const).map((p) => (
            <button key={p} type="button" onClick={() => send({ kind: "basket_made", points: p })}>
              +{p} poin
            </button>
          ))}
        {sport === "futsal" && (
          <button type="button" onClick={() => send({ kind: "goal" })}>
            Gol
          </button>
        )}
        {(sport === "badminton" || sport === "tennis" || sport === "padel") && (
          <button type="button" onClick={() => send({ kind: "point" })}>
            Poin rally
          </button>
        )}
      </div>
      <ErrorNote message={run.error} />
    </fieldset>
  );
}
