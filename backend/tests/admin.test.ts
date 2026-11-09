import { afterAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildApp } from "../src/app";
import type { AppContext } from "../src/core/context";
import { RealtimeHub } from "../src/core/realtime";
import { createAdminService } from "../src/modules/admin/service";
import { listAuditSchema } from "../src/modules/admin/schema";
import { testEnv } from "./helpers";

type Row = Record<string, unknown>;

const adminId = "123e4567-e89b-12d3-a456-426614174001";
const otherAdminId = "123e4567-e89b-12d3-a456-426614174002";

function createAdminFixture() {
  const rows: Record<string, Row[]> = {
    admin_audit_log: [
      {
        id: 3,
        admin_id: adminId,
        method: "POST",
        path: "/api/v1/community/reports/1/resolve",
        target: { params: { id: "1" } },
        created_at: "2026-11-09T12:00:00.000Z",
      },
      {
        id: 2,
        admin_id: adminId,
        method: "POST",
        path: "/api/v1/venues/1/approve",
        target: null,
        created_at: "2026-11-09T11:00:00.000Z",
      },
      {
        id: 1,
        admin_id: otherAdminId,
        method: "DELETE",
        path: "/api/v1/community/threads/1",
        target: null,
        created_at: "2026-11-08T11:00:00.000Z",
      },
    ],
    content_reports: [
      { id: "report-1", status: "open" },
      { id: "report-2", status: "open" },
    ],
    user_roles: [
      { user_id: adminId, role: "admin" },
      { user_id: otherAdminId, role: "user" },
    ],
  };

  const supabase = {
    auth: {
      async getUser(token: string) {
        if (token !== "admin-token" && token !== "user-token") {
          return { data: { user: null }, error: new Error("invalid token") };
        }
        return {
          data: { user: { id: token === "admin-token" ? adminId : otherAdminId } },
          error: null,
        };
      },
    },
    from(table: string) {
      const filters: { operator: "eq" | "gte" | "lte"; column: string; value: unknown }[] = [];
      let insertion: Row | null = null;
      let cursor: { created_at: string; id: number } | null = null;
      let countOnly = false;
      let rowLimit = Number.POSITIVE_INFINITY;

      function selectedRows() {
        let selected = (rows[table] ?? []).filter((row) =>
          filters.every(({ operator, column, value }) => {
            if (operator === "eq") return row[column] === value;
            if (operator === "gte") return String(row[column]) >= String(value);
            return String(row[column]) <= String(value);
          }),
        );
        if (cursor) {
          selected = selected.filter((row) => {
            const createdAt = String(row.created_at);
            return (
              createdAt < cursor!.created_at ||
              (createdAt === cursor!.created_at && Number(row.id) < cursor!.id)
            );
          });
        }
        return selected.sort(
          (left, right) =>
            String(right.created_at).localeCompare(String(left.created_at)) ||
            Number(right.id) - Number(left.id),
        );
      }

      function execute() {
        if (insertion) {
          rows[table].push(insertion);
          return { data: null, error: null, count: null };
        }
        const selected = selectedRows().slice(0, rowLimit);
        if (countOnly) return { data: null, error: null, count: selected.length };
        return { data: selected, error: null, count: null };
      }

      const builder = {
        select(_columns?: string, options?: { count?: string; head?: boolean }) {
          countOnly = options?.head === true;
          return builder;
        },
        insert(value: Row) {
          insertion = value;
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push({ operator: "eq", column, value });
          return builder;
        },
        gte(column: string, value: unknown) {
          filters.push({ operator: "gte", column, value });
          return builder;
        },
        lte(column: string, value: unknown) {
          filters.push({ operator: "lte", column, value });
          return builder;
        },
        or(value: string) {
          const match = value.match(
            /^created_at\.lt\.([^,]+),and\(created_at\.eq\.([^,]+),id\.lt\.(\d+)\)$/,
          );
          if (match) cursor = { created_at: match[2], id: Number(match[3]) };
          return builder;
        },
        order() {
          return builder;
        },
        limit(value: number) {
          rowLimit = value;
          return builder;
        },
        then(resolve: (result: ReturnType<typeof execute>) => unknown) {
          return Promise.resolve(execute()).then(resolve);
        },
      };
      return builder;
    },
  };
  const ctx: AppContext = {
    env: testEnv,
    supabase: supabase as unknown as SupabaseClient,
    realtime: new RealtimeHub(),
  };
  return { ctx, rows, supabase };
}

