"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { matchApi } from "@/modules/match";
import { openPlayApi } from "@/modules/open-play";
import { Card, ErrorNote, Loading, useAction, useLoad } from "@/modules/payments";
import { bracketApi } from "../api";
import type { BracketMode, BracketView } from "../types";
import { BracketBoard, nameOf, type Picked } from "./BracketBoard";

export function CoachBracket({ openPlayId }: { openPlayId: string }) {
  const bracket = useLoad(async () => {
    try {
      return await bracketApi.getByOpenPlay(openPlayId);
    } catch (e) {
      if (e instanceof ApiError && e.code === "BRACKET_NOT_FOUND") return null;
      throw e;
    }
  }, [openPlayId]);
  const people = useLoad(() => openPlayApi.listParticipants(openPlayId), [openPlayId]);
  const names = useMemo(() => new Map((people.data ?? []).map((p) => [p.id, p.displayName])), [people.data]);

  const [mode, setMode] = useState<BracketMode>("doubles");
  const [courtCount, setCourtCount] = useState(1);
  const [matchMinutes, setMatchMinutes] = useState(15);
  const [breakMinutes, setBreakMinutes] = useState(2);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [createdMatches, setCreatedMatches] = useState<Record<string, string>>({});
  const { busy, error, run } = useAction();

  if (bracket.loading) return <Loading />;
  const b = bracket.data;

  async function generate() {
    const r = await run(() => bracketApi.generate({ openPlayId, mode, courtCount, matchMinutes, breakMinutes }));
    if (r) bracket.setData(r);
  }
  async function regenerate(current: BracketView) {
    if (!window.confirm("Buat ulang bracket? Susunan sekarang diganti.")) return;
    const r = await run(() => bracketApi.regenerate(current.id, { mode, courtCount, matchMinutes, breakMinutes }));
    if (r) {
      bracket.setData(r);
      setPicked(null);
    }
  }
  async function makeMatch(bracketMatchId: string) {
    const m = await run(() => matchApi.create({ bracketMatchId }));
    if (m) setCreatedMatches((prev) => ({ ...prev, [bracketMatchId]: m.id }));
  }

  // Pilih pemain pertama, lalu pemain kedua di ronde yang sama: server yang menukar dan memeriksa.
  async function pick(current: BracketView, roundId: string, playerId: string) {
    if (!picked || picked.roundId !== roundId) return setPicked({ roundId, id: playerId });
    if (picked.id === playerId) return setPicked(null);
    const r = await run(() => bracketApi.swap(current.id, { roundId, a: picked.id, b: playerId }));
    if (r) bracket.setData(r);
    setPicked(null);
  }

  return (
    <>
      <ErrorNote message={bracket.error} />
      <Card>
        <strong>{b ? "Buat ulang" : "Buat bracket"}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0" }}>
          <label>
            Mode{" "}
            <select value={mode} onChange={(e) => setMode(e.target.value as BracketMode)}>
              <option value="singles">Single</option>
              <option value="doubles">Double</option>
              <option value="team">Tim</option>
            </select>
          </label>
          <label>
            Lapangan{" "}
            <input type="number" min={1} max={50} value={courtCount} onChange={(e) => setCourtCount(Number(e.target.value))} style={{ width: 60 }} />
          </label>
          <label>
            Menit/ronde{" "}
            <input type="number" min={1} max={240} value={matchMinutes} onChange={(e) => setMatchMinutes(Number(e.target.value))} style={{ width: 70 }} />
          </label>
          <label>
            Jeda (menit){" "}
            <input type="number" min={0} max={120} value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} style={{ width: 70 }} />
          </label>
        </div>
        <button type="button" disabled={busy} onClick={() => (b ? regenerate(b) : generate())}>
          {busy ? "Memproses…" : b ? "Buat ulang" : "Buat bracket"}
        </button>
        <p style={{ opacity: 0.7, margin: "8px 0 0" }}>Susunan dihitung server dari peserta yang sudah terkonfirmasi.</p>
      </Card>
      <ErrorNote message={error} />

      {b && (
        <>
          <p role="status">
            {picked
              ? `Terpilih: ${nameOf(names, picked.id)}. Pilih pemain lain di ronde yang sama untuk menukar, atau pilih lagi untuk batal.`
              : "Koreksi manual: pilih satu pemain, lalu pilih pemain lain di ronde yang sama untuk menukar posisinya."}
          </p>
          <BracketBoard
            bracket={b}
            names={names}
            picked={picked}
            onPick={(roundId, id) => void pick(b, roundId, id)}
            renderMatchActions={(matchId) =>
              createdMatches[matchId] ? (
                <Link href={`/coach/match/${createdMatches[matchId]}`}>Buka match</Link>
              ) : (
                <button type="button" disabled={busy} onClick={() => makeMatch(matchId)}>
                  Buat match
                </button>
              )
            }
          />
        </>
      )}
    </>
  );
}
