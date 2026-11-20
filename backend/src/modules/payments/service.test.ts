import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../core/context";
import { createFakeSupabase } from "../../../tests/fakeSupabase";
import { FAKE_SIGNATURE_HEADER, FakeGateway, signFake } from "./gateway";
import { createPaymentsService, type PaidPayment } from "./service";

const SECRET = "test-secret";

function setup(opts: { feeModel?: "payer_fee" | "withdraw_percent"; percent?: number; price?: number } = {}) {
  const fake = createFakeSupabase(
    {
      fee_settings: [{ id: 1, model: opts.feeModel ?? "payer_fee", percent: opts.percent ?? 5 }],
      open_plays: [{ id: "op1", coach_id: "coach", price: opts.price ?? 100_000, status: "open" }],
      open_play_participants: [
        { open_play_id: "op1", user_id: "player", status: "pending_payment" },
        { open_play_id: "op1", user_id: "coach", status: "pending_payment" },
      ],
      payments: [],
      wallets: [],
      wallet_entries: [],
    },
    {
      payments_settle: (a) => {
        const row = fake.tables.payments!.find((p) => p.id === a.p_payment_id);
        if (!row) throw new Error("PAYMENT_NOT_FOUND");
        if (row.status !== "paid") throw new Error("PAYMENT_NOT_PAID");
        row.status = "settled";
        fake.tables.wallet_entries!.push({ user_id: a.p_payee, kind: "credit", amount: a.p_credit });
        const w = fake.tables.wallets!.find((x) => x.user_id === a.p_payee);
        if (w) w.balance = Number(w.balance) + Number(a.p_credit);
        else fake.tables.wallets!.push({ user_id: a.p_payee, balance: a.p_credit });
        return null;
      },
      wallet_withdraw: (a) => {
        const w = fake.tables.wallets!.find((x) => x.user_id === a.p_user);
        if (!w || Number(w.balance) < Number(a.p_amount)) throw new Error("INSUFFICIENT_BALANCE");
        w.balance = Number(w.balance) - Number(a.p_amount);
        fake.tables.wallet_entries!.push({ user_id: a.p_user, kind: "withdraw", amount: -Number(a.p_amount) });
        return "wd1";
      },
    },
    { payments: { status: "pending" } },
  );
  const ctx = { supabase: fake.db, env: {} } as unknown as AppContext;
  const gateway = new FakeGateway(SECRET);
  const service = createPaymentsService(ctx, { gateway });
  const webhook = (body: object, secret = SECRET) => {
    const raw = JSON.stringify(body);
    return service.handleWebhook(raw, { [FAKE_SIGNATURE_HEADER]: signFake(raw, secret) });
  };
  return { fake, ctx, service, webhook };
}

const payment = (targetType: PaidPayment["targetType"]): PaidPayment => ({
  paymentId: "p1",
  payerId: "u1",
  payeeId: "u2",
  targetType,
  targetId: "t1",
  amount: 100_000,
});

