import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../core/context";
import { AppError } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createFakeSupabase } from "../../../tests/fakeSupabase";
import { createOpenPlayService, type Dependencies } from "./service";

const START = "2026-11-10T08:00:00Z";
const END = "2026-11-10T10:00:00Z";
const coach: AuthUser = { id: "coach", roles: ["user", "coach"] };

function setup(opts: { price?: number; bookings?: Record<string, unknown>[]; rpc?: Record<string, (a: Record<string, unknown>) => unknown> } = {}) {
  const fake = createFakeSupabase(
    {
      open_plays: [
        {
          id: "op1",
          coach_id: "coach",
          court_id: "court1",
          sport: "badminton",
          starts_at: START,
          ends_at: END,
          quota: 4,
          price: opts.price ?? 50_000,
          status: "open",
        },
      ],
      open_play_participants: [],
      court_bookings: opts.bookings ?? [
        { court_id: "court1", booked_by: "coach", starts_at: "2026-11-10T07:00:00Z", ends_at: "2026-11-10T11:00:00Z", status: "confirmed" },
      ],
      payments: [],
    },
    opts.rpc ?? {
      open_play_join: () => null,
      open_play_leave: () => null,
      open_play_confirm: () => "confirmed",
    },
  );

  const court = {
    id: "court1",
    venueId: "v1",
    sport: "badminton" as const,
    name: "Court A",
    pricePerHour: 50_000,
    active: true,
    venue: { id: "v1", ownerId: "owner", name: "GOR", status: "approved" as const, lat: 0, lng: 0 },
  };
  const handlers: ((p: { targetId: string; payerId: string; paymentId: string }) => Promise<void>)[] = [];
  const deps = {
    venues: {
      getCourt: vi.fn(async () => court),
      search: vi.fn(async () => []),
    },
    payments: {
      createCheckout: vi.fn(async () => ({ paymentId: "pay1", status: "pending" as const, chargeAmount: 52_500, redirectUrl: null })),
      onPaid: vi.fn((_t: string, h: (typeof handlers)[number]) => void handlers.push(h)),
      settle: vi.fn(async () => {}),
    },
    accounts: {
      getProfileSummaries: vi.fn(async (ids: string[]) =>
        ids.map((id) => ({ id, display_name: id, photo_path: null, level: 0 })),
      ),
      getPublicProfile: vi.fn(),
    },
  };
  const ctx = { supabase: fake.db, env: {} } as unknown as AppContext;
  const service = createOpenPlayService(ctx, deps as unknown as Dependencies);
  return { fake, deps, service, handlers, ctx };
}

const createInput = { courtId: "court1", startsAt: START, endsAt: END, quota: 8, price: 40_000 };

describe("create", () => {
  it("berhasil bila Coach punya booking terkonfirmasi yang menutup jam", async () => {
    const { service, fake } = setup();
    fake.tables.open_plays = [];
    const v = await service.create(coach, createInput);
    expect(v).toMatchObject({ sport: "badminton", quota: 8, price: 40_000, courtName: "Court A", confirmed: 0 });
    expect(fake.tables.open_plays![0]).toMatchObject({ coach_id: "coach", court_id: "court1" });
  });

  it("menolak tanpa booking (COURT_NOT_BOOKED)", async () => {
    const { service, fake } = setup({ bookings: [] });
    fake.tables.open_plays = [];
    await expect(service.create(coach, createInput)).rejects.toMatchObject({ status: 409, code: "COURT_NOT_BOOKED" });
    expect(fake.tables.open_plays).toHaveLength(0);
  });

  it("booking yang belum confirmed atau milik orang lain tidak dihitung", async () => {
    const base = { court_id: "court1", starts_at: "2026-11-10T07:00:00Z", ends_at: "2026-11-10T11:00:00Z" };
    for (const b of [
      { ...base, booked_by: "coach", status: "pending" },
      { ...base, booked_by: "lain", status: "confirmed" },
    ]) {
      const { service, fake } = setup({ bookings: [b] });
      fake.tables.open_plays = [];
      await expect(service.create(coach, createInput)).rejects.toMatchObject({ code: "COURT_NOT_BOOKED" });
    }
  });

  it("menolak jam di luar booking", async () => {
    const { service, fake } = setup();
    fake.tables.open_plays = [];
    await expect(
      service.create(coach, { ...createInput, endsAt: "2026-11-10T12:00:00Z" }),
    ).rejects.toMatchObject({ code: "COURT_NOT_BOOKED" });
  });

  it("menolak open play yang bertabrakan di court yang sama", async () => {
    const { service } = setup();
    await expect(service.create(coach, createInput)).rejects.toMatchObject({ code: "OPEN_PLAY_OVERLAP" });
  });
});

