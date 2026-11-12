"use client";

import { ErrorNote, Loading, useLoad } from "@/modules/payments";
import { scoringApi } from "../api";
import { useScoreboard } from "../useScoreboard";
import { ScoreboardView } from "./ScoreboardView";

/** Halaman hasil match: papan skor dan statistik per pemain. */
export function MatchResult({ matchId }: { matchId: string }) {
  const { board, error, loading } = useScoreboard(matchId);
  const stats = useLoad(() => scoringApi.getMatchStats(matchId), [matchId]);

  if (loading) return <Loading />;
  if (!board) return <ErrorNote message={error ?? "Papan skor tidak tersedia"} />;

  return (
    <>
      <ErrorNote message={error} />
      <ScoreboardView board={board} />
      <h2>Statistik pemain</h2>
      {stats.loading && <Loading />}
      <ErrorNote message={stats.error} />
      {stats.data && stats.data.players.length === 0 && <p>Belum ada statistik pemain.</p>}
      {stats.data && stats.data.players.length > 0 && (
        <table>
          <thead>
            <tr>
              <th scope="col">Pemain</th>
              <th scope="col">Poin</th>
              {board.sport === "basketball" && <th scope="col">2 poin</th>}
              {board.sport === "basketball" && <th scope="col">3 poin</th>}
              <th scope="col">Pelanggaran</th>
              <th scope="col">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {stats.data.players.map((p) => (
              <tr key={p.userId}>
                <th scope="row">{p.displayName ?? "Pemain"}</th>
                <td>
                  {p.points}
                  {p.pointsOverridden && " (dikoreksi Coach)"}
                </td>
                {board.sport === "basketball" && <td>{p.shots.two}</td>}
                {board.sport === "basketball" && <td>{p.shots.three}</td>}
                <td>{p.fouls}</td>
                <td>
                  {Object.entries(p.actions)
                    .map(([k, v]) => `${k} ${v}`)
                    .join(", ") || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
