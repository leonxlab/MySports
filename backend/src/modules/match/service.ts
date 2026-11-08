import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul match. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: matches.
 */
export function createMatchService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type MatchService = ReturnType<typeof createMatchService>;
