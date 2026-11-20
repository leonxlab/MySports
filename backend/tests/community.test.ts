import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildApp } from "../src/app";
import type { AppContext } from "../src/core/context";
import { RealtimeHub } from "../src/core/realtime";
import { createCommunityService } from "../src/modules/community/service";
import { createThreadSchema, signMediaSchema } from "../src/modules/community/schema";
import { testEnv } from "./helpers";

type Row = Record<string, unknown>;

function createCommunityFixture() {
  const rows: Record<string, Row[]> = {
    threads: [
      {
        id: "123e4567-e89b-12d3-a456-426614174001",
        author_id: "123e4567-e89b-12d3-a456-426614174099",
        sport: "basketball",
        title: "Thread terlihat",
        body: "Cerita",
        media: [],
        created_at: "2026-11-09T08:00:00.000Z",
        hidden: false,
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174002",
        author_id: "123e4567-e89b-12d3-a456-426614174099",
        sport: "basketball",
        title: "Thread tersembunyi",
        body: null,
        media: [],
        created_at: "2026-11-09T07:00:00.000Z",
        hidden: true,
      },
    ],
    thread_posts: [],
    content_reports: [],
    profiles: [
      {
        id: "123e4567-e89b-12d3-a456-426614174099",
        display_name: "Pemain",
        photo_path: null,
      },
    ],
  };
  let nextId = 10;

  const supabase = {
    from(table: string) {
      const filters: { operator: "eq" | "gte" | "in"; column: string; value: unknown }[] = [];
      let insertion: Row | null = null;
      let update: Row | null = null;
      let countOnly = false;
      let rowLimit = Number.POSITIVE_INFINITY;

      function selectedRows() {
        return (rows[table] ?? []).filter((row) =>
          filters.every(({ operator, column, value }) => {
            if (operator === "eq") return row[column] === value;
            if (operator === "in") return Array.isArray(value) && value.includes(row[column]);
            return String(row[column]) >= String(value);
          }),
        );
      }

      function execute() {
        if (insertion) {
          if (
            table === "content_reports" &&
            rows[table].some(
              (row) =>
                row.reporter_id === insertion?.reporter_id &&
                row.target_type === insertion?.target_type &&
                row.target_id === insertion?.target_id,
            )
          ) {
            return { data: null, error: { code: "23505" }, count: null };
          }
          const inserted = {
            id: `123e4567-e89b-12d3-a456-4266141740${nextId++}`,
            created_at: new Date().toISOString(),
            hidden: false,
            media: [],
            ...insertion,
          };
          rows[table].push(inserted);
          return { data: inserted, error: null, count: null };
        }

        const selected = selectedRows().slice(0, rowLimit);
        if (update) selected.forEach((row) => Object.assign(row, update));
        if (countOnly) return { data: null, error: null, count: selected.length };
        return { data: selected, error: null, count: null };
      }

      const builder: {
        select: (columns?: string, options?: { count?: string; head?: boolean }) => typeof builder;
        insert: (value: Row) => typeof builder;
        update: (value: Row) => typeof builder;
        eq: (column: string, value: unknown) => typeof builder;
        gte: (column: string, value: unknown) => typeof builder;
        in: (column: string, value: unknown[]) => typeof builder;
        or: (_query: string) => typeof builder;
        order: (_column: string, _options?: unknown) => typeof builder;
        limit: (value: number) => typeof builder;
        single: () => Promise<{ data: Row | null; error: { code?: string } | null }>;
        maybeSingle: () => Promise<{ data: Row | null; error: { code?: string } | null }>;
        then: (resolve: (result: ReturnType<typeof execute>) => unknown) => unknown;
      } = {
        select(_columns, options) {
          countOnly = options?.head === true;
          return builder;
        },
        insert(value) {
          insertion = value;
          return builder;
        },
        update(value) {
          update = value;
          return builder;
        },
        eq(column, value) {
          filters.push({ operator: "eq", column, value });
          return builder;
        },
        gte(column, value) {
          filters.push({ operator: "gte", column, value });
          return builder;
        },
        in(column, value) {
          filters.push({ operator: "in", column, value });
          return builder;
        },
        or() {
          return builder;
        },
        order() {
          return builder;
        },
        limit(value) {
          rowLimit = value;
          return builder;
        },
        async single() {
          const result = execute();
          return {
            data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
            error: result.error,
          };
        },
        async maybeSingle() {
          const result = execute();
          return {
            data: Array.isArray(result.data) ? (result.data[0] ?? null) : result.data,
            error: result.error,
          };
        },
        then(resolve) {
          return Promise.resolve(execute()).then(resolve);
        },
      };
      return builder;
    },
    storage: {
      from() {
        return {
          createSignedUrl(path: string) {
            return Promise.resolve({
              data: { signedUrl: `https://storage.example/${path}` },
              error: null,
            });
          },
          createSignedUploadUrl(path: string) {
            return Promise.resolve({
              data: {
                path,
                token: "upload-token",
                signedUrl: `https://storage.example/upload/${path}`,
              },
              error: null,
            });
          },
        };
      },
    },
  };

  return {
    rows,
    supabase,
    service: createCommunityService({ supabase } as unknown as AppContext),
  };
}

