/** user = pemain, coach = pengelola open play, owner = Owner Lapangan, admin = tim platform. */
export type Role = "user" | "coach" | "owner" | "admin";

export interface AuthUser {
  id: string;
  roles: Role[];
}
