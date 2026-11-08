import type { ScoreRules } from "./types";

/** Poin. Kejadian AI belum ditentukan. Padel tunggal memakai lapangan dan aturan skor yang sama dengan ganda (asumsi sementara). */
export const padelRules: ScoreRules = {
  sport: "padel",
  defaults: {},
  initial: () => ({ home: 0, away: 0, detail: {} }),
  apply: () => {
    // TODO: terapkan kejadian ke skor
    throw new Error("TODO: padelRules.apply");
  },
  isFinished: () => false,
};
