import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul admin. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: admin_audit_log.
 */
export function createAdminService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
