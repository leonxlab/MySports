import { describe, expect, it } from "vitest";
import type { AppContext } from "../../core/context";
import { createFeedService } from "./service";
import { feedFiltersSchema } from "./schema";

type Row = Record<string, unknown>;

function createFeedFixture() {
  const rows: Record<string, Row[]> = {
    threads: [
      {
        id: "123e4567-e89b-12d3-a456-426614174001",
        author_id: "123e4567-e89b-12d3-a456-426614174099",
        sport: "basketball",
        title: "Basket hari ini",
        body: "Latihan bersama",
        media: [],
        created_at: "2026-11-09T10:00:00.000Z",
        hidden: false,
      },
      {
        id: "123e4567-e89b-12d3-a456-426614174002",
        author_id: "123e4567-e89b-12d3-a456-426614174099",
        sport: "padel",
        title: "Padel hari ini",
        body: "Latihan bersama",
        media: [],
        created_at: "2026-11-09T10:00:00.000Z",
        hidden: false,
      },
    ],
    thread_posts: [],
    profiles: [
      {
        id: "123e4567-e89b-12d3-a456-426614174099",
        display_name: "Pemain",
        photo_path: null,
      },
    ],
    content_classification: [],
    user_signals: [
      {
        id: "123e4567-e89b-12d3-a456-426614174003",
        user_id: "123e4567-e89b-12d3-a456-426614174099",
        kind: "join_open_play",
        sport: "padel",
        term: null,
        created_at: "2026-11-09T10:00:00.000Z",
      },
    ],
  };
  let generatedId = 20;

  const supabase = {
    from(table: string) {
      const equality: [string, unknown][] = [];
      const inclusions: [string, unknown[]][] = [];
      const sort: [string, boolean][] = [];
      let rowLimit = Number.POSITIVE_INFINITY;
      let insertion: Row | null = null;
      let upsert: Row | null = null;
      let conflict: string[] = [];

      function selected() {
        const matching = (rows[table] ?? []).filter(
          (row) =>
            equality.every(([column, value]) => row[column] === value) &&
            inclusions.every(([column, values]) => values.includes(row[column])),
        );
        matching.sort((first, second) => {
          for (const [column, ascending] of sort) {
            const firstValue = String(first[column] ?? "");
            const secondValue = String(second[column] ?? "");
            const order = firstValue.localeCompare(secondValue);
            if (order !== 0) return ascending ? order : -order;
          }
          return 0;
        });
        return matching.slice(0, rowLimit);
      }

      function execute() {
        if (insertion) {
          const created = {
            id: `123e4567-e89b-12d3-a456-4266141740${generatedId++}`,
            created_at: new Date().toISOString(),
            ...insertion,
          };
          rows[table].push(created);
          return { data: [created], error: null };
        }
        if (upsert) {
          const existing = rows[table].find((row) =>
            conflict.every((column) => row[column] === upsert?.[column]),
          );
          if (existing) Object.assign(existing, upsert);
          else rows[table].push(upsert);
          return { data: [existing ?? upsert], error: null };
        }
        return { data: selected(), error: null };
      }

      type Builder = {
        select: (_columns?: string, _options?: unknown) => Builder;
        insert: (value: Row) => Builder;
        upsert: (value: Row, options: { onConflict: string }) => Builder;
        eq: (column: string, value: unknown) => Builder;
        in: (column: string, values: unknown[]) => Builder;
        or: (_query: string) => Builder;
        order: (column: string, options: { ascending?: boolean }) => Builder;
        limit: (value: number) => Builder;
        single: () => Promise<{ data: Row | null; error: null }>;
        maybeSingle: () => Promise<{ data: Row | null; error: null }>;
        then: (resolve: (result: ReturnType<typeof execute>) => unknown) => unknown;
      };

      const builder: Builder = {
        select() {
          return builder;
        },
        insert(value) {
          insertion = value;
          return builder;
        },
        upsert(value, options) {
          upsert = value;
          conflict = options.onConflict.split(",");
          return builder;
        },
        eq(column, value) {
          equality.push([column, value]);
          return builder;
        },
        in(column, values) {
          inclusions.push([column, values]);
          return builder;
        },
        or() {
          return builder;
        },
        order(column, options) {
          sort.push([column, options.ascending ?? true]);
          return builder;
        },
        limit(value) {
          rowLimit = value;
          return builder;
        },
        async single() {
          return { data: execute().data[0] ?? null, error: null };
        },
        async maybeSingle() {
          return { data: execute().data[0] ?? null, error: null };
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
        };
      },
    },
  };
  return {
    rows,
    service: createFeedService({ supabase } as unknown as AppContext),
  };
}

describe("feed service", () => {
  it("mengklasifikasikan konten komunitas yang belum memiliki klasifikasi", async () => {
    const { rows, service } = createFeedFixture();

    const result = await service.getExplore(feedFiltersSchema.parse({}));

    expect(result.items).toHaveLength(2);
    expect(result.items.every((item) => item.content_kind === "thread")).toBe(true);
    expect(rows.content_classification).toHaveLength(2);
  });

  it("menyusun home feed menurut sinyal olahraga pengguna", async () => {
    const { service } = createFeedFixture();

    const result = await service.getHomeFeed(
      "123e4567-e89b-12d3-a456-426614174099",
      feedFiltersSchema.parse({}),
    );

    expect(result.items[0].sport).toBe("padel");
    expect(result.items[0].reasons).toContain("Olahraga padel sesuai aktivitasmu");
  });

  it("menyimpan sinyal pencarian dalam bentuk ternormalisasi", async () => {
    const { rows, service } = createFeedFixture();

    await service.recordSignal("123e4567-e89b-12d3-a456-426614174099", {
      kind: "search",
      term: "  Badminton  ",
      sport: "badminton",
    });

    expect(rows.user_signals.at(-1)?.term).toBe("badminton");
  });
});
