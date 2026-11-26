import { assertKind, type ScoreRules } from "./types";

export interface FutsalSettings {
  /** Batas gol untuk game pendek. `null` = selesai oleh waktu (timer modul match). */
  targetGoals: number | null;
}

/** Gol = 1 poin. Dihitung dari kejadian bola masuk gawang. Jenis tendangan dan pencetak diinput Coach. */
export const futsalRules: ScoreRules<FutsalSettings> = {
  sport: "futsal",
  kinds: ["goal"],
  defaults: { targetGoals: null },
  initial: () => ({ home: 0, away: 0, detail: {} }),
  apply(state, event) {
    assertKind(futsalRules, event);
    return { ...state, [event.team]: state[event.team] + 1 };
  },
  isFinished: (state, settings) =>
    settings.targetGoals !== null && Math.max(state.home, state.away) >= settings.targetGoals,
};
