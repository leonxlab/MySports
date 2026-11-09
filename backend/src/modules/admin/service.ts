import type { AppContext } from "../../core/context";
import { AppError } from "../../core/errors";
import { createCommunityApi } from "../community";
import { auditCursorSchema, type ListAuditInput } from "./schema";

type AuditCursor = { created_at: string; id: string };

function encodeCursor(cursor: AuditCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value?: string): AuditCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const result = auditCursorSchema.safeParse(parsed);
    if (!result.success) throw new Error("invalid cursor");
    return result.data;
  } catch {
    throw new AppError(400, "INVALID_CURSOR", "Cursor audit tidak valid");
  }
}

export function createAdminService(ctx: AppContext) {
  const { supabase } = ctx;
  const community = createCommunityApi(ctx);

  return {
    async getOverview() {
      const openReports = await community.countOpenReports();
      return {
        pending_role_requests: 0, // TODO(integration): role-requests API belum tersedia.
        pending_venues: 0, // TODO(integration): venues API belum tersedia.
        open_content_reports: openReports,
        open_anti_cheat_flags: 0, // TODO(integration): level API belum menyediakan countOpenFlags.
      };
    },

    async listAuditLog(input: ListAuditInput) {
      const cursor = decodeCursor(input.cursor);
      let query = supabase
        .from("admin_audit_log")
        .select("id, admin_id, method, path, target, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(input.limit + 1);
      if (input.admin_id) query = query.eq("admin_id", input.admin_id);
      if (input.from) query = query.gte("created_at", `${input.from}T00:00:00.000Z`);
      if (input.to) query = query.lte("created_at", `${input.to}T23:59:59.999Z`);
      if (cursor) {
        query = query.or(
          `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const hasMore = rows.length > input.limit;
      const items = rows.slice(0, input.limit);
      const last = items.at(-1);
      return {
        items,
        next_cursor:
          hasMore && last
            ? encodeCursor({ created_at: last.created_at, id: String(last.id) })
            : null,
      };
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
