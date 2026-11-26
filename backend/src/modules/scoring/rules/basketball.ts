import { assertKind, type ScoreRules, type ScoreState, type Team } from "./types";

export interface BasketballSettings {
  /**
   * Batas poin untuk game pendek (misalnya half court sampai 21). `null` = match selesai oleh waktu
   * (timer modul match), bukan oleh skor.
   * TODO(decision): nilai bawaan untuk half court belum ditetapkan proposal.
   */
  targetPoints: number | null;
}

type Shots = Record<Team, { one: number; two: number; three: number }>;

const emptyShots = (): Shots => ({ home: { one: 0, two: 0, three: 0 }, away: { one: 0, two: 0, three: 0 } });
const shotsOf = (s: ScoreState): Shots => (s.detail.shots as Shots | undefined) ?? emptyShots();

/**
 * Poin 1 (lemparan bebas), 2, atau 3. AI hanya tahu bola masuk ring; Coach memilih 2 atau 3 saat
 * konfirmasi (TODO(decision): pertanyaan terbuka #10). Statistik: jumlah tembakan 2 dan 3 poin per tim.
 */
export const basketballRules: ScoreRules<BasketballSettings> = {
  sport: "basketball",
  kinds: ["basket_made"],
  defaults: { targetPoints: null },
  initial: () => ({ home: 0, away: 0, detail: { shots: emptyShots() } }),
  apply(state, event) {
    assertKind(basketballRules, event);
    if (event.kind !== "basket_made") return state;
    const shots = structuredClone(shotsOf(state));
    const key = event.points === 1 ? "one" : event.points === 2 ? "two" : "three";
    shots[event.team][key] += 1;
    return { ...state, [event.team]: state[event.team] + event.points, detail: { ...state.detail, shots } };
  },
  isFinished: (state, settings) =>
    settings.targetPoints !== null && Math.max(state.home, state.away) >= settings.targetPoints,
};
