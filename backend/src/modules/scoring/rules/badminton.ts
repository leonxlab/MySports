import type { ScoreRules } from "./types";

/** Poin per rally, dihitung dari kejadian kok jatuh di dalam atau di luar garis ditambah aturan rally. Nilai bawaan: edit di edit match. */
export const badmintonRules: ScoreRules = {
  sport: "badminton",
  defaults: {},
  initial: () => ({ home: 0, away: 0, detail: {} }),
  apply: () => {
    // TODO: terapkan kejadian ke skor
    throw new Error("TODO: badmintonRules.apply");
  },
  isFinished: () => false,
};
