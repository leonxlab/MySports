import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../core/context";
import { AppError } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createFakeSupabase } from "../../../tests/fakeSupabase";
import { createMatchService } from "./service";

const coach: AuthUser = { id: "coach", roles: ["user", "coach"] };
const other: AuthUser = { id: "other", roles: ["user", "coach"] };
const admin: AuthUser = { id: "adm", roles: ["user", "admin"] };

function setup(initial: Record<string, Record<string, unknown>[]> = {}) {
  const fake = createFakeSupabase(
    {
      matches: [],
      open_plays: [{ id: "op1", coach_id: "coach" }],
      ...initial,
    },
    {},
    { matches: { status: "scheduled", elapsed_seconds: 0, settings: {}, runtime: {}, started_at: null, finished_at: null } },
  );
  const publish = vi.fn();
  const ctx = { supabase: fake.db, realtime: { publish, subscribe: vi.fn() } } as unknown as AppContext;
  const bracket = {
    getBracketMatch: vi.fn(async (id: string) => {
      if (id === "missing") throw new AppError(404, "BRACKET_MATCH_NOT_FOUND", "x");
      return { id, bracketId: "b1", openPlayId: "op1", sport: "badminton" as const, round: 1, court: 1, home: ["a"], away: ["b"] };
    }),
  };
  const svc = createMatchService(ctx, { bracket });
  return { svc, fake, publish, bracket };
}

const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: AppError) => e.code ?? e.message,
  );

describe("create", () => {
  it("manual: memakai nilai bawaan cabang dan menimpa sebagian", async () => {
    const { svc } = setup();
    const m = await svc.create(coach, { sport: "basketball", settings: { durationMinutes: 30, timeout: { count: 4 } } });
    expect(m).toMatchObject({ status: "scheduled", sport: "basketball", createdBy: "coach", elapsedSeconds: 0 });
    expect(m.settings.durationMinutes).toBe(30);
    expect(m.settings.timeout).toEqual({ count: 4, seconds: svc.defaults("basketball").timeout.seconds });
    expect(m.timeoutsLeft).toBe(4);
  });

  it("dari bracket match: cabang diambil dari bracket, pemilik open play dicek", async () => {
    const { svc } = setup();
    const m = await svc.create(coach, { bracketMatchId: "bm1" });
    expect(m).toMatchObject({ sport: "badminton", bracketMatchId: "bm1" });
    expect(await code(svc.create(other, { bracketMatchId: "bm2" }))).toBe("FORBIDDEN");
    expect((await svc.create(admin, { bracketMatchId: "bm3" })).createdBy).toBe("adm");
  });

  it("menolak cabang yang tidak cocok dan match ganda untuk satu bracket match", async () => {
    const { svc } = setup();
    expect(await code(svc.create(coach, { sport: "tennis", bracketMatchId: "bm1" }))).toBe("MATCH_SPORT_MISMATCH");
    await svc.create(coach, { bracketMatchId: "bm1" });
    expect(await code(svc.create(coach, { bracketMatchId: "bm1" }))).toBe("MATCH_ALREADY_EXISTS");
  });

  it("bracket match tidak ada diteruskan sebagai 404", async () => {
    const { svc } = setup();
    expect(await code(svc.create(coach, { bracketMatchId: "missing" }))).toBe("BRACKET_MATCH_NOT_FOUND");
  });
});

