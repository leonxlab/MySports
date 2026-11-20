import type { FastifyInstance } from "fastify";
import { liveRoute } from "../../core/realtime";
import { createMatchSchema, sportSchema, updateSettingsSchema } from "./schema";
import { createMatchService } from "./service";

export async function routes(app: FastifyInstance) {
  const match = createMatchService(app.ctx);
  const control = (action: "start" | "pause" | "resume" | "finish" | "timeout" | "hydration") =>
    (request: { user?: import("../../core/roles").AuthUser; params: unknown }) =>
      match[action](request.user!, (request.params as { id: string }).id);

  // GET /api/v1/match/defaults/:sport: Nilai bawaan aturan per cabang [coach]
  app.get<{ Params: { sport: string } }>("/defaults/:sport", { preHandler: app.requireRole("coach") }, (request) =>
    match.defaults(sportSchema.parse(request.params.sport)),
  );
  // POST /api/v1/match: Buat match dari bracket match atau manual [coach]
  app.post("/", { preHandler: app.requireRole("coach") }, async (request, reply) =>
    reply.code(201).send(await match.create(request.user!, createMatchSchema.parse(request.body))),
  );
  // GET /api/v1/match/:id: Detail dan status match [login]
  app.get<{ Params: { id: string } }>("/:id", { preHandler: app.requireRole() }, (request) =>
    match.get(request.params.id),
  );
  // PATCH /api/v1/match/:id/settings: Edit setting match (Coach atau User sesuai kepemilikan) [login]
  app.patch<{ Params: { id: string } }>("/:id/settings", { preHandler: app.requireRole() }, (request) =>
    match.updateSettings(request.user!, request.params.id, updateSettingsSchema.parse(request.body)),
  );
  // POST /api/v1/match/:id/start: Mulai [coach]
  app.post("/:id/start", { preHandler: app.requireRole("coach") }, control("start"));
  // POST /api/v1/match/:id/pause: Pause [coach]
  app.post("/:id/pause", { preHandler: app.requireRole("coach") }, control("pause"));
  // POST /api/v1/match/:id/resume: Lanjut [coach]
  app.post("/:id/resume", { preHandler: app.requireRole("coach") }, control("resume"));
  // POST /api/v1/match/:id/finish: Selesai [coach]
  app.post("/:id/finish", { preHandler: app.requireRole("coach") }, control("finish"));
  // POST /api/v1/match/:id/timeout: Time out [coach]
  app.post("/:id/timeout", { preHandler: app.requireRole("coach") }, control("timeout"));
  // POST /api/v1/match/:id/hydration: Hydration break [coach]
  app.post("/:id/hydration", { preHandler: app.requireRole("coach") }, control("hydration"));
  // WS /api/v1/match/:id/live: Timer dan skor langsung [publik]
  // TODO(auth): verifikasi token WS ada di core/realtime.ts (dev-c).
  liveRoute(app, "/:id/live", (p) => `match:${p.id}`);
}
