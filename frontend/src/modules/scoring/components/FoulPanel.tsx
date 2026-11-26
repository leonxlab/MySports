"use client";

import { useState } from "react";
import { ErrorNote, useAction } from "@/modules/payments";
import { scoringApi } from "../api";
import type { Foul, PlayerOption } from "../types";

interface Props {
  matchId: string;
  players: PlayerOption[];
  onAdded?: (foul: Foul) => void;
}

/** Catat pelanggaran pemain. Jenis pelanggaran teks bebas pendek (AI tidak mendeteksi pelanggaran). */
export function FoulPanel({ matchId, players, onAdded }: Props) {
  const [playerId, setPlayerId] = useState("");
  const [kind, setKind] = useState("");
  const run = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return;
    const foul = await run.run(() =>
      scoringApi.addFoul(matchId, { playerId, ...(kind.trim() ? { kind: kind.trim() } : {}) }),
    );
    if (foul) {
      setKind("");
      onAdded?.(foul);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={run.busy}>
        <legend>Pelanggaran</legend>
        <label>
          Pemain{" "}
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required>
            <option value="">Pilih pemain</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>{" "}
        <label>
          Jenis{" "}
          <input value={kind} maxLength={50} onChange={(e) => setKind(e.target.value)} placeholder="misal: blocking" />
        </label>{" "}
        <button type="submit">Catat</button>
        <ErrorNote message={run.error} />
      </fieldset>
    </form>
  );
}
