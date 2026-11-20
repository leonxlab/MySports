import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul vip. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: (tidak ada).
 */
export function createVipService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type VipService = ReturnType<typeof createVipService>;
