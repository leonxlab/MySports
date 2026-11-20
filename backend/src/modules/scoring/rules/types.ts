/**
 * Aturan skor per cabang. AI hanya mengirim kejadian (bola masuk ring, bola mendarat di luar garis),
 * poin, game, dan set dihitung di sini. Nilai bawaan bisa diganti Coach/User lewat edit match.
 */
export type Team = "home" | "away";

export interface ScoreState {
  home: number;
  away: number;
  /** Struktur tambahan per cabang (game, set, deuce, dst.) */
  detail: Record<string, unknown>;
}

export type ScoreEvent =
  | { kind: "basket_made"; team: Team; points: 2 | 3 }
  | { kind: "goal"; team: Team }
  | { kind: "point"; team: Team };

export interface ScoreRules<Settings = Record<string, unknown>> {
  readonly sport: string;
  defaults: Settings;
  initial(settings: Settings): ScoreState;
  apply(state: ScoreState, event: ScoreEvent, settings: Settings): ScoreState;
  isFinished(state: ScoreState, settings: Settings): boolean;
}
