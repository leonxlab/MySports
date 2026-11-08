import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // POST /api/v1/bracket/generate: Buat bracket dari jumlah pemain, lapangan, durasi [coach]
  app.post("/generate", { preHandler: app.requireRole("coach") }, todo("Buat bracket dari jumlah pemain, lapangan, durasi"));
  // GET /api/v1/bracket/open-play/:openPlayId: Bracket milik satu open play [login]
  app.get("/open-play/:openPlayId", { preHandler: app.requireRole() }, todo("Bracket milik satu open play"));
  // GET /api/v1/bracket/:id: Detail bracket [login]
  app.get("/:id", { preHandler: app.requireRole() }, todo("Detail bracket"));
  // PATCH /api/v1/bracket/:id/matches/:matchId: Koreksi manual susunan pemain [coach]
  app.patch("/:id/matches/:matchId", { preHandler: app.requireRole("coach") }, todo("Koreksi manual susunan pemain"));
  // POST /api/v1/bracket/:id/regenerate: Buat ulang bracket [coach]
  app.post("/:id/regenerate", { preHandler: app.requireRole("coach") }, todo("Buat ulang bracket"));
}
