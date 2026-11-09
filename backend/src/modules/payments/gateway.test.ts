import { describe, expect, it } from "vitest";
import { createGateway, FAKE_SIGNATURE_HEADER, FakeGateway, signFake } from "./gateway";

const secret = "test-secret";
const body = JSON.stringify({ gatewayRef: "fake_1", status: "paid", amount: 105_000 });

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

describe("createGateway", () => {
  it("fake butuh secret", () => {
    expect(() => createGateway({ PAYMENT_PROVIDER: "fake", PAYMENT_WEBHOOK_SECRET: "" })).toThrow();
    expect(createGateway({ PAYMENT_PROVIDER: "fake", PAYMENT_WEBHOOK_SECRET: secret }).name).toBe(
      "fake",
    );
  });

  it("penyedia lain belum didukung", () => {
    expect(() =>
      createGateway({ PAYMENT_PROVIDER: "undecided", PAYMENT_WEBHOOK_SECRET: "" }),
    ).toThrow(/belum didukung/);
  });
});
