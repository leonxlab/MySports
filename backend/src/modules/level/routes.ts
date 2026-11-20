import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/level/me: Level dan XP sendiri [login]
  app.get("/me", { preHandler: app.requireRole() }, todo("Level dan XP sendiri"));
  // GET /api/v1/level/users/:userId: Level pemain lain [login]
  app.get("/users/:userId", { preHandler: app.requireRole() }, todo("Level pemain lain"));
  // POST /api/v1/level/internal/play-activity: Terima menit main terverifikasi dari yolo-service [x-service-key]
  app.post("/internal/play-activity", { preHandler: app.requireServiceKey }, todo("Terima menit main terverifikasi dari yolo-service"));
  // GET /api/v1/level/flags: Daftar rekaman yang ditandai anti-cheat [admin]
  app.get("/flags", { preHandler: app.requireRole("admin") }, todo("Daftar rekaman yang ditandai anti-cheat"));
  // POST /api/v1/level/flags/:id/resolve: Putuskan hasil review [admin]
  app.post("/flags/:id/resolve", { preHandler: app.requireRole("admin") }, todo("Putuskan hasil review"));
}
