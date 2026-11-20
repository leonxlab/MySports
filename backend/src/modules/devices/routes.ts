import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";
import { liveRoute } from "../../core/realtime";

export async function routes(app: FastifyInstance) {
  // POST /api/v1/devices/sessions: Buat sesi pairing (kode sesi dan QR) [coach]
  app.post("/sessions", { preHandler: app.requireRole("coach") }, todo("Buat sesi pairing (kode sesi dan QR)"));
  // POST /api/v1/devices/sessions/join: Pasang device dengan kode: {code, role} [login]
  app.post("/sessions/join", { preHandler: app.requireRole() }, todo("Pasang device dengan kode: {code, role}"));
  // GET /api/v1/devices/sessions/:id: Status sesi dan device [login]
  app.get("/sessions/:id", { preHandler: app.requireRole() }, todo("Status sesi dan device"));
  // POST /api/v1/devices/sessions/:id/capability: Laporkan kemampuan device (WebGPU, FPS) [login]
  app.post("/sessions/:id/capability", { preHandler: app.requireRole() }, todo("Laporkan kemampuan device (WebGPU, FPS)"));
  // POST /api/v1/devices/sessions/:id/calibration: Simpan kalibrasi ring, gawang, atau garis [coach]
  app.post("/sessions/:id/calibration", { preHandler: app.requireRole("coach") }, todo("Simpan kalibrasi ring, gawang, atau garis"));
  // POST /api/v1/devices/sessions/:id/segments/sign: Minta signed URL upload segmen (maks 50 MB) [login]
  app.post("/sessions/:id/segments/sign", { preHandler: app.requireRole() }, todo("Minta signed URL upload segmen (maks 50 MB)"));
  // POST /api/v1/devices/sessions/:id/segments/:segmentId/uploaded: Tandai segmen siap diproses (masuk antrean) [login]
  app.post("/sessions/:id/segments/:segmentId/uploaded", { preHandler: app.requireRole() }, todo("Tandai segmen siap diproses (masuk antrean)"));
  // POST /api/v1/devices/events: Terima batch kejadian dari yolo-service [x-service-key]
  app.post("/events", { preHandler: app.requireServiceKey }, todo("Terima batch kejadian dari yolo-service"));
  // WS /api/v1/devices/sessions/:id/live: Status device dan skor langsung [publik]
  liveRoute(app, "/sessions/:id/live", (p) => `devices:${p.id}`);
}
