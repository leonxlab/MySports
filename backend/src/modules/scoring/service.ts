import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul scoring. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: score_events, fouls, player_match_stats.
 */
export function createScoringService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type ScoringService = ReturnType<typeof createScoringService>;
