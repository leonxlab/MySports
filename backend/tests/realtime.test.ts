import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import type { AppContext } from "../src/core/context";
import { liveRoute, RealtimeHub, WS_CLOSE_FORBIDDEN, WS_CLOSE_UNAUTHORIZED, type LiveRouteOptions } from "../src/core/realtime";

const VALID = "valid-token";

type Outcome = { kind: "message"; data: unknown } | { kind: "close"; code: number };

let app: ReturnType<typeof Fastify> | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function build(options: LiveRouteOptions = {}) {
  const getUser = vi.fn(async (token: string) =>
    token === VALID
      ? { data: { user: { id: "user-1" } }, error: null }
      : { data: { user: null }, error: { message: "invalid JWT" } },
  );
  const supabase = {
    auth: { getUser },
    from: () => ({ select: () => ({ eq: async () => ({ data: [{ role: "coach" }], error: null }) }) }),
  };
  const realtime = new RealtimeHub();
  app = Fastify();
  app.decorate("ctx", { supabase, realtime } as unknown as AppContext);
  await app.register(websocket);
  liveRoute(app, "/live/:id", (p) => `match:${p.id}`, options);
  await app.ready();
  return { getUser, realtime };
}

/** Tunggu kejadian pertama dari server: pesan atau penutupan. Listener dipasang sebelum handshake selesai. */
async function connect(path: string): Promise<{ ws: WebSocket; outcome: Promise<Outcome> }> {
  let resolve!: (o: Outcome) => void;
  const outcome = new Promise<Outcome>((r) => (resolve = r));
  const ws = await app!.injectWS(path, {}, {
    onInit(socket) {
      socket.on("message", (data) => resolve({ kind: "message", data: JSON.parse(String(data)) }));
      socket.on("close", (code) => resolve({ kind: "close", code }));
    },
  });
  return { ws, outcome };
}

describe("liveRoute dengan ?token=", () => {
  it("token valid: subscribe ke kanal dan menerima siaran", async () => {
    const { realtime } = await build();
    const { ws, outcome } = await connect(`/live/m1?token=${VALID}`);
    expect(await outcome).toEqual({ kind: "message", data: { type: "subscribed", channel: "match:m1" } });

    const next = new Promise((r) => ws.once("message", (d) => r(JSON.parse(String(d)))));
    realtime.publish("match:m1", { type: "score", home: 2 });
    expect(await next).toEqual({ type: "score", home: 2 });
    ws.terminate();
  });

  it("tanpa token: ditutup 4401 tanpa memanggil Supabase", async () => {
    const { getUser } = await build();
    const { outcome } = await connect("/live/m1");
    expect(await outcome).toEqual({ kind: "close", code: WS_CLOSE_UNAUTHORIZED });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("token kedaluwarsa atau palsu: ditutup 4401", async () => {
    const { getUser } = await build();
    const { outcome } = await connect("/live/m1?token=expired-or-forged");
    expect(await outcome).toEqual({ kind: "close", code: WS_CLOSE_UNAUTHORIZED });
    expect(getUser).toHaveBeenCalledWith("expired-or-forged");
  });

  it("authorize menolak: ditutup 4403", async () => {
    const authorize = vi.fn(() => false);
    await build({ authorize });
    const { outcome } = await connect(`/live/m1?token=${VALID}`);
    expect(await outcome).toEqual({ kind: "close", code: WS_CLOSE_FORBIDDEN });
    expect(authorize).toHaveBeenCalledWith({ id: "user-1", roles: ["coach", "user"] }, { id: "m1" });
  });
});
