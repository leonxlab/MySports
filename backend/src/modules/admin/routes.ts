import type { FastifyInstance } from "fastify";
import { createAdminService } from "./service";
import { listAuditSchema } from "./schema";

export async function routes(app: FastifyInstance) {
  const admin = createAdminService(app.ctx);

  app.get("/overview", { preHandler: app.requireRole("admin") }, () => admin.getOverview());
  app.get("/audit-log", { preHandler: app.requireRole("admin") }, async (request) => {
    const input = listAuditSchema.parse(request.query);
    return admin.listAuditLog(input);
  });
}