describe("kontrol match", () => {
  it("alur mulai, pause, lanjut, selesai dan menyiarkan setiap perubahan", async () => {
    const { svc, publish } = setup();
    const { id } = await svc.create(coach, { sport: "futsal" });
    expect((await svc.start(coach, id)).status).toBe("running");
    expect((await svc.pause(coach, id)).status).toBe("paused");
    expect((await svc.resume(coach, id)).status).toBe("running");
    const done = await svc.finish(coach, id);
    expect(done.status).toBe("finished");
    expect(done.finishedAt).not.toBeNull();
    expect(publish).toHaveBeenCalledTimes(4);
    expect(publish).toHaveBeenLastCalledWith(`match:${id}`, { type: "match", match: expect.objectContaining({ status: "finished" }) });
  });

  it("transisi tidak sah menjadi 409", async () => {
    const { svc } = setup();
    const { id } = await svc.create(coach, { sport: "futsal" });
    expect(await code(svc.pause(coach, id))).toBe("MATCH_INVALID_TRANSITION");
    await svc.start(coach, id);
    expect(await code(svc.start(coach, id))).toBe("MATCH_INVALID_TRANSITION");
  });

  it("jatah time out dan hydration berkurang lalu habis", async () => {
    const { svc } = setup();
    const { id } = await svc.create(coach, { sport: "futsal" }); // 1 timeout, 1 hydration
    await svc.start(coach, id);
    const t = await svc.timeout(coach, id);
    expect(t).toMatchObject({ status: "paused", pauseReason: "timeout", timeoutsLeft: 0, hydrationLeft: 1 });
    await svc.resume(coach, id);
    expect(await code(svc.timeout(coach, id))).toBe("MATCH_NO_TIMEOUT_LEFT");
    const h = await svc.hydration(coach, id);
    expect(h).toMatchObject({ pauseReason: "hydration", hydrationLeft: 0 });
  });

  it("hanya pembuat match atau admin yang boleh mengontrol", async () => {
    const { svc } = setup();
    const { id } = await svc.create(coach, { sport: "futsal" });
    expect(await code(svc.start(other, id))).toBe("FORBIDDEN");
    expect((await svc.start(admin, id)).status).toBe("running");
  });

  it("match tidak ada menjadi 404", async () => {
    const { svc } = setup();
    expect(await code(svc.start(coach, "nope"))).toBe("MATCH_NOT_FOUND");
    expect(await code(svc.get("nope"))).toBe("MATCH_NOT_FOUND");
  });

  it("aksi serentak: hanya satu yang lolos karena update bersyarat pada status", async () => {
    const { svc, fake } = setup();
    const { id } = await svc.create(coach, { sport: "futsal" });
    await svc.start(coach, id);
    // Dua permintaan membaca status 'running' lebih dulu, lalu menulis bersamaan.
    const results = await Promise.all([svc.timeout(coach, id), svc.timeout(coach, id)].map(code));
    expect(results.filter((r) => r === "ok")).toHaveLength(1);
    expect((fake.tables.matches![0]!.runtime as { timeoutsUsed: number }).timeoutsUsed).toBe(1);
  });
});

describe("timer dari server", () => {
  it("get menghitung elapsed dari waktu lanjut terakhir", async () => {
    const t0 = new Date("2026-11-10T08:00:00Z");
    vi.useFakeTimers();
    try {
      vi.setSystemTime(t0);
      const { svc } = setup();
      const { id } = await svc.create(coach, { sport: "futsal" });
      await svc.start(coach, id);
      vi.setSystemTime(new Date(t0.getTime() + 75_000));
      const v = await svc.get(id);
      expect(v.elapsedSeconds).toBe(75);
      expect(v.serverTime).toBe("2026-11-10T08:01:15.000Z");
      vi.setSystemTime(new Date(t0.getTime() + 100_000));
      const p = await svc.pause(coach, id);
      expect(p.elapsedSeconds).toBe(100);
      vi.setSystemTime(new Date(t0.getTime() + 999_000));
      expect((await svc.get(id)).elapsedSeconds).toBe(100);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("edit setting", () => {
  it("boleh sebelum mulai, digabung dengan setting yang ada", async () => {
    const { svc } = setup();
    const { id } = await svc.create(coach, { sport: "badminton", settings: { durationMinutes: 25 } });
    const v = await svc.updateSettings(coach, id, { breakMinutes: 2, hydration: { seconds: 30 } });
    expect(v.settings).toMatchObject({ durationMinutes: 25, breakMinutes: 2 });
    expect(v.settings.hydration).toEqual({ count: 1, seconds: 30 });
  });

  it("ditolak setelah mulai dan oleh bukan pemilik", async () => {
    const { svc } = setup();
    const { id } = await svc.create(coach, { sport: "badminton" });
    expect(await code(svc.updateSettings(other, id, { breakMinutes: 1 }))).toBe("FORBIDDEN");
    await svc.start(coach, id);
    expect(await code(svc.updateSettings(coach, id, { breakMinutes: 1 }))).toBe("MATCH_ALREADY_STARTED");
  });
});

describe("getMatchSettings (untuk scoring)", () => {
  it("mengembalikan ringkasan dengan setting lengkap", async () => {
    const { svc } = setup();
    const { id } = await svc.create(coach, { sport: "tennis", settings: { rules: { bestOf: 3 } } });
    const s = await svc.getMatchSettings(id);
    expect(s).toMatchObject({ id, sport: "tennis", status: "scheduled", createdBy: "coach" });
    expect(s.settings.rules).toEqual({ bestOf: 3 });
    expect(s.settings.durationMinutes).toBeGreaterThan(0);
  });
});
