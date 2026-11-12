"use client";

import { useMe } from "@/modules/accounts";
import { ErrorNote, Loading, useLoad } from "@/modules/payments";
import { scoringApi } from "../api";
import type { UserSportStats } from "../types";

const SPORT_LABEL: Record<string, string> = {
  basketball: "Basket",
  futsal: "Futsal",
  badminton: "Badminton",
  tennis: "Tennis",
  padel: "Padel",
};

function StatsList({ userId }: { userId: string }) {
  const { data, error, loading } = useLoad<UserSportStats[]>(() => scoringApi.getUserStats(userId), [userId]);
  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!data || data.length === 0) return <p>Belum ada statistik. Main di open play untuk mulai mencatat.</p>;
  return (
    <ul style={{ listStyle: "none", padding: 0 }}>
      {data.map((s) => (
        <li key={s.sport} style={{ border: "1px solid #8884", borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{SPORT_LABEL[s.sport] ?? s.sport}</h2>
          <p>
            {s.matches} match, {s.points} poin, {s.fouls} pelanggaran
          </p>
          {s.sport === "basketball" && (
            <p>
              Tembakan 2 poin: {s.shots.two}, 3 poin: {s.shots.three}, lemparan bebas: {s.shots.one}
            </p>
          )}
          {Object.keys(s.actions).length > 0 && (
            <p>
              {Object.entries(s.actions)
                .map(([k, v]) => `${k} ${v}`)
                .join(", ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Statistik user yang sedang login, per cabang. */
export function MyStats() {
  const { user, isLoading, error } = useMe();
  if (isLoading) return <Loading />;
  if (!user) return <ErrorNote message={error ?? "Login dulu untuk melihat statistik"} />;
  return <StatsList userId={user.id} />;
}
