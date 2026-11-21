import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testEnv } from "./helpers";
import { RealtimeHub } from "../src/core/realtime";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Builder Postgrest mock: semua method chainable; await/limit() → hasil. */
function pgMock(result: unknown = { data: [], error: null }) {
  const chain: Record<string, unknown> = {};
  const api = {
    select() {
      return api;
    },
    eq() {
      return api;
    },
    is() {
      return api;
    },
    gte() {
      return api;
    },
    order() {
      return api;
    },
    delete() {
      return api;
    },
    update() {
      return api;
    },
    insert() {
      return { error: null };
    },
    limit() {
      return Promise.resolve(result);
    },
  };
  Object.assign(chain, api);
  (chain as unknown as { then: (cb: (r: unknown) => unknown) => unknown }).then = (cb) => cb(result);
  return chain;
}

/**
 * Supabase mock untuk verify: mengembalikan satu kode aktif yang hash-nya
 * cocok dengan kode "123456" untuk email & pepper dari testEnv.
 */
function otpSupabase(opts: { existingUser?: boolean } = {}) {
  const email = "ada@b.co";
  const pepper = testEnv.OTP_PEPPER || testEnv.SUPABASE_SERVICE_ROLE_KEY.slice(0, 32);
  const matchingCode = {
    id: "otp-1",
    code_hash: sha256(`123456|${email}|${pepper}`),
    attempts: 0,
    expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    consumed_at: null,
  };
  return {
    from(table: string) {
      void table;
      return pgMock({ data: [matchingCode], error: null });
    },
    auth: {
      admin: {
        async createUser({ email: e }: { email: string }) {
          if (opts.existingUser) {
            return { data: null, error: { message: "User already registered" } };
          }
          return { data: { user: { id: "u1", email: e } }, error: null };
        },
        async generateLink() {
          return { data: { properties: { action_link: "https://example.com" } }, error: null };
        },
      },
    },
  } as unknown as SupabaseClient;
}

async function buildOtpApp(supabase: SupabaseClient) {
  const app = await buildApp({ env: testEnv, supabase, realtime: new RealtimeHub() });
  await app.ready();
  return app;
}

describe("auth-otp", () => {
  let app: Awaited<ReturnType<typeof buildOtpApp>>;
  beforeAll(async () => {
    app = await buildOtpApp(otpSupabase());
  });
  afterAll(() => app.close());

  it("menolak email tidak valid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth-otp/request",
      payload: { email: "bukan-email", purpose: "login" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("menolak kode bukan 6 digit", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth-otp/verify",
      payload: { email: "a@b.co", purpose: "login", code: "12ab" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("endpoint verify tanpa kode tersimpan menjawab 401", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth-otp/verify",
      payload: { email: "a@b.co", purpose: "login", code: "123456" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("verify signup dengan email sudah terdaftar menjawab 409", async () => {
    const app2 = await buildOtpApp(otpSupabase({ existingUser: true }));
    try {
      const res = await app2.inject({
        method: "POST",
        url: "/api/v1/auth-otp/verify",
        payload: { email: "ada@b.co", purpose: "signup", code: "123456" },
      });
      expect(res.statusCode).toBe(409);
    } finally {
      await app2.close();
    }
  });
});

describe("auth-otp rate limit (unit service)", () => {
  function countdownSupabase(results: unknown[]) {
    let call = 0;
    return {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          is() {
            return this;
          },
          gte() {
            return this;
          },
          order() {
            return this;
          },
          limit() {
            const idx = Math.min(call, results.length - 1);
            call += 1;
            return Promise.resolve(results[idx]);
          },
          delete() {
            return this;
          },
          update() {
            return this;
          },
          insert() {
            return { error: null };
          },
        };
      },
    } as unknown as SupabaseClient;
  }

  it("cooldown 60 detik menolak permintaan kedua", async () => {
    const now = new Date().toISOString();
    // urutan query di request(): cooldown → count email → (count IP bila ip) — keduanya tanpa ip
    const supabase = countdownSupabase([
      { data: [{ requested_at: now }], error: null }, // call 1: cooldown kena
      { data: [], error: null }, // fallback: count email
      { data: [], error: null }, // fallback: count IP
    ]);
    const { createAuthOtpService } = await import("../src/modules/auth-otp/service");
    const service = createAuthOtpService({ env: testEnv, supabase });
    await expect(
      service.request({ email: "x@y.co", purpose: "login" }, undefined),
    ).rejects.toMatchObject({ status: 429, code: "OTP_COOLDOWN" });
  });

  it("RESEND_API_KEY kosong tidak melempar (mode dev log)", async () => {
    const supabase = countdownSupabase([{ data: [], error: null }]);
    const { createAuthOtpService } = await import("../src/modules/auth-otp/service");
    const service = createAuthOtpService({ env: testEnv, supabase });
    const res = await service.request({ email: "dev@y.co", purpose: "signup" }, undefined);
    expect(res.sent).toBe(true);
  });
});
