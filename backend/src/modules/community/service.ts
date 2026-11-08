import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul community. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: threads, thread_posts, content_reports.
 */
export function createCommunityService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type CommunityService = ReturnType<typeof createCommunityService>;