describe("admin module", () => {
  it("paginates audit entries, filters by admin and reports open counts", async () => {
    const { ctx } = createAdminFixture();
    const admin = createAdminService(ctx);
    const first = await admin.listAuditLog(listAuditSchema.parse({ limit: 2 }));

    expect(first.items.map((row) => row.id)).toEqual([3, 2]);
    expect(first.next_cursor).toBeTruthy();

    const second = await admin.listAuditLog(
      listAuditSchema.parse({ limit: 2, cursor: first.next_cursor! }),
    );
    expect(second.items.map((row) => row.id)).toEqual([1]);
    expect(second.next_cursor).toBeNull();

    const filtered = await admin.listAuditLog(
      listAuditSchema.parse({ admin_id: adminId, from: "2026-11-09", to: "2026-11-09" }),
    );
    expect(filtered.items.map((row) => row.id)).toEqual([3, 2]);
    await expect(admin.getOverview()).resolves.toEqual({
      pending_role_requests: 0,
      pending_venues: 0,
      open_content_reports: 2,
      open_anti_cheat_flags: 0,
    });
  });

  it("rejects invalid date ranges and cursors", async () => {
    expect(listAuditSchema.safeParse({ from: "2026-11-10", to: "2026-11-09" }).success).toBe(false);
    const admin = createAdminService(createAdminFixture().ctx);
    await expect(admin.listAuditLog({ limit: 50, cursor: "invalid" })).rejects.toMatchObject({
      code: "INVALID_CURSOR",
    });
  });

  it("writes audit rows only for successful admin mutations on role-protected routes", async () => {
    const { ctx, rows } = createAdminFixture();
    const app = await buildApp(ctx);
    app.post("/audit-test", { preHandler: app.requireRole("coach") }, async () => ({ ok: true }));
    app.get("/audit-test-get", { preHandler: app.requireRole("coach") }, async () => ({
      ok: true,
    }));
    app.post("/audit-test-failure", { preHandler: app.requireRole("coach") }, async () => {
      throw new Error("failed mutation");
    });
    await app.ready();

    const adminResponse = await app.inject({
      method: "POST",
      url: "/audit-test",
      headers: { authorization: "Bearer admin-token" },
    });
    expect(adminResponse.statusCode).toBe(200);
    expect(rows.admin_audit_log).toHaveLength(4);
    expect(rows.admin_audit_log.at(-1)).toMatchObject({
      admin_id: adminId,
      method: "POST",
      path: "/audit-test",
    });

    const getResponse = await app.inject({
      method: "GET",
      url: "/audit-test-get",
      headers: { authorization: "Bearer admin-token" },
    });
    expect(getResponse.statusCode).toBe(200);
    expect(rows.admin_audit_log).toHaveLength(4);

    const failedResponse = await app.inject({
      method: "POST",
      url: "/audit-test-failure",
      headers: { authorization: "Bearer admin-token" },
    });
    expect(failedResponse.statusCode).toBe(500);
    expect(rows.admin_audit_log).toHaveLength(4);

    const userResponse = await app.inject({
      method: "POST",
      url: "/audit-test",
      headers: { authorization: "Bearer user-token" },
    });
    expect(userResponse.statusCode).toBe(403);
    expect(rows.admin_audit_log).toHaveLength(4);
    await app.close();
  });
});
