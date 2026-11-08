import type { AppContext } from "../../core/context";

/**
 * Logika bisnis modul role-requests. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: role_requests, user_roles (tulis lewat accounts).
 */
export function createRoleRequestsService(_ctx: AppContext) {
  return {
    // TODO: tambahkan fungsi per endpoint
  };
}

export type RoleRequestsService = ReturnType<typeof createRoleRequestsService>;
