import type { FastifyInstance } from "fastify";
import {
  addPostSchema,
  createReportSchema,
  createThreadSchema,
  idParamsSchema,
  listReportsSchema,
  listThreadsSchema,
  resolveReportSchema,
  signMediaSchema,
} from "./schema";
import { createCommunityService } from "./service";

export async function routes(app: FastifyInstance) {
  const community = createCommunityService(app.ctx);

  app.get("/threads", async (request) => {
    const input = listThreadsSchema.parse(request.query);
    return community.listThreads(input);
  });

  app.post("/threads", { preHandler: app.requireRole() }, async (request) => {
    const input = createThreadSchema.parse(request.body);
    return community.createThread(request.user!.id, input);
  });

  app.get<{ Params: { id: string } }>("/threads/:id", async (request) => {
    const { id } = idParamsSchema.parse(request.params);
    return community.getThread(id);
  });

  app.post<{ Params: { id: string } }>(
    "/threads/:id/posts",
    { preHandler: app.requireRole() },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params);
      const input = addPostSchema.parse(request.body);
      return community.addPost(request.user!.id, id, input);
    },
  );

  app.post("/media/sign", { preHandler: app.requireRole() }, async (request) => {
    const input = signMediaSchema.parse(request.body);
    return community.signMedia(request.user!.id, input);
  });

  app.post("/reports", { preHandler: app.requireRole() }, async (request) => {
    const input = createReportSchema.parse(request.body);
    return community.createReport(request.user!.id, input);
  });

  app.get("/reports", { preHandler: app.requireRole("admin") }, async (request) => {
    const input = listReportsSchema.parse(request.query);
    return community.listReports(input);
  });

  app.post<{ Params: { id: string } }>(
    "/reports/:id/resolve",
    { preHandler: app.requireRole("admin") },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params);
      const input = resolveReportSchema.parse(request.body);
      return community.resolveReport(request.user!.id, id, input);
    },
  );
}
