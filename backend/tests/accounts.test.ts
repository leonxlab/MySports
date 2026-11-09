import { describe, expect, it } from "vitest";
import type { AppContext } from "../src/core/context";
import { createAccountsService } from "../src/modules/accounts/service";

function createAccountsFixture() {
  const rows: Record<string, Record<string, unknown>[]> = {
    profiles: [],
    user_roles: [],
  };

  const supabase = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let includedIds: unknown[] | null = null;
      let deleting = false;
      const builder: any = {
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
        maybeSingle() {
          return Promise.resolve({ data: selectRows()[0] ?? null, error: null });
        },
        then(resolve: (result: { data: Record<string, unknown>[]; error: null }) => unknown) {
          if (deleting) {
            const selected = selectRows();
            rows[table] = rows[table].filter((row) => !selected.includes(row));
          }
          return Promise.resolve({ data: selectRows(), error: null }).then(resolve);
        },
      };

      function selectRows() {
        return rows[table].filter((row) => {
          const matchesFilters = filters.every(([column, value]) => row[column] === value);
          const matchesIds = includedIds === null || includedIds.includes(row.id);
          return matchesFilters && matchesIds;
        });
      }

      return builder;
    },
  };

  const ctx = { supabase } as unknown as AppContext;
  return { rows, service: createAccountsService(ctx) };
}

describe("accounts service foundation", () => {
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

  it("role admin tidak dapat diberikan melalui API modul", async () => {
    const { service } = createAccountsFixture();

    await expect(service.grantRole("player-1", "admin", "operator")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });
});