describe("join dan leave", () => {
  it("berbayar: kursi ditahan lalu checkout dibuat", async () => {
    const { service, deps, fake } = setup();
    const r = await service.join("player", "op1");
    expect(r.status).toBe("pending_payment");
    expect(r.checkout?.chargeAmount).toBe(52_500);
    expect(deps.payments.createCheckout).toHaveBeenCalledWith({ payerId: "player", targetType: "open_play", targetId: "op1" });
    expect(fake.rpcCalls.map((c) => c.name)).toEqual(["open_play_join"]);
  });

  it("gratis: langsung terkonfirmasi tanpa checkout", async () => {
    const { service, deps, fake } = setup({ price: 0 });
    const r = await service.join("player", "op1");
    expect(r).toEqual({ status: "confirmed", checkout: null });
    expect(deps.payments.createCheckout).not.toHaveBeenCalled();
    expect(fake.rpcCalls.map((c) => c.name)).toEqual(["open_play_join", "open_play_confirm"]);
  });

  it("checkout gagal: kursi dilepas lagi", async () => {
    const { service, deps, fake } = setup();
    deps.payments.createCheckout.mockRejectedValueOnce(new AppError(503, "PAYMENT_PROVIDER_NOT_CONFIGURED", "x"));
    await expect(service.join("player", "op1")).rejects.toMatchObject({ status: 503 });
    expect(fake.rpcCalls.map((c) => c.name)).toEqual(["open_play_join", "open_play_leave"]);
  });

  it.each([
    ["OPEN_PLAY_FULL", 409, "OPEN_PLAY_FULL"],
    ["ALREADY_JOINED", 409, "ALREADY_JOINED"],
    ["OPEN_PLAY_CLOSED", 409, "OPEN_PLAY_CLOSED"],
    ["IS_COACH", 400, "IS_COACH"],
  ])("error database %s dipetakan ke %i %s", async (msg, status, code) => {
    const { service, deps } = setup({
      rpc: {
        open_play_join: () => {
          throw new Error(msg);
        },
      },
    });
    await expect(service.join("player", "op1")).rejects.toMatchObject({ status, code });
    expect(deps.payments.createCheckout).not.toHaveBeenCalled();
  });

  it("batal setelah membayar ditolak sampai kebijakan refund diputuskan", async () => {
    const { service } = setup({
      rpc: {
        open_play_leave: () => {
          throw new Error("CANCEL_NOT_ALLOWED");
        },
      },
    });
    await expect(service.leave("player", "op1")).rejects.toMatchObject({ status: 409, code: "REFUND_POLICY_UNDECIDED" });
  });

  it("join open play yang tidak ada menjawab 404", async () => {
    const { service } = setup();
    await expect(service.join("player", "tidak-ada")).rejects.toMatchObject({ status: 404 });
  });
});

