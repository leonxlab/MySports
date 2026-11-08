import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

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

/**
 * Pasang endpoint WebSocket untuk satu kanal.
 * TODO(auth): verifikasi token dari query ?token= sebelum subscribe.
 */
export function liveRoute(
  app: FastifyInstance,
  path: string,
  channelOf: (params: Record<string, string>) => string,
) {
  app.get(path, { websocket: true }, (socket, req) => {
    const channel = channelOf(req.params as Record<string, string>);
    app.ctx.realtime.subscribe(channel, socket);
    socket.send(JSON.stringify({ type: "subscribed", channel }));
  });
}
