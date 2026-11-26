import type { Scoreboard } from "../types";

interface SetScore {
  home: number;
  away: number;
}

/** Tampilan papan skor. Semua angka dan label datang dari backend; komponen ini hanya menampilkan. */
export function ScoreboardView({ board }: { board: Scoreboard }) {
  const d = board.score.detail;
  const label = d.pointLabel as { home: string; away: string } | undefined;
  const games = d.games as SetScore | SetScore[] | undefined;
  const sets = d.sets as SetScore[] | undefined;

  return (
    <section aria-label="Papan skor" style={{ textAlign: "center", margin: "16px 0" }}>
      <div style={{ display: "flex", justifyContent: "center", gap: 24, fontSize: 40, fontWeight: 700 }}>
        <span aria-label="Skor home">{label?.home ?? board.score.home}</span>
        <span aria-hidden>-</span>
        <span aria-label="Skor away">{label?.away ?? board.score.away}</span>
      </div>
      {Array.isArray(games) && games.length > 0 && <p>Game: {games.map((g) => `${g.home}-${g.away}`).join(", ")}</p>}
      {!Array.isArray(games) && games && <p>Game set ini: {`${games.home}-${games.away}`}</p>}
      {sets && sets.length > 0 && <p>Set: {sets.map((s) => `${s.home}-${s.away}`).join(", ")}</p>}
      {board.finished && <p role="status">Skor final</p>}
      {board.ignoredEventIds.length > 0 && (
        <p role="note">{board.ignoredEventIds.length} kejadian tidak dihitung karena skor sudah final.</p>
      )}
    </section>
  );
}
