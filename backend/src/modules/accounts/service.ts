import { randomUUID } from "node:crypto";
import type { AppContext } from "../../core/context";
import { AppError, notFound } from "../../core/errors";
import type { Role } from "../../core/roles";
import type { ExperienceInput, GalleryItemInput, UploadInput, UpdateProfileInput } from "./schema";

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
  const media = () => supabase.storage.from("media");

  function assertOwnedMediaPath(userId: string, path: string) {
    const [ownerId, purpose, filename, ...extra] = path.split("/");
    if (
      ownerId !== userId ||
      !["photo", "gallery"].includes(purpose) ||
      !/^[A-Za-z0-9-]+\.(jpg|png|webp|mp4|webm)$/.test(filename ?? "") ||
      extra.length > 0
    ) {
      throw new AppError(400, "INVALID_MEDIA_PATH", "Path media tidak valid");
    }
  }

  async function getExperience(userId: string) {
    const { data, error } = await supabase
      .from("profile_sport_experience")
      .select("sport, years, notes")
      .eq("user_id", userId);
    if (error) throw error;
    return data ?? [];
  }

  async function getGallery(userId: string) {
    const { data, error } = await supabase
      .from("profile_gallery")
      .select("id, kind, storage_path, quote_text, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async function getMediaUrl(path: string | null) {
    if (!path) return null;
    const { data, error } = await media().createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }

  async function addMediaUrls<T extends { storage_path?: string | null }>(items: T[]) {
    return Promise.all(
      items.map(async (item) => ({
        ...item,
        media_url: item.storage_path ? await getMediaUrl(item.storage_path) : null,
      })),
    );
  }

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
    const [profile, roles, experience, gallery] = await Promise.all([
      getProfileRow(userId),
      getRoles(userId),
      getExperience(userId),
      getGallery(userId),
    ]);
    // TODO(integration): gunakan createLevelApi(ctx).getLevelSummary(userId) setelah modul level siap.
    const [photo_url, galleryWithUrls] = await Promise.all([
      getMediaUrl(profile.photo_path),
      addMediaUrls(gallery),
    ]);
    return { ...profile, photo_url, roles, experience, gallery: galleryWithUrls, level: 0 };
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
      const [profile, roles, experience, gallery] = await Promise.all([
        getProfileRow(userId),
        getRoles(userId),
        getExperience(userId),
        getGallery(userId),
      ]);
      const [photo_url, galleryWithUrls] = await Promise.all([
        getMediaUrl(profile.photo_path),
        addMediaUrls(gallery),
      ]);
      return {
        ...profile,
        photo_url,
        roles: roles.filter((role) => publicRoles.includes(role)),
        experience,
        gallery: galleryWithUrls,
        level: 0,
      };
    },

    async updateMe(userId: string, input: UpdateProfileInput) {
      if (input.photo_path) assertOwnedMediaPath(userId, input.photo_path);
      const { data, error } = await supabase
        .from("profiles")
        .update(input)
        .eq("id", userId)
        .select("id, display_name, age, bio, photo_path, created_at, updated_at")
        .single();
      if (error) throw error;
      return getMe(userId);
    },

    async upsertExperience(userId: string, sport: string, input: ExperienceInput) {
      const { data, error } = await supabase
        .from("profile_sport_experience")
        .upsert({ user_id: userId, sport, ...input }, { onConflict: "user_id,sport" })
        .select("sport, years, notes")
        .single();
      if (error) throw error;
      return data;
    },

    async addGalleryItem(userId: string, input: GalleryItemInput) {
      if (input.kind !== "quote") assertOwnedMediaPath(userId, input.storage_path);
      const { data, error } = await supabase
        .from("profile_gallery")
        .insert({ user_id: userId, ...input })
        .select("id, kind, storage_path, quote_text, created_at")
        .single();
      if (error) throw error;
      return data;
    },

    async removeGalleryItem(userId: string, itemId: string) {
      const { data: item, error: findError } = await supabase
        .from("profile_gallery")
        .select("id, storage_path")
        .eq("id", itemId)
        .eq("user_id", userId)
        .maybeSingle();
      if (findError) throw findError;
      if (!item) throw notFound("GALLERY_ITEM_NOT_FOUND", "Item galeri tidak ditemukan");

      if (item.storage_path) {
        assertOwnedMediaPath(userId, item.storage_path);
        const { error: storageError } = await media().remove([item.storage_path]);
        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase
        .from("profile_gallery")
        .delete()
        .eq("id", itemId)
        .eq("user_id", userId);
      if (deleteError) throw deleteError;
      return { id: itemId, deleted: true };
    },

    async signUpload(userId: string, input: UploadInput, purpose: "photo" | "gallery") {
      const isImage = input.content_type.startsWith("image/");
      if (purpose === "photo" && !isImage) {
        throw new AppError(400, "INVALID_FILE_TYPE", "Foto profil harus berupa gambar");
      }
      const extension = input.content_type.split("/")[1];
      const path = `${userId}/${purpose}/${randomUUID()}.${extension}`;
      const { data, error } = await media().createSignedUploadUrl(path, { upsert: false });
      if (error) throw error;
      return { path: data.path, token: data.token, signedUrl: data.signedUrl };
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
