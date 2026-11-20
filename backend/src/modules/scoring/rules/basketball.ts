import type { ScoreRules } from "./types";

/** Poin 2 atau 3 (jarak tembakan). AI hanya tahu bola masuk ring, Coach memilih 2 atau 3 saat konfirmasi (usulan, pertanyaan terbuka #10). Full court dan half court, jumlah pemain per sisi fleksibel. */
export const basketballRules: ScoreRules = {
  sport: "basketball",
  defaults: {},
  initial: () => ({ home: 0, away: 0, detail: {} }),
  apply: () => {
    // TODO: terapkan kejadian ke skor
    throw new Error("TODO: basketballRules.apply");
  },
  isFinished: () => false,
};
