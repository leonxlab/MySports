import type { FastifyInstance } from "fastify";
import { feedFiltersSchema, recordSignalSchema } from "./schema";
import { createFeedService } from "./service";

export async function routes(app: FastifyInstance) {
  const feed = createFeedService(app.ctx);

  app.get("/home", { preHandler: app.requireRole() }, async (request) => {
    const filters = feedFiltersSchema.parse(request.query);
    return feed.getHomeFeed(request.user!.id, filters);
  });

  app.get("/explore", async (request) => {
    const filters = feedFiltersSchema.parse(request.query);
    return feed.getExplore(filters);
  });

  app.post("/signals", { preHandler: app.requireRole() }, async (request) => {
    const input = recordSignalSchema.parse(request.body);
    return feed.recordSignal(request.user!.id, input);
  });
}
