import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // POST /api/v1/role-requests/coach: Ajukan jadi Coach dengan bukti pengalaman dan prestasi [login]
  app.post("/coach", { preHandler: app.requireRole() }, todo("Ajukan jadi Coach dengan bukti pengalaman dan prestasi"));
  // POST /api/v1/role-requests/owner: Ajukan jadi Owner Lapangan [login]
  app.post("/owner", { preHandler: app.requireRole() }, todo("Ajukan jadi Owner Lapangan"));
  // GET /api/v1/role-requests/mine: Status pengajuan milik sendiri [login]
  app.get("/mine", { preHandler: app.requireRole() }, todo("Status pengajuan milik sendiri"));
  // GET /api/v1/role-requests: Daftar pengajuan menunggu [admin]
  app.get("/", { preHandler: app.requireRole("admin") }, todo("Daftar pengajuan menunggu"));
  // POST /api/v1/role-requests/:id/approve: Setujui pengajuan (memberi role) [admin]
  app.post("/:id/approve", { preHandler: app.requireRole("admin") }, todo("Setujui pengajuan (memberi role)"));
  // POST /api/v1/role-requests/:id/reject: Tolak pengajuan [admin]
  app.post("/:id/reject", { preHandler: app.requireRole("admin") }, todo("Tolak pengajuan"));
}