describe("community service", () => {
  it("mengizinkan pembacaan thread melalui endpoint publik tanpa token", async () => {
    const { supabase } = createCommunityFixture();
    const app = await buildApp({
      env: testEnv,
      supabase: supabase as unknown as SupabaseClient,
      realtime: new RealtimeHub(),
    });

    try {
      const response = await app.inject({ method: "GET", url: "/api/v1/community/threads" });
      expect(response.statusCode).toBe(200);
      expect(response.json().items).toHaveLength(1);
    } finally {
      await app.close();
    }
  });

  it("membaca thread publik tanpa menampilkan konten tersembunyi", async () => {
    const { service } = createCommunityFixture();
    const page = await service.listThreads({ limit: 25 });

    expect(page.items.map((thread) => thread.title)).toEqual(["Thread terlihat"]);
    await expect(service.getThread("123e4567-e89b-12d3-a456-426614174002")).rejects.toMatchObject({
      status: 404,
      code: "THREAD_NOT_FOUND",
    });
  });

  it("menolak laporan kedua dari pengguna yang sama pada target yang sama", async () => {
    const { service } = createCommunityFixture();
    const report = {
      target_type: "thread" as const,
      target_id: "123e4567-e89b-12d3-a456-426614174001",
      reason: "Konten tidak sesuai",
    };

    await service.createReport("123e4567-e89b-12d3-a456-426614174099", report);
    await expect(
      service.createReport("123e4567-e89b-12d3-a456-426614174099", report),
    ).rejects.toMatchObject({ status: 409, code: "DUPLICATE_REPORT" });
  });

  it("memvalidasi jumlah media, format file, dan batas ukuran 50 MB", () => {
    const media = Array.from({ length: 11 }, (_, index) => ({
      type: "image" as const,
      path: `user/community/${index}.jpg`,
    }));

    expect(
      createThreadSchema.safeParse({
        sport: "basketball",
        title: "Test",
        media,
      }).success,
    ).toBe(false);
    expect(
      signMediaSchema.safeParse({
        file_name: "clip.mp4",
        content_type: "video/mp4",
        file_size: 50 * 1024 * 1024,
      }).success,
    ).toBe(true);
    expect(
      signMediaSchema.safeParse({
        file_name: "clip.mp4",
        content_type: "video/mp4",
        file_size: 50 * 1024 * 1024 + 1,
      }).success,
    ).toBe(false);
  });

  it("menolak media yang tidak dimiliki pengguna", async () => {
    const { service } = createCommunityFixture();

    await expect(
      service.createThread("123e4567-e89b-12d3-a456-426614174099", {
        sport: "basketball",
        title: "Test",
        media: [
          { type: "image", path: "other-user/community/123e4567-e89b-12d3-a456-426614174000.jpg" },
        ],
      }),
    ).rejects.toMatchObject({ status: 400, code: "INVALID_MEDIA_PATH" });
  });
});
