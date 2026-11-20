import type { ScoreRules } from "./types";

/** Poin. Kejadian AI belum ditentukan (usulan: bola mendarat di dalam atau di luar garis). Tunggal dan ganda. */
export const tennisRules: ScoreRules = {
  sport: "tennis",
  defaults: {},
  initial: () => ({ home: 0, away: 0, detail: {} }),
  apply: () => {
    // TODO: terapkan kejadian ke skor
    throw new Error("TODO: tennisRules.apply");
  },
  isFinished: () => false,
};
