import { describe, expect, it } from "vitest";
import type { AppContext } from "../src/core/context";
import { createRoleRequestsService } from "../src/modules/role-requests/service";

const applicantId = "11111111-1111-4111-8111-111111111111";
const reviewerId = "22222222-2222-4222-8222-222222222222";
const requestId = "33333333-3333-4333-8333-333333333333";

function createFixture() {
  const rows: Record<string, Record<string, unknown>[]> = {
    profiles: [{ id: applicantId, display_name: "Pemain", photo_path: null }],
    user_roles: [{ user_id: applicantId, role: "user" }],
    role_requests: [],
  };

  const supabase = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      let includedIds: unknown[] | null = null;
      let inserting: Record<string, unknown> | null = null;
      let updating: Record<string, unknown> | null = null;
      let deleting = false;
      let maxRows: number | null = null;
      let cursorFilter: string | null = null;
      let duplicateError: { code: string } | null = null;

      function selectedRows() {
        return rows[table].filter((row) => {
          const matchesFilters = filters.every(([column, value]) => row[column] === value);
          const matchesIds = includedIds === null || includedIds.includes(row.id);
          if (!matchesFilters || !matchesIds) return false;
          if (cursorFilter) {
            const match = cursorFilter.match(
              /^created_at\.lt\.(.*),and\(created_at\.eq\.(.*),id\.lt\.([^)]+)\)$/,
            );
            if (match) {
              const [, before, equalDate, beforeId] = match;
              return (
                String(row.created_at) < before ||
                (row.created_at === equalDate && String(row.id) < beforeId)
              );
            }
          }
          return true;
        });
      }

      function execute() {
        if (inserting) {
          if (
            table === "role_requests" &&
            rows[table].some(
              (row) =>
                row.user_id === inserting?.user_id &&
                row.requested_role === inserting?.requested_role &&
                row.status === "pending",
            )
          ) {
            duplicateError = { code: "23505" };
            return [];
          }
          rows[table].push({
            id: requestId,
            status: "pending",
            created_at: "2026-11-09T00:00:00.000Z",
            ...inserting,
          });
        }

        const selected = selectedRows();
        if (updating) {
          selected.forEach((row) => Object.assign(row, updating));
          return selected;
        }
        if (deleting) rows[table] = rows[table].filter((row) => !selected.includes(row));
        const ordered = [...selected].sort((a, b) => {
          const dateOrder = String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
          return dateOrder || String(b.id ?? "").localeCompare(String(a.id ?? ""));
        });
        return maxRows === null ? ordered : ordered.slice(0, maxRows);
      }

      const builder = {
        select() {
          return builder;
        },
        insert(values: Record<string, unknown>) {
          inserting = values;
          return builder;
        },
        update(values: Record<string, unknown>) {
          updating = values;
          return builder;
        },
        upsert(values: Record<string, unknown>) {
          if (
            !rows[table].some((row) => row.user_id === values.user_id && row.role === values.role)
          ) {
            rows[table].push(values);
          }
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
        order() {
          return builder;
        },
        limit(count: number) {
          maxRows = count;
          return builder;
        },
        or(filter: string) {
          cursorFilter = filter;
          return builder;
        },
        maybeSingle() {
          const data = execute()[0] ?? null;
          return Promise.resolve({ data, error: duplicateError });
        },
        single() {
          const data = execute()[0] ?? null;
          return Promise.resolve({ data, error: duplicateError });
        },
        then(
          resolve: (result: {
            data: Record<string, unknown>[];
            error: { code: string } | null;
          }) => unknown,
        ) {
          const data = execute();
          return Promise.resolve({ data, error: duplicateError }).then(resolve);
        },
      };

      return builder;
    },
  };
  const service = createRoleRequestsService({ supabase } as unknown as AppContext);
  return { rows, service };
}

describe("role-requests service", () => {
  it("rejects a second pending request for the same role", async () => {
    const { service } = createFixture();
    await service.submitCoachRequest(applicantId, {
      evidence: [{ type: "text", value: "Pengalaman bermain selama 5 tahun" }],
    });

    await expect(
      service.submitCoachRequest(applicantId, {
        evidence: [{ type: "text", value: "Prestasi turnamen lokal" }],
      }),
    ).rejects.toMatchObject({ status: 409, code: "PENDING_REQUEST_EXISTS" });
  });

  it("approval changes status and grants the requested role", async () => {
    const { rows, service } = createFixture();
    await service.submitCoachRequest(applicantId, {
      evidence: [{ type: "text", value: "Pengalaman bermain selama 5 tahun" }],
    });

    const result = await service.approve(requestId, reviewerId);

    expect(result.status).toBe("approved");
    expect(rows.user_roles).toContainEqual(
      expect.objectContaining({ user_id: applicantId, role: "coach" }),
    );
  });

  it("rejection records a reason without granting the role", async () => {
    const { rows, service } = createFixture();
    await service.submitOwnerRequest(applicantId, {});

    const result = await service.reject(requestId, reviewerId, { reason: "Dokumen belum lengkap" });

    expect(result.status).toBe("rejected");
    expect(result.rejection_reason).toBe("Dokumen belum lengkap");
    expect(rows.user_roles).not.toContainEqual(
      expect.objectContaining({ user_id: applicantId, role: "owner" }),
    );
  });

  it("does not grant a role a second time when an application is approved twice", async () => {
    const { rows, service } = createFixture();
    await service.submitCoachRequest(applicantId, {
      evidence: [{ type: "text", value: "Pengalaman bermain selama 5 tahun" }],
    });
    await service.approve(requestId, reviewerId);

    await expect(service.approve(requestId, reviewerId)).rejects.toMatchObject({
      status: 409,
      code: "REQUEST_ALREADY_REVIEWED",
    });
    expect(rows.user_roles.filter((row) => row.role === "coach")).toHaveLength(1);
  });

  it("paginates admin requests with a cursor", async () => {
    const { rows, service } = createFixture();
    rows.role_requests.push(
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        user_id: applicantId,
        requested_role: "coach",
        status: "pending",
        evidence: [],
        created_at: "2026-11-09T12:00:00.000Z",
      },
      {
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        user_id: applicantId,
        requested_role: "owner",
        status: "pending",
        evidence: [],
        created_at: "2026-11-08T12:00:00.000Z",
      },
    );

    const first = await service.listRequests({ status: "pending", limit: 1 });
    const second = await service.listRequests({
      status: "pending",
      limit: 1,
      cursor: first.next_cursor ?? undefined,
    });

    expect(first.items).toHaveLength(1);
    expect(first.next_cursor).toBeTruthy();
    expect(second.items).toHaveLength(1);
    expect(second.items[0].id).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(second.next_cursor).toBeNull();
  });
});
