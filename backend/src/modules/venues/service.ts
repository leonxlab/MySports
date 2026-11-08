import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul venues. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: venues, courts, court_slots.
 */
export function createVenuesService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type VenuesService = ReturnType<typeof createVenuesService>;
