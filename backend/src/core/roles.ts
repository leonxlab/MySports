/** user = pemain, coach = pengelola open play, owner = Owner Lapangan, admin = tim platform. */
export type Role = "user" | "coach" | "owner" | "admin";

export interface AuthUser {
  id: string;
  roles: Role[];
}

/**
 * Aturan akses (proposal, bagian Role dan Hak Akses):
 *  - tanpa role yang disyaratkan, atau "user" disyaratkan = semua yang login boleh
 *  - admin boleh semuanya, termasuk melewati batas role
 *  - aksi admin pada endpoint berrole (bukan sekadar "user") harus masuk audit log,
 *    baik admin lolos karena bypass maupun karena endpoint memang khusus admin
 */
export function evaluateAccess(userRoles: Role[], required: Role[]): { allowed: boolean; audit: boolean } {
  const isAdmin = userRoles.includes("admin");
  const needsSpecificRole = required.length > 0 && !required.includes("user");
  const holdsRequired = required.length === 0 || required.includes("user") || required.some((r) => userRoles.includes(r));
  return { allowed: holdsRequired || isAdmin, audit: isAdmin && needsSpecificRole };
}
