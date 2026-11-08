import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul feed. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: user_signals, content_classification.
 */
export function createFeedService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type FeedService = ReturnType<typeof createFeedService>;
