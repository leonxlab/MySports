import { createAccountsApi } from "../accounts";
import type { AppContext } from "../../core/context";
import { AppError, notFound } from "../../core/errors";
import type {
  CoachRequestInput,
  ListRequestsInput,
  OwnerRequestInput,
  RejectRequestInput,
  RequestStatus,
} from "./schema";
import { requestCursorSchema } from "./schema";

type RequestedRole = "coach" | "owner";

const requestColumns =
  "id, user_id, requested_role, status, evidence, note, rejection_reason, reviewed_by, reviewed_at, created_at";

function decodeCursor(cursor: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_CURSOR", "Cursor pengajuan tidak valid");
  }
  const result = requestCursorSchema.safeParse(parsed);
  if (!result.success) throw new AppError(400, "INVALID_CURSOR", "Cursor pengajuan tidak valid");
  return result.data;
}

function encodeCursor(value: { id: string; created_at: string }) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createRoleRequestsService(ctx: AppContext) {
  const supabase = ctx.supabase;
  const accounts = createAccountsApi(ctx);

  async function submit(
    userId: string,
    role: RequestedRole,
    input: CoachRequestInput | OwnerRequestInput,
  ) {
    const roles = await accounts.getRoles(userId);
    if (roles.includes(role)) {
      throw new AppError(409, "ROLE_ALREADY_GRANTED", `Role ${role} sudah dimiliki`);
    }

    if ("evidence" in input) {
      for (const item of input.evidence) {
        const [ownerId, directory, filename, ...extra] = item.value.split("/");
        if (
          (item.type === "image" || item.type === "video") &&
          (ownerId !== userId ||
            directory !== "gallery" ||
            !/^[A-Za-z0-9-]+\.(jpg|png|webp|mp4|webm)$/.test(filename ?? "") ||
            extra.length > 0)
        ) {
          throw new AppError(400, "INVALID_EVIDENCE_PATH", "Bukti media harus milik akun sendiri");
        }
      }
    }

    const { data, error } = await supabase
      .from("role_requests")
      .insert({
        user_id: userId,
        requested_role: role,
        evidence: "evidence" in input ? input.evidence : [],
        note: input.note ?? null,
      })
      .select(requestColumns)
      .single();

    if (error) {
      if ("code" in error && error.code === "23505") {
        throw new AppError(
          409,
          "PENDING_REQUEST_EXISTS",
          "Pengajuan untuk role ini masih menunggu",
        );
      }
      throw error;
    }
    return data;
  }

  async function getRequest(id: string) {
    const { data, error } = await supabase
      .from("role_requests")
      .select(requestColumns)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("ROLE_REQUEST_NOT_FOUND", "Pengajuan tidak ditemukan");
    return data;
  }

  async function transitionPending(
    id: string,
    status: Exclude<RequestStatus, "pending">,
    reviewerId: string,
    rejectionReason?: string,
  ) {
    const { data, error } = await supabase
      .from("role_requests")
      .update({
        status,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason ?? null,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select(requestColumns)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const current = await getRequest(id);
      if (current.status !== "pending") {
        throw new AppError(409, "REQUEST_ALREADY_REVIEWED", "Pengajuan sudah diproses");
      }
      throw new AppError(409, "REQUEST_CHANGED", "Pengajuan berubah; silakan coba lagi");
    }
    return data;
  }

  async function page(input: ListRequestsInput) {
    const limit = input.limit;
    let query = supabase
      .from("role_requests")
      .select(requestColumns)
      .eq("status", input.status)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);
    if (input.cursor) {
      const cursor = decodeCursor(input.cursor);
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const requests = hasMore ? rows.slice(0, limit) : rows;
    const profiles = await accounts.getProfileSummaries(requests.map((row) => row.user_id));
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const items = await Promise.all(
      requests.map(async (request) => ({
        ...request,
        evidence: await Promise.all(
          (request.evidence ?? []).map(async (item: { type: string; value: string }) => {
            if (item.type !== "image" && item.type !== "video") return item;
            const { data: signed, error: signedError } = await supabase.storage
              .from("media")
              .createSignedUrl(item.value, 3600);
            if (signedError) throw signedError;
            return { ...item, value: signed.signedUrl };
          }),
        ),
        applicant: profileById.get(request.user_id) ?? null,
      })),
    );

    return {
      items,
      next_cursor:
        hasMore && requests.length > 0 ? encodeCursor(requests[requests.length - 1]) : null,
    };
  }

  return {
    submitCoachRequest(userId: string, input: CoachRequestInput) {
      return submit(userId, "coach", input);
    },

    submitOwnerRequest(userId: string, input: OwnerRequestInput) {
      return submit(userId, "owner", input);
    },

    async listMine(userId: string) {
      const { data, error } = await supabase
        .from("role_requests")
        .select(requestColumns)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },

    listRequests(input: ListRequestsInput) {
      return page(input);
    },

    async approve(id: string, reviewerId: string) {
      const before = await getRequest(id);
      if (before.status !== "pending") {
        throw new AppError(409, "REQUEST_ALREADY_REVIEWED", "Pengajuan sudah diproses");
      }
      const updated = await transitionPending(id, "approved", reviewerId);
      try {
        const roles = await accounts.grantRole(before.user_id, before.requested_role, reviewerId);
        return { ...updated, roles };
      } catch (grantError) {
        let currentRoles;
        try {
          currentRoles = await accounts.getRoles(before.user_id);
        } catch {
          throw new AppError(
            500,
            "ROLE_GRANT_STATUS_UNKNOWN",
            "Role gagal dikonfirmasi; status pengajuan perlu diperiksa",
          );
        }
        if (currentRoles.includes(before.requested_role)) {
          return { ...updated, roles: currentRoles };
        }

        const { error: rollbackError } = await supabase
          .from("role_requests")
          .update({ status: "pending", reviewed_by: null, reviewed_at: null })
          .eq("id", id)
          .eq("status", "approved")
          .eq("reviewed_by", reviewerId);
        if (rollbackError) {
          throw new AppError(
            500,
            "ROLE_GRANT_ROLLBACK_FAILED",
            "Role gagal diberikan dan status pengajuan tidak dapat dipulihkan",
          );
        }
        throw grantError;
      }
    },

    reject(id: string, reviewerId: string, input: RejectRequestInput) {
      return transitionPending(id, "rejected", reviewerId, input.reason);
    },

    async countPending() {
      const { count, error } = await supabase
        .from("role_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  };
}

export type RoleRequestsService = ReturnType<typeof createRoleRequestsService>;
