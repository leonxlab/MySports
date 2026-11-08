import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/feed/home: Feed 'Let me choose for you' [login]
  app.get("/home", { preHandler: app.requireRole() }, todo("Feed 'Let me choose for you'"));
  // GET /api/v1/feed/explore: Menu global semua cabang (tanpa personalisasi, bisa difilter) [publik]
  app.get("/explore", todo("Menu global semua cabang (tanpa personalisasi, bisa difilter)"));
  // POST /api/v1/feed/signals: Catat sinyal kebiasaan (pencarian, lihat, join) [login]
  app.post("/signals", { preHandler: app.requireRole() }, todo("Catat sinyal kebiasaan (pencarian, lihat, join)"));
}
