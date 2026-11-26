import { assertKind, type ScoreRules, type ScoreState, type Team } from "./types";

/**
 * Nilai bawaan mengikuti aturan BWF (rally 21, selisih 2, batas 30, best of 3).
 * TODO(decision): proposal hanya menyebut "poin per game"; struktur game belum diputuskan tim.
 * Coach bisa mengganti lewat `matches.settings.rules`, misalnya satu game sampai 15.
 */
export interface BadmintonSettings {
  pointsPerGame: number;
  winBy: number;
  /** Poin yang langsung memenangkan game walau selisih belum 2. `null` = tanpa batas. */
  cap: number | null;
  gamesToWin: number;
}

interface Detail {
  games: { home: number; away: number }[];
  gamesWon: Record<Team, number>;
}

const detailOf = (s: ScoreState): Detail => ({
  games: (s.detail.games as Detail["games"] | undefined) ?? [],
  gamesWon: (s.detail.gamesWon as Detail["gamesWon"] | undefined) ?? { home: 0, away: 0 },
});

/** Poin per rally. Kejadian AI (kok jatuh di dalam atau di luar garis) diubah jadi `point` di service. */
export const badmintonRules: ScoreRules<BadmintonSettings> = {
  sport: "badminton",
  kinds: ["point"],
  defaults: { pointsPerGame: 21, winBy: 2, cap: 30, gamesToWin: 2 },
  initial: () => ({ home: 0, away: 0, detail: { games: [], gamesWon: { home: 0, away: 0 } } }),
  apply(state, event, settings) {
    assertKind(badmintonRules, event);
    const winner = event.team;
    const loser: Team = winner === "home" ? "away" : "home";
    const points = { home: state.home, away: state.away };
    points[winner] += 1;

    const won =
      (points[winner] >= settings.pointsPerGame && points[winner] - points[loser] >= settings.winBy) ||
      (settings.cap !== null && points[winner] >= settings.cap);
    if (!won) return { ...state, ...points };

    const d = detailOf(state);
    return {
      home: 0,
      away: 0,
      detail: {
        ...state.detail,
        games: [...d.games, points],
        gamesWon: { ...d.gamesWon, [winner]: d.gamesWon[winner] + 1 },
      },
    };
  },
  isFinished: (state, settings) => {
    const { gamesWon } = detailOf(state);
    return Math.max(gamesWon.home, gamesWon.away) >= settings.gamesToWin;
  },
};
