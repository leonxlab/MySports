import { describe, expect, it } from "vitest";
import type { AppContext } from "../src/core/context";
import { galleryItemSchema } from "../src/modules/accounts/schema";
import { createAccountsService } from "../src/modules/accounts/service";

function createAccountsFixture() {
  const rows: Record<string, Record<string, unknown>[]> = {
    profiles: [],
    user_roles: [],
    profile_sport_experience: [],
    profile_gallery: [],
  };
  const removedFiles: string[] = [];

  const supabase = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let includedIds: unknown[] | null = null;
      let deleting = false;
      let inserting: Record<string, unknown> | null = null;
      let updating: Record<string, unknown> | null = null;

      function selectRows() {
        return rows[table].filter((row) => {
          const matchesFilters = filters.every(([column, value]) => row[column] === value);
          const matchesIds = includedIds === null || includedIds.includes(row.id);
          return matchesFilters && matchesIds;
        });
      }

      function execute() {
        const selected = selectRows();
        if (deleting) rows[table] = rows[table].filter((row) => !selected.includes(row));
        if (inserting) rows[table].push(inserting);
        if (updating) selected.forEach((row) => Object.assign(row, updating));
        return selectRows();
      }

      const builder: Record<string, (...args: never[]) => unknown> & {
        then: (
          resolve: (result: { data: Record<string, unknown>[]; error: null }) => unknown,
        ) => unknown;
      } = {
        select() {
          return builder;
        },
        upsert(values: Record<string, unknown>, options?: { ignoreDuplicates?: boolean }) {
          const tableRows = rows[table];
          const key = table === "profiles" ? "id" : "user_id";
          const existing = tableRows.find(
            (row) => row[key] === values[key] && (table === "profiles" || row.role === values.role),
          );
          if (!existing) tableRows.push({ ...values });
          else if (!options?.ignoreDuplicates) Object.assign(existing, values);
          return Promise.resolve({ error: null });
        },
        insert(values: Record<string, unknown>) {
          inserting = values;
          return builder;
        },
        update(values: Record<string, unknown>) {
          updating = values;
          return builder;
        },
        delete() {
          deleting = true;
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return builder;
        },
        in(_column: string, values: unknown[]) {
          includedIds = values;
          return builder;
        },
        order() {
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({ data: execute()[0] ?? null, error: null });
        },
        single() {
          return Promise.resolve({ data: execute()[0] ?? null, error: null });
        },
        then(resolve) {
          return Promise.resolve({ data: execute(), error: null }).then(resolve);
        },
      };

      return builder;
    },
    storage: {
      from() {
        return {
          remove(paths: string[]) {
            removedFiles.push(...paths);
            return Promise.resolve({ error: null });
          },
          createSignedUploadUrl(path: string) {
            return Promise.resolve({
              data: { path, token: "upload-token", signedUrl: "https://storage.example/upload" },
              error: null,
            });
          },
        };
      },
    },
  };

  const ctx = { supabase } as unknown as AppContext;
  return { rows, removedFiles, service: createAccountsService(ctx) };
}

describe("accounts service", () => {
  it("bootstrap dipanggil berulang kali tetap membuat satu profil dan satu role user", async () => {
    const { rows, service } = createAccountsFixture();

    await service.bootstrapProfile("player-1", "Pemain Satu");
    await service.bootstrapProfile("player-1", "Nama yang tidak menimpa profil");

    expect(rows.profiles).toHaveLength(1);
    expect(rows.profiles[0].display_name).toBe("Pemain Satu");
    expect(rows.user_roles).toEqual([{ user_id: "player-1", role: "user" }]);
  });

  it("profil publik tidak membocorkan role admin", async () => {
    const { rows, service } = createAccountsFixture();
    rows.profiles.push({ id: "player-1", display_name: "Pemain Satu", photo_path: null });
    rows.user_roles.push(
      { user_id: "player-1", role: "user" },
      { user_id: "player-1", role: "admin" },
    );

    const profile = await service.getPublicProfile("player-1");

    expect(profile.roles).toEqual(["user"]);
    expect(profile).not.toHaveProperty("is_admin");
    expect(profile.roles).not.toContain("admin");
  });

  it("hanya menghapus galeri milik pengguna dan membersihkan file terkait", async () => {
    const { rows, removedFiles, service } = createAccountsFixture();
    rows.profile_gallery.push({
      id: "gallery-1",
      user_id: "player-1",
      storage_path: "player-1/gallery/123e4567-e89b-12d3-a456-426614174000.jpg",
    });

    await service.removeGalleryItem("player-1", "gallery-1");

    expect(rows.profile_gallery).toHaveLength(0);
    expect(removedFiles).toEqual(["player-1/gallery/123e4567-e89b-12d3-a456-426614174000.jpg"]);
    await expect(service.removeGalleryItem("other-player", "gallery-1")).rejects.toMatchObject({
      status: 404,
      code: "GALLERY_ITEM_NOT_FOUND",
    });
  });

  it("menolak path media milik pengguna lain", async () => {
    const { service } = createAccountsFixture();

    await expect(
      service.addGalleryItem("player-1", {
        kind: "photo",
        storage_path: "other-player/gallery/123e4567-e89b-12d3-a456-426614174000.jpg",
      }),
    ).rejects.toMatchObject({ status: 400, code: "INVALID_MEDIA_PATH" });
  });

  it("mewajibkan teks untuk item kutipan", () => {
    expect(galleryItemSchema.safeParse({ kind: "quote", quote_text: "   " }).success).toBe(false);
    expect(
      galleryItemSchema.safeParse({ kind: "quote", quote_text: "Final pertama saya" }).success,
    ).toBe(true);
  });

  it("role admin tidak dapat diberikan melalui API modul", async () => {
    const { service } = createAccountsFixture();

    await expect(service.grantRole("player-1", "admin", "operator")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});
