import { describe, expect, it, vi } from "vitest";
import { createGateway, FAKE_SIGNATURE_HEADER, FakeGateway, LxPayGateway, signFake, signLxPay } from "./gateway";

const secret = "test-secret";
const body = JSON.stringify({ gatewayRef: "fake_1", status: "paid", amount: 105_000 });

// Contoh webhook LxPay (https://leonxlab.app/docs/lxpay)
const lxBody = JSON.stringify({
  event: "transaction.paid",
  reference: "lxq_abc123",
  amount: 105_000,
  amountWithCode: 105_417,
  payerPaid: 105_417,
  paidAt: "2026-11-22T08:00:00.000Z",
});

describe("FakeGateway.verifyWebhook", () => {
  const gw = new FakeGateway(secret);

  it("menerima signature yang benar", () => {
    expect(gw.verifyWebhook(body, { [FAKE_SIGNATURE_HEADER]: signFake(body, secret) })).toBe(true);
  });

  it("menolak signature salah", () => {
    expect(gw.verifyWebhook(body, { [FAKE_SIGNATURE_HEADER]: signFake(body, "lain") })).toBe(false);
    expect(gw.verifyWebhook(body, { [FAKE_SIGNATURE_HEADER]: "abc" })).toBe(false);
  });

  it("menolak tanpa header signature", () => {
    expect(gw.verifyWebhook(body, {})).toBe(false);
  });

  it("menolak bila body diubah setelah ditandatangani", () => {
    const sig = signFake(body, secret);
    const tampered = body.replace("105000", "1");
    expect(gw.verifyWebhook(tampered, { [FAKE_SIGNATURE_HEADER]: sig })).toBe(false);
  });
});

describe("FakeGateway.parseEvent dan createCharge", () => {
  const gw = new FakeGateway(secret);

  it("mengurai event yang valid", () => {
    expect(gw.parseEvent(body)).toEqual({
      gatewayRef: "fake_1",
      status: "paid",
      amount: 105_000,
      gatewayFee: 0,
    });
  });

  it("menolak event tidak valid", () => {
    expect(() => gw.parseEvent(JSON.stringify({ status: "paid", amount: 1 }))).toThrow();
    expect(() =>
      gw.parseEvent(JSON.stringify({ gatewayRef: "x", status: "paid", amount: 1.5 })),
    ).toThrow();
    expect(() =>
      gw.parseEvent(JSON.stringify({ gatewayRef: "x", status: "weird", amount: 1 })),
    ).toThrow();
  });

  it("createCharge menghasilkan gatewayRef unik", async () => {
    const a = await gw.createCharge({ idempotencyKey: "k", amount: 1, description: "x" });
    const b = await gw.createCharge({ idempotencyKey: "k", amount: 1, description: "x" });
    expect(a.gatewayRef).not.toBe(b.gatewayRef);
  });
});

describe("LxPayGateway.verifyWebhook", () => {
  const gw = new LxPayGateway("xpk_live_test", secret);

  it("menerima signature sha256(secret.body) yang benar", () => {
    expect(gw.verifyWebhook(lxBody, { "x-lxpay-signature": signLxPay(lxBody, secret) })).toBe(true);
  });

  it("menolak signature salah, header hilang, atau body diubah", () => {
    expect(gw.verifyWebhook(lxBody, { "x-lxpay-signature": signLxPay(lxBody, "lain") })).toBe(false);
    expect(gw.verifyWebhook(lxBody, {})).toBe(false);
    const sig = signLxPay(lxBody, secret);
    expect(gw.verifyWebhook(lxBody.replace("105000", "1"), { "x-lxpay-signature": sig })).toBe(false);
  });

  it("butuh api key dan webhook secret", () => {
    expect(() => new LxPayGateway("", secret)).toThrow(/LXPAY_API_KEY/);
    expect(() => new LxPayGateway("xpk_live_test", "")).toThrow(/LXPAY_WEBHOOK_SECRET/);
  });
});

describe("LxPayGateway.parseEvent", () => {
  const gw = new LxPayGateway("xpk_live_test", secret);

  it("mengurai transaction.paid", () => {
    expect(gw.parseEvent(lxBody)).toEqual({
      gatewayRef: "lxq_abc123",
      status: "paid",
      amount: 105_000,
      gatewayFee: 0,
    });
  });

  it("event lain selain transaction.paid dikembalikan null (di-ack tanpa efek)", () => {
    expect(gw.parseEvent(JSON.stringify({ event: "transaction.expired", reference: "lxq_abc123" }))).toBeNull();
  });

  it("event paid yang tidak valid ditolak", () => {
    expect(() => gw.parseEvent(JSON.stringify({ event: "transaction.paid", amount: 1.5 }))).toThrow();
    expect(() =>
      gw.parseEvent(JSON.stringify({ event: "transaction.paid", reference: "x", amount: "banyak" })),
    ).toThrow();
    expect(() => gw.parseEvent("bukan json")).toThrow();
  });
});

