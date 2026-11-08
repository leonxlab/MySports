import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { modules } from "../src/modules";
import { testApp, testEnv } from "./helpers";

let app: Awaited<ReturnType<typeof testApp>>;
beforeAll(async () => {
  app = await testApp();
  await app.ready();
});
afterAll(() => app.close());

describe("server", () => {
  it("GET /health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("nama modul unik dan sesuai folder", () => {
    const names = modules.map((m) => m.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("bracket");
    expect(names).toContain("vip");
  });

  it("endpoint publik yang belum jadi menjawab 501", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/venues" });
    expect(res.statusCode).toBe(501);
    expect(res.json().error.code).toBe("NOT_IMPLEMENTED");
  });

  it("endpoint login tanpa token menjawab 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/accounts/me" });
    expect(res.statusCode).toBe(401);
  });

  it("endpoint service menolak tanpa x-service-key", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/devices/events", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("endpoint service lolos dengan x-service-key yang benar", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/devices/events",
      headers: { "x-service-key": testEnv.YOLO_SERVICE_KEY },
      payload: {},
    });
    expect(res.statusCode).toBe(501);
  });

  it("modul vip tidak punya endpoint", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/vip/status" });
    expect(res.statusCode).toBe(404);
  });
});
