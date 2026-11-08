import type { ScoreRules } from "./types";

/** Gol = 1 poin. Dihitung dari kejadian bola masuk gawang. */
export const futsalRules: ScoreRules = {
  sport: "futsal",
  defaults: {},
  initial: () => ({ home: 0, away: 0, detail: {} }),
  apply: () => {
    // TODO: terapkan kejadian ke skor
    throw new Error("TODO: futsalRules.apply");
  },
  isFinished: () => false,
};
