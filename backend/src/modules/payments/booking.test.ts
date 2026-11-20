import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../core/context";
import { AppError } from "../../core/errors";
import { createFakeSupabase } from "../../../tests/fakeSupabase";
import { FAKE_SIGNATURE_HEADER, FakeGateway, signFake } from "./gateway";
import { bookingPrice, createPaymentsService, type VenuesPort } from "./service";

const SECRET = "s";
const START = "2026-11-10T08:00:00Z";
const END = "2026-11-10T10:00:00Z";

function setup(opts: { slotsFree?: boolean; court?: Partial<{ active: boolean; status: string; ownerId: string }> } = {}) {
  const venues = {
    getCourt: vi.fn(async () => ({
      id: "court1",
      venueId: "v1",
      sport: "badminton" as const,
      name: "Court A",
      pricePerHour: 50_000,
      active: opts.court?.active ?? true,
      venue: {
        id: "v1",
        ownerId: opts.court?.ownerId ?? "owner",
        name: "GOR",
        status: (opts.court?.status ?? "approved") as "approved",
        lat: 0,
        lng: 0,
      },
    })),
    findFreeSlots: vi.fn(async () =>
      opts.slotsFree === false
        ? null
        : [
            { id: "s1", startsAt: START, endsAt: "2026-11-10T09:00:00Z", status: "free" as const },
            { id: "s2", startsAt: "2026-11-10T09:00:00Z", endsAt: END, status: "free" as const },
          ],
    ),
    markSlotBooked: vi.fn(async () => {}),
    releaseSlot: vi.fn(async () => {}),
    releaseRange: vi.fn(async () => {}),
  } satisfies VenuesPort;

  const fake = createFakeSupabase(
    {
      fee_settings: [{ id: 1, model: "payer_fee", percent: 10 }],
      court_bookings: [],
      payments: [],
      wallets: [],
      wallet_entries: [],
    },
    {
      payments_settle: (a) => {
        const row = fake.tables.payments!.find((p) => p.id === a.p_payment_id)!;
        if (row.status !== "paid") throw new Error("PAYMENT_NOT_PAID");
        row.status = "settled";
        fake.tables.wallets!.push({ user_id: a.p_payee, balance: a.p_credit });
        return null;
      },
    },
    { payments: { status: "pending" }, court_bookings: { status: "pending" } },
  );
  const ctx = { supabase: fake.db, env: {} } as unknown as AppContext;
  const service = createPaymentsService(ctx, { gateway: new FakeGateway(SECRET), venues });
  const webhook = (body: object) => {
    const raw = JSON.stringify(body);
    return service.handleWebhook(raw, { [FAKE_SIGNATURE_HEADER]: signFake(raw, SECRET) });
  };
  return { fake, venues, service, webhook };
}

const input = { bookedBy: "coach", courtId: "court1", startsAt: START, endsAt: END };

describe("bookingPrice", () => {
  it("tarif per jam x durasi, dibulatkan", () => {
    expect(bookingPrice(50_000, START, END)).toBe(100_000);
    expect(bookingPrice(50_000, START, "2026-11-10T08:30:00Z")).toBe(25_000);
    expect(bookingPrice(33_333, START, "2026-11-10T08:20:00Z")).toBe(11_111);
  });
});

describe("createBooking", () => {
  it("menahan slot, membuat booking pending, dan menagih harga dari server", async () => {
    const { service, venues, fake } = setup();
    const r = await service.createBooking(input);
    expect(venues.markSlotBooked).toHaveBeenCalledWith(["s1", "s2"]);
    expect(fake.tables.court_bookings![0]).toMatchObject({ booked_by: "coach", status: "pending" });
    // 2 jam x 50.000 = 100.000, fee 10% dibebankan ke pembayar
    expect(r.checkout.chargeAmount).toBe(110_000);
    expect(fake.tables.payments![0]).toMatchObject({ payee_id: "owner", amount: 100_000 });
  });

  it("menolak bila jam tidak tersedia, tanpa menahan apa pun", async () => {
    const { service, venues, fake } = setup({ slotsFree: false });
    await expect(service.createBooking(input)).rejects.toMatchObject({ status: 409, code: "SLOT_UNAVAILABLE" });
    expect(venues.markSlotBooked).not.toHaveBeenCalled();
    expect(fake.tables.court_bookings).toHaveLength(0);
  });

  it("slot direbut orang lain saat menahan: error diteruskan dan tidak ada booking", async () => {
    const s = setup();
    s.venues.markSlotBooked.mockRejectedValueOnce(new AppError(409, "SLOT_TAKEN", "x"));
    await expect(s.service.createBooking(input)).rejects.toMatchObject({ code: "SLOT_TAKEN" });
    expect(s.fake.tables.court_bookings).toHaveLength(0);
  });

  it("slot dilepas lagi bila checkout gagal", async () => {
    const { service, venues, fake } = setup();
    fake.tables.fee_settings = []; // getFeeSettings gagal
    await expect(service.createBooking(input)).rejects.toBeDefined();
    expect(venues.releaseSlot).toHaveBeenCalledWith(["s1", "s2"]);
  });

  it("menolak court tidak aktif, venue belum disetujui, atau menyewa lapangan sendiri", async () => {
    await expect(setup({ court: { active: false } }).service.createBooking(input)).rejects.toMatchObject({ code: "COURT_UNAVAILABLE" });
    await expect(setup({ court: { status: "pending" } }).service.createBooking(input)).rejects.toMatchObject({ code: "COURT_UNAVAILABLE" });
    await expect(setup({ court: { ownerId: "coach" } }).service.createBooking(input)).rejects.toMatchObject({ code: "SELF_PAYMENT" });
  });
});

describe("booking dibayar atau gagal", () => {
  it("paid: booking confirmed dan dana langsung masuk saldo Owner", async () => {
    const { service, webhook, fake } = setup();
    const { checkout } = await service.createBooking(input);
    const ref = fake.tables.payments![0]!.gateway_ref;
    expect(await webhook({ gatewayRef: ref, status: "paid", amount: checkout.chargeAmount })).toEqual({ outcome: "paid" });

    expect(fake.tables.court_bookings![0]).toMatchObject({ status: "confirmed", payment_id: checkout.paymentId });
    expect(await service.getWallet("owner")).toEqual({ balance: 100_000 });
  });

  it("failed: booking dibatalkan dan slot dilepas", async () => {
    const { service, webhook, venues, fake } = setup();
    const { checkout } = await service.createBooking(input);
    const ref = fake.tables.payments![0]!.gateway_ref;
    await webhook({ gatewayRef: ref, status: "failed", amount: checkout.chargeAmount });

    expect(fake.tables.court_bookings![0]!.status).toBe("cancelled");
    expect(venues.releaseRange).toHaveBeenCalledWith("court1", START, END);
  });

  it("webhook paid ganda tidak menyettle dua kali", async () => {
    const { service, webhook, fake } = setup();
    const { checkout } = await service.createBooking(input);
    const body = { gatewayRef: fake.tables.payments![0]!.gateway_ref, status: "paid", amount: checkout.chargeAmount };
    await webhook(body);
    expect(await webhook(body)).toEqual({ outcome: "duplicate" });
    expect(fake.tables.wallets).toHaveLength(1);
  });

  it("listMyBookings hanya milik sendiri", async () => {
    const { service } = setup();
    await service.createBooking(input);
    expect(await service.listMyBookings("coach")).toHaveLength(1);
    expect(await service.listMyBookings("lain")).toHaveLength(0);
  });
});
