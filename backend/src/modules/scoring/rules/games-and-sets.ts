import { assertKind, type ScoreRules, type ScoreState, type Team } from "./types";

/**
 * Struktur game dan set gaya tennis, dipakai tennis dan padel.
 * TODO(decision): proposal hanya menyebut "hitung poin" untuk tennis dan padel. Nilai bawaan
 * (6 game per set, tiebreak di 6-6 sampai 7, best of 3 set) adalah asumsi yang bisa diganti Coach.
 */
export interface GamesAndSetsSettings {
  gamesPerSet: number;
  setsToWin: number;
  /** Tiebreak dimulai saat game imbang di angka ini. `null` = set selalu selisih 2 game. */
  tiebreakAt: number | null;
  tiebreakPoints: number;
  /** Tanpa advantage: di 40-40 poin berikutnya memenangkan game (golden point di padel). */
  noAd: boolean;
}

export interface GamesAndSetsDetail {
  games: Record<Team, number>;
  sets: { home: number; away: number }[];
  setsWon: Record<Team, number>;
  tiebreak: boolean;
  /** Label poin untuk papan skor: 0, 15, 30, 40, AD, atau angka tiebreak. Dihitung di backend. */
  pointLabel: Record<Team, string>;
}

const zero = (): Record<Team, number> => ({ home: 0, away: 0 });

export const detailOf = (s: ScoreState): GamesAndSetsDetail => ({
  games: (s.detail.games as Record<Team, number> | undefined) ?? zero(),
  sets: (s.detail.sets as GamesAndSetsDetail["sets"] | undefined) ?? [],
  setsWon: (s.detail.setsWon as Record<Team, number> | undefined) ?? zero(),
  tiebreak: (s.detail.tiebreak as boolean | undefined) ?? false,
  pointLabel: (s.detail.pointLabel as Record<Team, string> | undefined) ?? { home: "0", away: "0" },
});

const LABELS = ["0", "15", "30", "40"];

export function pointLabels(points: Record<Team, number>, tiebreak: boolean, noAd: boolean): Record<Team, string> {
  if (tiebreak) return { home: String(points.home), away: String(points.away) };
  const { home, away } = points;
  if (home >= 3 && away >= 3 && !noAd) {
    if (home === away) return { home: "40", away: "40" };
    return home > away ? { home: "AD", away: "40" } : { home: "40", away: "AD" };
  }
  return { home: LABELS[Math.min(home, 3)]!, away: LABELS[Math.min(away, 3)]! };
}

function gameWon(points: Record<Team, number>, w: Team, l: Team, tiebreak: boolean, s: GamesAndSetsSettings) {
  if (tiebreak) return points[w] >= s.tiebreakPoints && points[w] - points[l] >= 2;
  if (s.noAd) return points[w] >= 4;
  return points[w] >= 4 && points[w] - points[l] >= 2;
}

export function gamesAndSetsRules(sport: string, defaults: GamesAndSetsSettings): ScoreRules<GamesAndSetsSettings> {
  const rules: ScoreRules<GamesAndSetsSettings> = {
    sport,
    kinds: ["point"],
    defaults,
    initial: () => ({
      home: 0,
      away: 0,
      detail: { games: zero(), sets: [], setsWon: zero(), tiebreak: false, pointLabel: { home: "0", away: "0" } },
    }),
    apply(state, event, s) {
      assertKind(rules, event);
      const w = event.team;
      const l: Team = w === "home" ? "away" : "home";
      const d = detailOf(state);
      const points = { home: state.home, away: state.away };
      points[w] += 1;

      if (!gameWon(points, w, l, d.tiebreak, s)) {
        return { ...state, ...points, detail: { ...state.detail, pointLabel: pointLabels(points, d.tiebreak, s.noAd) } };
      }

      const games = { ...d.games, [w]: d.games[w] + 1 };
      const setWon = d.tiebreak || (games[w] >= s.gamesPerSet && games[w] - games[l] >= 2);
      if (setWon) {
        return {
          home: 0,
          away: 0,
          detail: {
            games: zero(),
            sets: [...d.sets, games],
            setsWon: { ...d.setsWon, [w]: d.setsWon[w] + 1 },
            tiebreak: false,
            pointLabel: { home: "0", away: "0" },
          },
        };
      }
      const tiebreak = s.tiebreakAt !== null && games.home === s.tiebreakAt && games.away === s.tiebreakAt;
      return { home: 0, away: 0, detail: { ...d, games, tiebreak, pointLabel: { home: "0", away: "0" } } };
    },
    isFinished: (state, s) => {
      const { setsWon } = detailOf(state);
      return Math.max(setsWon.home, setsWon.away) >= s.setsToWin;
    },
  };
  return rules;
}
