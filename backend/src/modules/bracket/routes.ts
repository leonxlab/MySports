import type { FastifyInstance } from "fastify";
import { correctMatchSchema, generateBracketSchema, regenerateBracketSchema } from "./schema";
import { createBracketService } from "./service";

export async function routes(app: FastifyInstance) {
  const bracket = createBracketService(app.ctx);

  // POST /api/v1/bracket/generate: Buat bracket dari jumlah pemain, lapangan, durasi [coach]
  app.post("/generate", { preHandler: app.requireRole("coach") }, async (request, reply) => {
    const input = generateBracketSchema.parse(request.body);
    return reply.code(201).send(await bracket.generate(request.user!, input));
  });
  // GET /api/v1/bracket/open-play/:openPlayId: Bracket milik satu open play [login]
  app.get<{ Params: { openPlayId: string } }>(
    "/open-play/:openPlayId",
    { preHandler: app.requireRole() },
    (request) => bracket.getByOpenPlay(request.params.openPlayId),
  );
  // GET /api/v1/bracket/:id: Detail bracket [login]
  app.get<{ Params: { id: string } }>("/:id", { preHandler: app.requireRole() }, (request) =>
    bracket.getBracket(request.params.id),
  );
  // PATCH /api/v1/bracket/:id/matches/:matchId: Koreksi manual susunan pemain [coach]
  app.patch<{ Params: { id: string; matchId: string } }>(
    "/:id/matches/:matchId",
    { preHandler: app.requireRole("coach") },
    (request) =>
      bracket.correctMatch(
        request.user!,
        request.params.id,
        request.params.matchId,
        correctMatchSchema.parse(request.body),
      ),
  );
  // POST /api/v1/bracket/:id/regenerate: Buat ulang bracket [coach]
  app.post<{ Params: { id: string } }>(
    "/:id/regenerate",
    { preHandler: app.requireRole("coach") },
    (request) =>
      bracket.regenerate(request.user!, request.params.id, regenerateBracketSchema.parse(request.body ?? {})),
  );
}
