import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul payments. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: payments, wallets, wallet_entries, withdrawals, fee_settings, court_bookings.
 */
export function createPaymentsService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type PaymentsService = ReturnType<typeof createPaymentsService>;
