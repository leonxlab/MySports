import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul bracket. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: brackets, bracket_rounds, bracket_matches, bracket_resting.
 */
export function createBracketService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type BracketService = ReturnType<typeof createBracketService>;
