import type { FastifyInstance } from "fastify";
import {
  addEventBody,
  eventParams,
  foulBody,
  matchParams,
  playerParams,
  playerPointsBody,
  reviewEventBody,
  userParams,
} from "./schema";
import { createScoringService } from "./service";

export async function routes(app: FastifyInstance) {
  const scoring = createScoringService(app.ctx);

  // GET /api/v1/scoring/users/:userId/stats: Statistik pemain per cabang [login]
  app.get("/users/:userId/stats", { preHandler: app.requireRole() }, (req) =>
    scoring.getUserStats(userParams.parse(req.params).userId),
  );
  // GET /api/v1/scoring/:matchId: Papan skor [login]
  app.get("/:matchId", { preHandler: app.requireRole() }, (req) =>
    scoring.getScoreboard(matchParams.parse(req.params).matchId),
  );
  // GET /api/v1/scoring/:matchId/stats: Statistik match [login]
  app.get("/:matchId/stats", { preHandler: app.requireRole() }, (req) =>
    scoring.getMatchStats(matchParams.parse(req.params).matchId),
  );
  // POST /api/v1/scoring/:matchId/events: Input skor manual [coach]
  app.post("/:matchId/events", { preHandler: app.requireRole("coach") }, async (req, reply) =>
    reply
      .code(201)
      .send(await scoring.addScoreEvent(req.user!, matchParams.parse(req.params).matchId, addEventBody.parse(req.body))),
  );
  // POST /api/v1/scoring/:matchId/fouls: Catat pelanggaran [coach]
  app.post("/:matchId/fouls", { preHandler: app.requireRole("coach") }, async (req, reply) =>
    reply.code(201).send(await scoring.addFoul(req.user!, matchParams.parse(req.params).matchId, foulBody.parse(req.body))),
  );
  // PUT /api/v1/scoring/:matchId/players/:playerId/points: Isi atau koreksi poin peserta [coach]
  app.put("/:matchId/players/:playerId/points", { preHandler: app.requireRole("coach") }, (req) => {
    const { matchId, playerId } = playerParams.parse(req.params);
    return scoring.setPlayerPoints(req.user!, matchId, playerId, playerPointsBody.parse(req.body));
  });
  // PATCH /api/v1/scoring/events/:eventId: Konfirmasi atau koreksi usulan AI [coach]
  app.patch("/events/:eventId", { preHandler: app.requireRole("coach") }, (req) =>
    scoring.reviewScoreEvent(req.user!, eventParams.parse(req.params).eventId, reviewEventBody.parse(req.body)),
  );
  // DELETE /api/v1/scoring/events/:eventId: Batalkan kejadian skor [coach]
  app.delete("/events/:eventId", { preHandler: app.requireRole("coach") }, (req) =>
    scoring.voidScoreEvent(req.user!, eventParams.parse(req.params).eventId),
  );
}
