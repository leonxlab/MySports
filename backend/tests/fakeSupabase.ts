import { randomUUID } from "node:crypto";

/**
 * Klien Supabase tiruan di memori untuk menguji service tanpa jaringan.
 * Mendukung rangkaian yang dipakai modul: select/insert/update/upsert/delete + eq/neq/in/gte/lte/order/limit
 * + maybeSingle/single. Operasi dijalankan saat di-await, seperti klien asli.
 */
type Row = Record<string, unknown>;
type RpcHandler = (args: Record<string, unknown>) => unknown;

export function createFakeSupabase(
  initial: Record<string, Row[]> = {},
  rpcHandlers: Record<string, RpcHandler> = {},
  /** Nilai default kolom per tabel, meniru `default` di migrasi. */
  defaults: Record<string, Row> = {},
) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(initial)) tables[name] = rows.map((r) => ({ ...r }));
  const rpcCalls: { name: string; args: Record<string, unknown> }[] = [];

  function from(table: string) {
    tables[table] ??= [];
    type Op = "select" | "insert" | "update" | "upsert" | "delete";
    let op: Op = "select";
    let payload: Row | Row[] | null = null;
    let conflict: string[] = [];
    const preds: ((r: Row) => boolean)[] = [];
    let limitN: number | null = null;
    let orderBy: { col: string; asc: boolean } | null = null;
    let single: "one" | "maybe" | null = null;

    const run = (): { data: unknown; error: unknown } => {
      const rows = tables[table]!;
      const matches = () => rows.filter((r) => preds.every((p) => p(r)));
      let result: Row[] = [];
      if (op === "insert") {
        const items = Array.isArray(payload) ? payload : [payload!];
        result = items.map((i) => ({ id: randomUUID(), ...defaults[table], ...i }));
        rows.push(...result);
      } else if (op === "upsert") {
        const items = Array.isArray(payload) ? payload : [payload!];
        for (const i of items) {
          const found = rows.find((r) => conflict.length > 0 && conflict.every((c) => r[c] === i[c]));
          if (found) {
            Object.assign(found, i);
            result.push(found);
          } else {
            const row = { id: randomUUID(), ...defaults[table], ...i };
            rows.push(row);
            result.push(row);
          }
        }
      } else if (op === "update") {
        result = matches();
        for (const r of result) Object.assign(r, payload);
      } else if (op === "delete") {
        result = matches();
        tables[table] = rows.filter((r) => !result.includes(r));
      } else {
        result = matches();
      }
      if (orderBy) {
        const { col, asc } = orderBy;
        result = [...result].sort((a, b) => ((a[col] as number) > (b[col] as number) ? 1 : -1) * (asc ? 1 : -1));
      }
      if (limitN !== null) result = result.slice(0, limitN);
      if (single === "one") {
        return result.length === 1
          ? { data: result[0], error: null }
          : { data: null, error: { code: "PGRST116", message: "expected one row" } };
      }
      if (single === "maybe") return { data: result[0] ?? null, error: null };
      return { data: result, error: null };
    };

    const builder: any = {
      select: () => builder,
      insert: (v: Row | Row[]) => ((op = "insert"), (payload = v), builder),
      update: (v: Row) => ((op = "update"), (payload = v), builder),
      upsert: (v: Row | Row[], o?: { onConflict?: string }) => (
        (op = "upsert"), (payload = v), (conflict = o?.onConflict?.split(",") ?? []), builder
      ),
      delete: () => ((op = "delete"), builder),
      eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), builder),
      neq: (c: string, v: unknown) => (preds.push((r) => r[c] !== v), builder),
      in: (c: string, v: unknown[]) => (preds.push((r) => v.includes(r[c])), builder),
      gte: (c: string, v: unknown) => (preds.push((r) => (r[c] as string) >= (v as string)), builder),
      lte: (c: string, v: unknown) => (preds.push((r) => (r[c] as string) <= (v as string)), builder),
      order: (col: string, o?: { ascending?: boolean }) => ((orderBy = { col, asc: o?.ascending ?? true }), builder),
      limit: (n: number) => ((limitN = n), builder),
      maybeSingle: () => ((single = "maybe"), builder),
      single: () => ((single = "one"), builder),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(run()).then(resolve, reject),
    };
    return builder;
  }

  const db = {
    from,
    rpc(name: string, args: Record<string, unknown> = {}) {
      rpcCalls.push({ name, args });
      const handler = rpcHandlers[name];
      if (!handler) return Promise.resolve({ data: null, error: { message: `rpc ${name} tidak ada` } });
      try {
        return Promise.resolve({ data: handler(args), error: null });
      } catch (e) {
        return Promise.resolve({ data: null, error: { message: (e as Error).message } });
      }
    },
  };
  return { db, tables, rpcCalls };
}
