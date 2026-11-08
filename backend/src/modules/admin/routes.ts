import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/admin/overview: Jumlah pengajuan, lapangan, dan laporan yang menunggu [admin]
  app.get("/overview", { preHandler: app.requireRole("admin") }, todo("Jumlah pengajuan, lapangan, dan laporan yang menunggu"));
  // GET /api/v1/admin/audit-log: Log tindakan admin [admin]
  app.get("/audit-log", { preHandler: app.requireRole("admin") }, todo("Log tindakan admin"));
}
