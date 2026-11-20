import type { FastifyInstance } from "fastify";
import {
  createOpenPlaySchema,
  memberSearchSchema,
  searchOpenPlaySchema,
  updateOpenPlaySchema,
} from "./schema";
import { createOpenPlayService } from "./service";

export async function routes(app: FastifyInstance) {
  const openPlay = createOpenPlayService(app.ctx);

  // GET /api/v1/open-play: Cari open play berdasarkan jarak, cabang, tanggal [publik]
  app.get("/", (request) => openPlay.listNearby(searchOpenPlaySchema.parse(request.query)));
  // GET /api/v1/open-play/members/search: Coach mencari pemain [coach]
  app.get("/members/search", { preHandler: app.requireRole("coach") }, (request) => {
    const q = memberSearchSchema.parse(request.query);
    return openPlay.searchMembers(q.q, q.sport);
  });
  // GET /api/v1/open-play/members/:userId: Info lengkap member (nama, umur, pengalaman, Level, galeri) [coach]
  app.get<{ Params: { userId: string } }>(
    "/members/:userId",
    { preHandler: app.requireRole("coach") },
    (request) => openPlay.getMember(request.params.userId),
  );
  // GET /api/v1/open-play/:id: Detail open play [publik]
  app.get<{ Params: { id: string } }>("/:id", (request) => openPlay.get(request.params.id));
  // POST /api/v1/open-play: Buat open play [coach]
  app.post("/", { preHandler: app.requireRole("coach") }, async (request, reply) =>
    reply.code(201).send(await openPlay.create(request.user!, createOpenPlaySchema.parse(request.body))),
  );
  // PATCH /api/v1/open-play/:id: Setting slot: kuota, jam, harga, status [coach]
  app.patch<{ Params: { id: string } }>("/:id", { preHandler: app.requireRole("coach") }, (request) =>
    openPlay.update(request.user!, request.params.id, updateOpenPlaySchema.parse(request.body)),
  );
  // POST /api/v1/open-play/:id/join: Join dan mulai pembayaran [login]
  app.post<{ Params: { id: string } }>(
    "/:id/join",
    { preHandler: app.requireRole() },
    async (request, reply) => reply.code(201).send(await openPlay.join(request.user!.id, request.params.id)),
  );
  // DELETE /api/v1/open-play/:id/join: Batal join [login]
  app.delete<{ Params: { id: string } }>("/:id/join", { preHandler: app.requireRole() }, async (request, reply) => {
    await openPlay.leave(request.user!.id, request.params.id);
    return reply.code(204).send();
  });
  // GET /api/v1/open-play/:id/participants: Peserta terkonfirmasi [coach]
  app.get<{ Params: { id: string } }>("/:id/participants", { preHandler: app.requireRole("coach") }, (request) =>
    openPlay.listParticipants(request.user!, request.params.id),
  );
}
