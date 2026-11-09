import { describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { RealtimeHub } from "../src/core/realtime";
import { FAKE_SIGNATURE_HEADER, signFake } from "../src/modules/payments/gateway";
import { createFakeSupabase } from "./fakeSupabase";
import { testEnv } from "./helpers";

async function appWith(provider: string) {
  const fake = createFakeSupabase({ payments: [] });
  const env = { ...testEnv, PAYMENT_PROVIDER: provider, PAYMENT_WEBHOOK_SECRET: "s3cret" };
  return buildApp({ env, supabase: fake.db as never, realtime: new RealtimeHub() });
}

const post = (app: Awaited<ReturnType<typeof appWith>>, body: string, headers: Record<string, string> = {}) =>
  app.inject({
    method: "POST",
    url: "/api/v1/payments/webhook/fake",
    payload: body,
    headers: { "content-type": "application/json", ...headers },
  });

describe("POST /payments/webhook/:provider", () => {
  const body = JSON.stringify({ gatewayRef: "x", status: "paid", amount: 1 });

  it("tanpa signature menjawab 401 (body mentah dipakai untuk verifikasi)", async () => {
    const res = await post(await appWith("fake"), body);
    expect(res.statusCode).toBe(401);
    expect(res.json().error.code).toBe("INVALID_SIGNATURE");
  });

  it("signature benar tetapi referensi tidak dikenal diabaikan", async () => {
    const res = await post(await appWith("fake"), body, { [FAKE_SIGNATURE_HEADER]: signFake(body, "s3cret") });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ outcome: "ignored" });
  });

  it("signature dihitung dari byte asli: spasi tambahan membuatnya tidak cocok", async () => {
    const res = await post(await appWith("fake"), body + " ", { [FAKE_SIGNATURE_HEADER]: signFake(body, "s3cret") });
    expect(res.statusCode).toBe(401);
  });

  it("gateway belum dikonfigurasi menjawab 503", async () => {
    const res = await post(await appWith("undecided"), body);
    expect(res.statusCode).toBe(503);
  });

  it("checkout tanpa token menjawab 401 dan JSON body tetap bisa diurai", async () => {
    const res = await (await appWith("fake")).inject({
      method: "POST",
      url: "/api/v1/payments/checkout",
      payload: { targetType: "open_play", targetId: "x" },
    });
    expect(res.statusCode).toBe(401);
  });
});