describe("LxPayGateway.createCharge dan getTransaction", () => {
  const gw = (fetchMock: unknown) =>
    new LxPayGateway("xpk_live_test", secret, undefined, fetchMock as unknown as typeof fetch);

  it("membuat transaksi dan memetakan respons QRIS", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://leonxlab.app/api/lxpay/v1/transactions");
      const headers = init!.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer xpk_live_test");
      expect(JSON.parse(init!.body as string)).toMatchObject({
        amount: 105_000,
        reference: "pay1",
        feeBearer: "platform",
      });
      return new Response(
        JSON.stringify({
          ok: true,
          transaction: {
            reference: "lxq_abc",
            status: "PENDING",
            amount: 105_000,
            amountWithCode: 105_417,
            qrisPayload: "000201-QR",
            expiresAt: "2026-11-22T09:00:00.000Z",
          },
        }),
        { status: 201 },
      );
    });
    const charge = await gw(fetchMock).createCharge({ idempotencyKey: "pay1", amount: 105_000, description: "Open play" });
    expect(charge.gatewayRef).toBe("lxq_abc");
    expect(charge.redirectUrl).toBeNull();
    expect(charge.qris).toEqual({
      payload: "000201-QR",
      amountWithCode: 105_417,
      expiresAt: "2026-11-22T09:00:00.000Z",
    });
  });

  it("melempar error yang menyebut kode gateway bila jawaban gagal", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_amount" }), { status: 400 }));
    await expect(
      gw(fetchMock).createCharge({ idempotencyKey: "pay1", amount: 1, description: "x" }),
    ).rejects.toThrow(/invalid_amount/);
  });

  it("getTransaction memetakan PENDING/PAID/EXPIRED", async () => {
    const bodies = [
      { transaction: { reference: "r", status: "PAID", amount: 105_000 } },
      { transaction: { reference: "r", status: "PENDING", amount: 105_000 } },
      { transaction: { reference: "r", status: "EXPIRED" } },
    ];
    let i = 0;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(bodies[i++]), { status: 200 }));
    const g = gw(fetchMock);
    expect(await g.getTransaction("r")).toEqual({ status: "paid", amount: 105_000 });
    expect(await g.getTransaction("r")).toEqual({ status: "pending", amount: 105_000 });
    expect(await g.getTransaction("r")).toEqual({ status: "expired", amount: null });
  });
});

describe("createGateway", () => {
  it("fake butuh secret", () => {
    expect(() =>
      createGateway({ PAYMENT_PROVIDER: "fake", PAYMENT_WEBHOOK_SECRET: "", LXPAY_API_KEY: "", LXPAY_WEBHOOK_SECRET: "", LXPAY_BASE_URL: "" }),
    ).toThrow();
    expect(
      createGateway({ PAYMENT_PROVIDER: "fake", PAYMENT_WEBHOOK_SECRET: secret, LXPAY_API_KEY: "", LXPAY_WEBHOOK_SECRET: "", LXPAY_BASE_URL: "" }).name,
    ).toBe("fake");
  });

  it("lxpay butuh api key dan webhook secret, lalu aktif bila lengkap", () => {
    expect(() =>
      createGateway({
        PAYMENT_PROVIDER: "lxpay",
        PAYMENT_WEBHOOK_SECRET: "",
        LXPAY_API_KEY: "",
        LXPAY_WEBHOOK_SECRET: "",
        LXPAY_BASE_URL: "",
      }),
    ).toThrow();
    expect(
      createGateway({
        PAYMENT_PROVIDER: "lxpay",
        PAYMENT_WEBHOOK_SECRET: "",
        LXPAY_API_KEY: "xpk_live_test",
        LXPAY_WEBHOOK_SECRET: secret,
        LXPAY_BASE_URL: "",
      }).name,
    ).toBe("lxpay");
  });

  it("penyedia lain belum didukung", () => {
    expect(() =>
      createGateway({ PAYMENT_PROVIDER: "undecided", PAYMENT_WEBHOOK_SECRET: "", LXPAY_API_KEY: "", LXPAY_WEBHOOK_SECRET: "", LXPAY_BASE_URL: "" }),
    ).toThrow(/belum didukung/);
  });
});
