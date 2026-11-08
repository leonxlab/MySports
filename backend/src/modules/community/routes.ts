import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/community/threads: Daftar thread (filter cabang) [publik]
  app.get("/threads", todo("Daftar thread (filter cabang)"));
  // POST /api/v1/community/threads: Buat thread [login]
  app.post("/threads", { preHandler: app.requireRole() }, todo("Buat thread"));
  // GET /api/v1/community/threads/:id: Detail thread dan balasan [publik]
  app.get("/threads/:id", todo("Detail thread dan balasan"));
  // POST /api/v1/community/threads/:id/posts: Balas thread [login]
  app.post("/threads/:id/posts", { preHandler: app.requireRole() }, todo("Balas thread"));
  // POST /api/v1/community/media/sign: Signed URL upload foto atau video [login]
  app.post("/media/sign", { preHandler: app.requireRole() }, todo("Signed URL upload foto atau video"));
  // POST /api/v1/community/reports: Laporkan konten [login]
  app.post("/reports", { preHandler: app.requireRole() }, todo("Laporkan konten"));
  // GET /api/v1/community/reports: Antrean laporan [admin]
  app.get("/reports", { preHandler: app.requireRole("admin") }, todo("Antrean laporan"));
  // POST /api/v1/community/reports/:id/resolve: Tindak laporan [admin]
  app.post("/reports/:id/resolve", { preHandler: app.requireRole("admin") }, todo("Tindak laporan"));
}
