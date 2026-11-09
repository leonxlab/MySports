import type { AppContext } from "../../core/context";
import { AppError, notFound } from "../../core/errors";
import type { Role } from "../../core/roles";

export interface ProfileSummary {
  id: string;
  display_name: string;
  photo_path: string | null;
  level: number;
}

const publicRoles: Role[] = ["user", "coach", "owner"];

/**
 * Logika bisnis modul accounts. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: profiles, user_roles, profile_sport_experience, profile_gallery.
 */
export function createAccountsService(ctx: AppContext) {
  const supabase = ctx.supabase;

  async function getRoles(userId: string): Promise<Role[]> {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((row) => row.role as Role);
  }

  async function getProfileRow(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, age, bio, photo_path, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("PROFILE_NOT_FOUND", "Profil tidak ditemukan");
    return data;
  }

  async function getProfileSummary(userId: string): Promise<ProfileSummary> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, photo_path")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("PROFILE_NOT_FOUND", "Profil tidak ditemukan");
    // TODO(integration): gunakan createLevelApi(ctx).getLevelSummary(userId) setelah modul level siap.
    return { ...data, level: 0 };
  }

  async function getMe(userId: string) {
    const [profile, roles] = await Promise.all([getProfileRow(userId), getRoles(userId)]);
    // TODO(integration): gunakan createLevelApi(ctx).getLevelSummary(userId) setelah modul level siap.
    return { ...profile, roles, level: 0 };
  }

  return {
    async bootstrapProfile(userId: string, displayName: string) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, display_name: displayName },
          { onConflict: "id", ignoreDuplicates: true },
        );
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: userId, role: "user" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (roleError) throw roleError;
      return getMe(userId);
    },

    getMe,

    async getPublicProfile(userId: string) {
      const [profile, roles] = await Promise.all([getProfileRow(userId), getRoles(userId)]);
      return { ...profile, roles: roles.filter((role) => publicRoles.includes(role)), level: 0 };
    },

    getProfileSummary,

    async getProfileSummaries(userIds: string[]): Promise<ProfileSummary[]> {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, photo_path")
        .in("id", userIds);
      if (error) throw error;
      // TODO(integration): use per-user levels once the level module is available.
      return (data ?? []).map((profile) => ({ ...profile, level: 0 }));
    },

    getRoles,

    async grantRole(userId: string, role: Role, grantedBy: string) {
      if (role === "admin") {
        throw new AppError(403, "FORBIDDEN", "Role admin hanya boleh diberikan secara internal");
      }
      const { error } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: userId, role, granted_by: grantedBy },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
      if (error) throw error;
      return getRoles(userId);
    },

    async revokeRole(userId: string, role: Role) {
      if (role === "user" || role === "admin") {
        throw new AppError(403, "FORBIDDEN", "Role dasar dan admin tidak dapat dicabut lewat API");
      }
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
      return getRoles(userId);
    },
  };
}

export type AccountsService = ReturnType<typeof createAccountsService>;
