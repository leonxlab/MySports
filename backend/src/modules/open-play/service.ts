import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul open-play. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: open_plays, open_play_participants.
 */
export function createOpenPlayService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type OpenPlayService = ReturnType<typeof createOpenPlayService>;
