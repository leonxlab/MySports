"use client";

import Link from "next/link";
import { useState } from "react";
// Impor langsung dari api.ts: index bracket mengimpor modul match (hindari impor melingkar).
import { bracketApi } from "@/modules/bracket/api";
import { ErrorNote, Loading, useLoad } from "@/modules/payments";
import {
  FoulPanel,
  ManualActionPanel,
  ScoreboardView,
  ScorerPicker,
  SuggestionQueue,
  useScoreboard,
  type Team,
} from "@/modules/scoring";
import type { MatchView } from "../types";

/** Bagian skor di control menu Coach. Komponen dan aturan skor milik modul scoring. */
export function CoachScoringPanel({ match }: { match: MatchView }) {
  const { board, error, loading, apply } = useScoreboard(match.id);
  // Match manual (tanpa bracket) tidak punya daftar pemain: skor dicatat tanpa pencetak.
  const players = useLoad(
    async () => (match.bracketMatchId ? bracketApi.getMatchPlayers(match.bracketMatchId) : { home: [], away: [] }),
    [match.bracketMatchId],
  );
  const [team, setTeam] = useState<Team>("home");
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [foulNote, setFoulNote] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (!board) return <ErrorNote message={error ?? "Papan skor tidak tersedia"} />;

  const home = players.data?.home ?? [];
  const away = players.data?.away ?? [];
  const open = match.status !== "finished" && match.status !== "cancelled";

  function changeTeam(next: Team) {
    setTeam(next);
    setScorerId(null);
  }

  return (
    <>
      <ErrorNote message={error} />
      <ScoreboardView board={board} />
      <ErrorNote message={players.error} />
      {open && !board.finished && (
        <>
          <ScorerPicker
            attacking={team}
            home={home}
            away={away}
            value={scorerId}
            onChange={setScorerId}
            onAttackingChange={changeTeam}
          />
          <ManualActionPanel matchId={match.id} sport={match.sport} team={team} scorerId={scorerId} onScored={apply} />
        </>
      )}
      {open && (
        <>
          {home.length + away.length > 0 && (
            <FoulPanel
              matchId={match.id}
              players={[...home, ...away]}
              onAdded={() => setFoulNote("Pelanggaran tercatat.")}
            />
          )}
          {foulNote && <p role="status">{foulNote}</p>}
          <SuggestionQueue suggestions={board.suggestions} onChange={apply} />
        </>
      )}
      <p>
        <Link href={`/match/${match.id}/result`}>Lihat hasil dan statistik</Link>
      </p>
    </>
  );
}