describe("onPaid", () => {
  it("pembayaran lunas mengonfirmasi peserta lewat fungsi atomik", async () => {
    const { handlers, fake } = setup();
    expect(handlers).toHaveLength(1);
    await handlers[0]!({ targetId: "op1", payerId: "player", paymentId: "pay1" });
    expect(fake.rpcCalls).toContainEqual({
      name: "open_play_confirm",
      args: { p_open_play: "op1", p_user: "player", p_payment: "pay1" },
    });
  });

  it("handler didaftarkan sekali per konteks walau service dibuat berulang", () => {
    const { deps, ctx } = setup();
    createOpenPlayService(ctx, deps as unknown as Dependencies);
    createOpenPlayService(ctx, deps as unknown as Dependencies);
    expect(deps.payments.onPaid).toHaveBeenCalledTimes(1);
  });

  it("kursi habis saat lunas tidak melempar error (ditandai untuk refund)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { handlers } = setup({ rpc: { open_play_confirm: () => "no_seat" } });
    await expect(handlers[0]!({ targetId: "op1", payerId: "p", paymentId: "x" })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("update", () => {
  it("kuota tidak boleh di bawah peserta yang memegang kursi", async () => {
    const { service, fake } = setup();
    fake.tables.open_play_participants!.push(
      { open_play_id: "op1", user_id: "a", status: "confirmed" },
      { open_play_id: "op1", user_id: "b", status: "pending_payment" },
      { open_play_id: "op1", user_id: "c", status: "cancelled" },
    );
    await expect(service.update(coach, "op1", { quota: 1 })).rejects.toMatchObject({ code: "QUOTA_TOO_LOW" });
    expect((await service.update(coach, "op1", { quota: 2 })).quota).toBe(2);
  });

  it("hanya pemilik (atau admin) yang boleh mengubah", async () => {
    const { service } = setup();
    const other: AuthUser = { id: "lain", roles: ["user", "coach"] };
    await expect(service.update(other, "op1", { price: 1 })).rejects.toMatchObject({ status: 403 });
    const admin: AuthUser = { id: "adm", roles: ["user", "admin"] };
    expect((await service.update(admin, "op1", { price: 1 })).price).toBe(1);
  });

  it("membatalkan open play yang sudah ada peserta berbayar ditolak", async () => {
    const { service, fake } = setup();
    fake.tables.open_play_participants!.push({ open_play_id: "op1", user_id: "a", status: "confirmed" });
    await expect(service.update(coach, "op1", { status: "cancelled" })).rejects.toMatchObject({
      code: "REFUND_POLICY_UNDECIDED",
    });
  });

  it("status akhir tidak bisa dibuka lagi", async () => {
    const { service, fake } = setup();
    fake.tables.open_plays![0]!.status = "finished";
    await expect(service.update(coach, "op1", { status: "open" })).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("selesai: semua pembayaran lunas diteruskan ke Coach", async () => {
    const { service, deps, fake } = setup();
    fake.tables.payments!.push(
      { id: "p1", target_type: "open_play", target_id: "op1", status: "paid" },
      { id: "p2", target_type: "open_play", target_id: "op1", status: "paid" },
      { id: "p3", target_type: "open_play", target_id: "op1", status: "pending" },
      { id: "p4", target_type: "open_play", target_id: "lain", status: "paid" },
    );
    const v = await service.update(coach, "op1", { status: "finished" });
    expect(v.status).toBe("finished");
    expect((deps.payments.settle.mock.calls as unknown as string[][]).map((c) => c[0]).sort()).toEqual(["p1", "p2"]);
  });

  it("jam baru harus tetap tertutup booking", async () => {
    const { service } = setup();
    await expect(service.update(coach, "op1", { endsAt: "2026-11-10T13:00:00Z" })).rejects.toMatchObject({
      code: "COURT_NOT_BOOKED",
    });
  });
});

describe("daftar dan peserta", () => {
  it("listParticipants hanya peserta terkonfirmasi dan hanya untuk pemilik", async () => {
    const { service, fake } = setup();
    fake.tables.open_play_participants!.push(
      { open_play_id: "op1", user_id: "a", status: "confirmed", joined_at: "2026-01-01" },
      { open_play_id: "op1", user_id: "b", status: "pending_payment", joined_at: "2026-01-02" },
    );
    const list = await service.listParticipants(coach, "op1");
    expect(list.map((p) => p.id)).toEqual(["a"]);
    await expect(
      service.listParticipants({ id: "lain", roles: ["user", "coach"] }, "op1"),
    ).rejects.toMatchObject({ status: 403 });
    expect(await service.listConfirmedParticipants("op1")).toEqual(["a"]);
  });

  it("listNearby tanpa lokasi mengembalikan open play mendatang", async () => {
    const { service, fake } = setup();
    fake.tables.open_plays![0]!.ends_at = "2999-01-01T00:00:00Z";
    expect(await service.listNearby({ radiusKm: 10 })).toHaveLength(1);
  });

  it("listNearby dengan lokasi tanpa lapangan di sekitar mengembalikan daftar kosong", async () => {
    const { service } = setup();
    expect(await service.listNearby({ lat: 0, lng: 0, radiusKm: 5 })).toEqual([]);
  });
});
