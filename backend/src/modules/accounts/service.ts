import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul accounts. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: profiles, user_roles, profile_sport_experience, profile_gallery.
 */
export function createAccountsService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
