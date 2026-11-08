import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";
import { liveRoute } from "../../core/realtime";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/match/defaults/:sport: Nilai bawaan aturan per cabang [coach]
  app.get("/defaults/:sport", { preHandler: app.requireRole("coach") }, todo("Nilai bawaan aturan per cabang"));
  // POST /api/v1/match: Buat match dari bracket match atau manual [coach]
  app.post("/", { preHandler: app.requireRole("coach") }, todo("Buat match dari bracket match atau manual"));
  // GET /api/v1/match/:id: Detail dan status match [login]
  app.get("/:id", { preHandler: app.requireRole() }, todo("Detail dan status match"));
  // PATCH /api/v1/match/:id/settings: Edit setting match (Coach atau User sesuai kepemilikan) [login]
  app.patch("/:id/settings", { preHandler: app.requireRole() }, todo("Edit setting match (Coach atau User sesuai kepemilikan)"));
  // POST /api/v1/match/:id/start: Mulai [coach]
  app.post("/:id/start", { preHandler: app.requireRole("coach") }, todo("Mulai"));
  // POST /api/v1/match/:id/pause: Pause [coach]
  app.post("/:id/pause", { preHandler: app.requireRole("coach") }, todo("Pause"));
  // POST /api/v1/match/:id/resume: Lanjut [coach]
  app.post("/:id/resume", { preHandler: app.requireRole("coach") }, todo("Lanjut"));
  // POST /api/v1/match/:id/finish: Selesai [coach]
  app.post("/:id/finish", { preHandler: app.requireRole("coach") }, todo("Selesai"));
  // POST /api/v1/match/:id/timeout: Time out [coach]
  app.post("/:id/timeout", { preHandler: app.requireRole("coach") }, todo("Time out"));
  // POST /api/v1/match/:id/hydration: Hydration break [coach]
  app.post("/:id/hydration", { preHandler: app.requireRole("coach") }, todo("Hydration break"));
  // WS /api/v1/match/:id/live: Timer dan skor langsung [publik]
  liveRoute(app, "/:id/live", (p) => `match:${p.id}`);
}
