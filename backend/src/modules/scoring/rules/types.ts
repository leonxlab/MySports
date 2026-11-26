/**
 * Aturan skor per cabang. AI hanya mengirim kejadian (bola masuk ring, bola mendarat di luar garis),
 * poin, game, dan set dihitung di sini. Nilai bawaan bisa diganti Coach/User lewat edit match
 * (`matches.settings.rules`).
 *
 * Semua fungsi murni: skor selalu dihitung ulang dengan memutar ulang kejadian yang confirmed/corrected
 * secara berurutan, jadi konfirmasi, koreksi, dan pembatalan tidak pernah membuat skor tersimpan basi.
 */
export type Team = "home" | "away";

export const otherTeam = (t: Team): Team => (t === "home" ? "away" : "home");

export interface ScoreState {
  /** Skor utama yang tampil di papan: poin (basket, futsal) atau poin game berjalan (raket). */
  home: number;
  away: number;
  /** Struktur tambahan per cabang (game, set, deuce, statistik tembakan, dst.) */
  detail: Record<string, unknown>;
}

export type ScoreEvent =
  /** Basket. 1 = lemparan bebas (input Coach), 2 atau 3 = tembakan. */
  | { kind: "basket_made"; team: Team; points: 1 | 2 | 3 }
  | { kind: "goal"; team: Team }
  /** Raket: tim yang memenangkan rally. */
  | { kind: "point"; team: Team };

export type ScoreEventKind = ScoreEvent["kind"];

export class ScoreRuleError extends Error {
  constructor(
    readonly code: "EVENT_NOT_ALLOWED" | "MATCH_FINISHED",
    message: string,
  ) {
    super(message);
  }
}

export interface ScoreRules<Settings extends object = Record<string, unknown>> {
  readonly sport: string;
  /** Jenis kejadian yang sah untuk cabang ini. */
  readonly kinds: readonly ScoreEventKind[];
  defaults: Settings;
  initial(settings: Settings): ScoreState;
  apply(state: ScoreState, event: ScoreEvent, settings: Settings): ScoreState;
  isFinished(state: ScoreState, settings: Settings): boolean;
}

/**
 * Gabungkan nilai bawaan dengan penimpa dari setting match. Kunci yang tidak dikenal dan nilai
 * yang tipenya berbeda dari bawaan diabaikan. Bawaan `null` menerima angka (batas yang opsional).
 */
export function mergeRuleSettings<S extends object>(defaults: S, overrides: Record<string, unknown> | undefined): S {
  const out = { ...defaults } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (!(key in out)) continue;
    const base = out[key];
    const ok = base === null ? value === null || typeof value === "number" : typeof value === typeof base;
    if (ok) out[key] = value;
  }
  return out as S;
}

export function assertKind(rules: { sport: string; kinds: readonly ScoreEventKind[] }, event: ScoreEvent) {
  if (!rules.kinds.includes(event.kind)) {
    throw new ScoreRuleError("EVENT_NOT_ALLOWED", `Kejadian ${event.kind} tidak berlaku untuk ${rules.sport}`);
  }
}

/** Putar ulang kejadian berurutan dari skor awal. Kejadian setelah match selesai ditolak. */
export function replay<S extends object>(rules: ScoreRules<S>, events: ScoreEvent[], settings: S): ScoreState {
  let state = rules.initial(settings);
  for (const event of events) {
    if (rules.isFinished(state, settings)) {
      throw new ScoreRuleError("MATCH_FINISHED", "Skor sudah final, kejadian tambahan tidak bisa diterapkan");
    }
    state = rules.apply(state, event, settings);
  }
  return state;
}
