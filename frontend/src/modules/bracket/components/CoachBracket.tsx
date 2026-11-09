"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ApiError } from "@/lib/api-client";
import { matchApi } from "@/modules/match";
import { openPlayApi } from "@/modules/open-play";
import { Card, ErrorNote, Loading, useAction, useLoad } from "@/modules/payments";
import { bracketApi } from "../api";
import type { BracketMode, BracketView } from "../types";
import { BracketBoard, nameOf } from "./BracketBoard";

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
  const [editing, setEditing] = useState<string | null>(null);
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
    if (r) bracket.setData(r);
  }
  async function makeMatch(bracketMatchId: string) {
    const m = await run(() => matchApi.create({ bracketMatchId }));
    if (m) setCreatedMatches((prev) => ({ ...prev, [bracketMatchId]: m.id }));
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
        <BracketBoard
          bracket={b}
          names={names}
          renderMatchActions={(matchId) => (
            <span style={{ marginLeft: 8 }}>
              <button type="button" onClick={() => setEditing(editing === matchId ? null : matchId)}>
                Koreksi
              </button>{" "}
              {createdMatches[matchId] ? (
                <Link href={`/coach/match/${createdMatches[matchId]}`}>Buka match</Link>
              ) : (
                <button type="button" disabled={busy} onClick={() => makeMatch(matchId)}>
                  Buat match
                </button>
              )}
              {editing === matchId && (
                <MatchEditor
                  bracket={b}
                  matchId={matchId}
                  names={names}
                  onSaved={(next) => {
                    bracket.setData(next);
                    setEditing(null);
                  }}
                />
              )}
            </span>
          )}
        />
      )}
    </>
  );
}

function MatchEditor({
  bracket,
  matchId,
  names,
  onSaved,
}: {
  bracket: BracketView;
  matchId: string;
  names: Map<string, string>;
  onSaved: (b: BracketView) => void;
}) {
  const match = bracket.rounds.flatMap((r) => r.matches).find((m) => m.id === matchId)!;
  const [home, setHome] = useState(match.home);
  const [away, setAway] = useState(match.away);
  const { busy, error, run } = useAction();
  const everyone = [...names.keys()];

  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function save() {
    const r = await run(() => bracketApi.editMatch(bracket.id, matchId, { home, away }));
    if (r) onSaved(r);
  }

  return (
    <div style={{ border: "1px dashed #8886", padding: 8, marginTop: 6 }}>
      {(
        [
          ["Sisi 1", home, setHome],
          ["Sisi 2", away, setAway],
        ] as const
      ).map(([label, list, set]) => (
        <fieldset key={label}>
          <legend>{label}</legend>
          {everyone.map((id) => (
            <label key={id} style={{ marginRight: 8 }}>
              <input type="checkbox" checked={list.includes(id)} onChange={() => toggle(list, set, id)} /> {nameOf(names, id)}
            </label>
          ))}
        </fieldset>
      ))}
      <button type="button" disabled={busy} onClick={save}>
        Simpan koreksi
      </button>
      <ErrorNote message={error} />
      <small>Server memeriksa susunan (pemain ganda atau tidak sesuai mode ditolak).</small>
    </div>
  );
}
