import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/scoring/users/:userId/stats: Statistik pemain per cabang [login]
  app.get("/users/:userId/stats", { preHandler: app.requireRole() }, todo("Statistik pemain per cabang"));
  // GET /api/v1/scoring/:matchId: Papan skor [login]
  app.get("/:matchId", { preHandler: app.requireRole() }, todo("Papan skor"));
  // GET /api/v1/scoring/:matchId/stats: Statistik match [login]
  app.get("/:matchId/stats", { preHandler: app.requireRole() }, todo("Statistik match"));
  // POST /api/v1/scoring/:matchId/events: Input skor manual [coach]
  app.post("/:matchId/events", { preHandler: app.requireRole("coach") }, todo("Input skor manual"));
  // POST /api/v1/scoring/:matchId/fouls: Catat pelanggaran [coach]
  app.post("/:matchId/fouls", { preHandler: app.requireRole("coach") }, todo("Catat pelanggaran"));
  // PUT /api/v1/scoring/:matchId/players/:playerId/points: Isi atau koreksi poin peserta [coach]
  app.put("/:matchId/players/:playerId/points", { preHandler: app.requireRole("coach") }, todo("Isi atau koreksi poin peserta"));
  // PATCH /api/v1/scoring/events/:eventId: Konfirmasi atau koreksi usulan AI [coach]
  app.patch("/events/:eventId", { preHandler: app.requireRole("coach") }, todo("Konfirmasi atau koreksi usulan AI"));
  // DELETE /api/v1/scoring/events/:eventId: Batalkan kejadian skor [coach]
  app.delete("/events/:eventId", { preHandler: app.requireRole("coach") }, todo("Batalkan kejadian skor"));
}
