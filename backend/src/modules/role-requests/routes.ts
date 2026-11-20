import type { FastifyInstance } from "fastify";
import {
  coachRequestSchema,
  listRequestsSchema,
  ownerRequestSchema,
  rejectRequestSchema,
  requestIdSchema,
} from "./schema";
import { createRoleRequestsService } from "./service";

export async function routes(app: FastifyInstance) {
  const roleRequests = createRoleRequestsService(app.ctx);

  app.post("/coach", { preHandler: app.requireRole() }, async (request) => {
    const input = coachRequestSchema.parse(request.body);
    return roleRequests.submitCoachRequest(request.user!.id, input);
  });

  app.post("/owner", { preHandler: app.requireRole() }, async (request) => {
    const input = ownerRequestSchema.parse(request.body ?? {});
    return roleRequests.submitOwnerRequest(request.user!.id, input);
  });

  app.get("/mine", { preHandler: app.requireRole() }, (request) =>
    roleRequests.listMine(request.user!.id),
  );

  app.get<{ Querystring: Record<string, unknown> }>(
    "/",
    { preHandler: app.requireRole("admin") },
    async (request) => {
      const input = listRequestsSchema.parse(request.query);
      return roleRequests.listRequests(input);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/:id/approve",
    { preHandler: app.requireRole("admin") },
    (request) => {
      const { id } = requestIdSchema.parse(request.params);
      return roleRequests.approve(id, request.user!.id);
    },
  );

  app.post<{ Params: { id: string } }>(
    "/:id/reject",
    { preHandler: app.requireRole("admin") },
    async (request) => {
      const { id } = requestIdSchema.parse(request.params);
      const input = rejectRequestSchema.parse(request.body);
      return roleRequests.reject(id, request.user!.id, input);
    },
  );
}
