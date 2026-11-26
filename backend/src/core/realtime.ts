import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";
import { resolveUser } from "./auth";
import type { AuthUser } from "./roles";

/** Hub sederhana: kanal -> kumpulan socket. Cukup untuk satu dyno. Kalau scale >1 dyno, ganti ke Supabase Realtime atau Redis. */
export class RealtimeHub {
  private channels = new Map<string, Set<WebSocket>>();

  subscribe(channel: string, socket: WebSocket) {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
    this.channels.get(channel)!.add(socket);
    socket.on("close", () => this.channels.get(channel)?.delete(socket));
  }

  publish(channel: string, message: unknown) {
    const data = JSON.stringify(message);
    this.channels.get(channel)?.forEach((s) => s.readyState === s.OPEN && s.send(data));
  }
}

/** Kode tutup WebSocket (rentang 4000-4999 bebas dipakai aplikasi), meniru 401/403 HTTP. */
export const WS_CLOSE_UNAUTHORIZED = 4401;
export const WS_CLOSE_FORBIDDEN = 4403;

export interface LiveRouteOptions {
  /**
   * Cek akses tambahan per kanal setelah token valid, misalnya hanya peserta match.
   * Tanpa ini, semua user yang login boleh subscribe.
   * TODO(decision): siapa yang boleh menonton kanal match dan sesi device.
   */
  authorize?: (user: AuthUser, params: Record<string, string>) => boolean | Promise<boolean>;
}

/**
 * Pasang endpoint WebSocket untuk satu kanal. Klien mengirim token Supabase lewat `?token=`
 * (browser tidak bisa memasang header Authorization di WebSocket). Token tidak valid = tutup 4401,
 * ditolak `authorize` = tutup 4403. Token tidak pernah ditulis ke log.
 */
export function liveRoute(
  app: FastifyInstance,
  path: string,
  channelOf: (params: Record<string, string>) => string,
  options: LiveRouteOptions = {},
) {
  app.get(path, { websocket: true }, async (socket, req) => {
    const params = req.params as Record<string, string>;
    const token = (req.query as { token?: string } | undefined)?.token;

    let user: AuthUser;
    try {
      user = await resolveUser(app, token);
    } catch {
      socket.close(WS_CLOSE_UNAUTHORIZED, "unauthorized");
      return;
    }
    if (options.authorize && !(await options.authorize(user, params))) {
      socket.close(WS_CLOSE_FORBIDDEN, "forbidden");
      return;
    }

    const channel = channelOf(params);
    app.ctx.realtime.subscribe(channel, socket);
    socket.send(JSON.stringify({ type: "subscribed", channel }));
  });
}