describe("onPaid registry", () => {
  it("handler terdaftar dipanggil untuk target yang cocok saja", async () => {
    const { ctx } = setup();
    const openPlay = vi.fn(async () => {});
    const booking = vi.fn(async () => {});
    createPaymentsService(ctx).onPaid("open_play", openPlay);
    createPaymentsService(ctx).onPaid("court_booking", booking);

    await createPaymentsService(ctx).dispatchPaid(payment("open_play"));

    expect(openPlay).toHaveBeenCalledOnce();
    expect(booking).not.toHaveBeenCalled();
  });

  it("konteks berbeda tidak saling memanggil handler", async () => {
    const handler = vi.fn(async () => {});
    createPaymentsService(setup().ctx).onPaid("open_play", handler);
    await createPaymentsService(setup().ctx).dispatchPaid(payment("open_play"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("beberapa handler untuk target yang sama dipanggil berurutan", async () => {
    const { ctx } = setup();
    const order: number[] = [];
    createPaymentsService(ctx).onPaid("open_play", async () => void order.push(1));
    createPaymentsService(ctx).onPaid("open_play", async () => void order.push(2));
    await createPaymentsService(ctx).dispatchPaid(payment("open_play"));
    expect(order).toEqual([1, 2]);
  });
});

describe("createCheckout", () => {
  it("jumlah dihitung server dari harga open play (payer_fee 5%)", async () => {
    const { service, fake } = setup();
    const r = await service.createCheckout({ payerId: "player", targetType: "open_play", targetId: "op1" });
    expect(r.chargeAmount).toBe(105_000);
    expect(fake.tables.payments![0]).toMatchObject({
      payer_id: "player",
      payee_id: "coach",
      amount: 100_000,
      fee_amount: 5_000,
      fee_model: "payer_fee",
      status: "pending",
    });
    expect(fake.tables.payments![0]!.gateway_ref).toMatch(/^fake_/);
  });

  it("model withdraw_percent: pembayar tidak dikenai fee", async () => {
    const { service } = setup({ feeModel: "withdraw_percent" });
    const r = await service.createCheckout({ payerId: "player", targetType: "open_play", targetId: "op1" });
    expect(r.chargeAmount).toBe(100_000);
  });

  it("dipanggil dua kali tidak membuat tagihan ganda", async () => {
    const { service, fake } = setup();
    const a = await service.createCheckout({ payerId: "player", targetType: "open_play", targetId: "op1" });
    const b = await service.createCheckout({ payerId: "player", targetType: "open_play", targetId: "op1" });
    expect(b.paymentId).toBe(a.paymentId);
    expect(fake.tables.payments).toHaveLength(1);
  });

  it("menolak bila pemain belum join / bukan pending_payment", async () => {
    const { service } = setup();
    await expect(
      service.createCheckout({ payerId: "stranger", targetType: "open_play", targetId: "op1" }),
    ).rejects.toMatchObject({ status: 409, code: "NOT_PENDING_PAYMENT" });
  });

  it("menolak coach membayar open play miliknya sendiri", async () => {
    const { service } = setup();
    await expect(
      service.createCheckout({ payerId: "coach", targetType: "open_play", targetId: "op1" }),
    ).rejects.toMatchObject({ code: "SELF_PAYMENT" });
  });

  it("target yang belum didukung menjawab 501, bukan menagih sembarang jumlah", async () => {
    const { service } = setup();
    await expect(
      service.createCheckout({ payerId: "player", targetType: "equipment_rental", targetId: "x" }),
    ).rejects.toMatchObject({ status: 501 });
  });
});

describe("handleWebhook", () => {
  async function checkedOut() {
    const s = setup();
    const r = await s.service.createCheckout({ payerId: "player", targetType: "open_play", targetId: "op1" });
    const ref = s.fake.tables.payments![0]!.gateway_ref as string;
    return { ...s, r, ref };
  }

  it("signature salah ditolak dan status tidak berubah", async () => {
    const { webhook, ref, fake } = await checkedOut();
    await expect(webhook({ gatewayRef: ref, status: "paid", amount: 105_000 }, "salah")).rejects.toMatchObject({
      status: 401,
      code: "INVALID_SIGNATURE",
    });
    expect(fake.tables.payments![0]!.status).toBe("pending");
  });

  it("paid memicu handler onPaid tepat sekali walau webhook dikirim dua kali", async () => {
    const { webhook, ref, ctx, fake } = await checkedOut();
    const handler = vi.fn(async () => {});
    createPaymentsService(ctx).onPaid("open_play", handler);

    const body = { gatewayRef: ref, status: "paid", amount: 105_000 };
    expect(await webhook(body)).toEqual({ outcome: "paid" });
    expect(await webhook(body)).toEqual({ outcome: "duplicate" });

    expect(handler).toHaveBeenCalledOnce();
    expect(fake.tables.payments![0]!.status).toBe("paid");
  });

  it("jumlah yang tidak sesuai tagihan ditolak", async () => {
    const { webhook, ref, fake } = await checkedOut();
    await expect(webhook({ gatewayRef: ref, status: "paid", amount: 1 })).rejects.toMatchObject({
      code: "AMOUNT_MISMATCH",
    });
    expect(fake.tables.payments![0]!.status).toBe("pending");
  });

  it("failed menandai pembayaran gagal tanpa memicu handler", async () => {
    const { webhook, ref, ctx, fake } = await checkedOut();
    const handler = vi.fn(async () => {});
    createPaymentsService(ctx).onPaid("open_play", handler);
    expect(await webhook({ gatewayRef: ref, status: "failed", amount: 105_000 })).toEqual({ outcome: "failed" });
    expect(handler).not.toHaveBeenCalled();
    expect(fake.tables.payments![0]!.status).toBe("failed");
  });

  it("failed setelah paid tidak membalik status (state tidak mundur)", async () => {
    const { webhook, ref, fake } = await checkedOut();
    await webhook({ gatewayRef: ref, status: "paid", amount: 105_000 });
    expect(await webhook({ gatewayRef: ref, status: "failed", amount: 105_000 })).toEqual({ outcome: "duplicate" });
    expect(fake.tables.payments![0]!.status).toBe("paid");
  });

  it("referensi tidak dikenal diabaikan", async () => {
    const { webhook } = await checkedOut();
    expect(await webhook({ gatewayRef: "tidak-ada", status: "paid", amount: 1 })).toEqual({ outcome: "ignored" });
  });
});

describe("settle, wallet, dan withdraw", () => {
  async function paid() {
    const s = setup();
    await s.service.createCheckout({ payerId: "player", targetType: "open_play", targetId: "op1" });
    const row = s.fake.tables.payments![0]!;
    await s.webhook({ gatewayRef: row.gateway_ref, status: "paid", amount: 105_000 });
    return { ...s, id: row.id as string };
  }

  it("settle mengkredit penerima dengan harga penuh (fee dibebankan ke pembayar)", async () => {
    const { service, id } = await paid();
    await service.settle(id);
    expect(await service.getWallet("coach")).toEqual({ balance: 100_000 });
  });

  it("settle dua kali tidak menggandakan saldo", async () => {
    const { service, id } = await paid();
    await service.settle(id);
    await expect(service.settle(id)).rejects.toMatchObject({ code: "PAYMENT_NOT_PAID" });
    expect(await service.getWallet("coach")).toEqual({ balance: 100_000 });
  });

  it("pembayaran pending tidak bisa disettle", async () => {
    const s = setup();
    await s.service.createCheckout({ payerId: "player", targetType: "open_play", targetId: "op1" });
    await expect(s.service.settle(s.fake.tables.payments![0]!.id as string)).rejects.toMatchObject({
      code: "PAYMENT_NOT_PAID",
    });
  });

  it("saldo sama dengan jumlah buku besar setelah beberapa transaksi", async () => {
    const { service, id, fake } = await paid();
    await service.settle(id);
    await service.requestWithdrawal("coach", 30_000);
    const sum = fake.tables.wallet_entries!.reduce((s, e) => s + Number(e.amount), 0);
    expect((await service.getWallet("coach")).balance).toBe(sum);
    expect(sum).toBe(70_000);
  });

  it("withdraw melebihi saldo ditolak", async () => {
    const { service, id } = await paid();
    await service.settle(id);
    await expect(service.requestWithdrawal("coach", 100_001)).rejects.toMatchObject({
      status: 409,
      code: "INSUFFICIENT_BALANCE",
    });
  });

  it("model withdraw_percent memotong persen saat withdraw", async () => {
    const s = setup({ feeModel: "withdraw_percent", percent: 5 });
    s.fake.tables.wallets!.push({ user_id: "coach", balance: 200_000 });
    const r = await s.service.requestWithdrawal("coach", 200_000);
    expect(r).toMatchObject({ fee: 10_000, net: 190_000 });
  });

  it("model payer_fee tidak memotong saat withdraw", async () => {
    const s = setup();
    s.fake.tables.wallets!.push({ user_id: "coach", balance: 50_000 });
    expect((await s.service.requestWithdrawal("coach", 50_000)).fee).toBe(0);
  });
});

describe("gateway belum dikonfigurasi", () => {
  it("createCheckout menjawab 503 dan tidak membuat baris payments", async () => {
    const fake = createFakeSupabase({
      fee_settings: [{ id: 1, model: "payer_fee", percent: 5 }],
      open_plays: [{ id: "op1", coach_id: "coach", price: 1000 }],
      open_play_participants: [{ open_play_id: "op1", user_id: "player", status: "pending_payment" }],
    });
    const ctx = {
      supabase: fake.db,
      env: { PAYMENT_PROVIDER: "undecided", PAYMENT_WEBHOOK_SECRET: "" },
    } as unknown as AppContext;
    await expect(
      createPaymentsService(ctx).createCheckout({ payerId: "player", targetType: "open_play", targetId: "op1" }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fake.tables.payments ?? []).toHaveLength(0);
  });
});

describe("fee settings", () => {
  it("admin mengubah model dan persen", async () => {
    const { service, fake } = setup();
    const r = await service.updateFeeSettings("admin1", { model: "withdraw_percent", percent: 2.5 });
    expect(r).toEqual({ model: "withdraw_percent", percent: 2.5 });
    expect(fake.tables.fee_settings![0]).toMatchObject({ updated_by: "admin1" });
  });
});

describe("previewFees dan getPayment", () => {
  it("contoh hitungan payer_fee memakai pembulatan server", () => {
    const { service } = setup();
    const r = service.previewFees("payer_fee", 5, 100_000);
    expect(r.charge).toMatchObject({ chargeAmount: 105_000, creditAmount: 100_000, platformFee: 5_000 });
    expect(r.withdraw).toBeNull();
  });

  it("contoh hitungan withdraw_percent menyertakan potongan tarik", () => {
    const { service } = setup();
    const r = service.previewFees("withdraw_percent", 10, 100_000);
    expect(r.charge.chargeAmount).toBe(100_000);
    expect(r.withdraw).toEqual({ fee: 10_000, net: 90_000 });
  });

  it("getPayment hanya untuk pembayarnya", async () => {
    const { service, fake } = setup();
    fake.tables.payments!.push({ id: "px", payer_id: "player", payee_id: "coach", target_type: "open_play", target_id: "op1", amount: 100_000, fee_amount: 5_000, fee_model: "payer_fee", status: "pending" });
    expect(await service.getPayment("player", "px")).toMatchObject({ id: "px", status: "pending", chargeAmount: 105_000 });
    await expect(service.getPayment("lain", "px")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
