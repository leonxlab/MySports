import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/open-play: Cari open play berdasarkan jarak, cabang, tanggal [publik]
  app.get("/", todo("Cari open play berdasarkan jarak, cabang, tanggal"));
  // GET /api/v1/open-play/members/search: Coach mencari pemain [coach]
  app.get("/members/search", { preHandler: app.requireRole("coach") }, todo("Coach mencari pemain"));
  // GET /api/v1/open-play/members/:userId: Info lengkap member (nama, umur, pengalaman, Level, galeri) [coach]
  app.get("/members/:userId", { preHandler: app.requireRole("coach") }, todo("Info lengkap member (nama, umur, pengalaman, Level, galeri)"));
  // GET /api/v1/open-play/:id: Detail open play [publik]
  app.get("/:id", todo("Detail open play"));
  // POST /api/v1/open-play: Buat open play [coach]
  app.post("/", { preHandler: app.requireRole("coach") }, todo("Buat open play"));
  // PATCH /api/v1/open-play/:id: Setting slot: kuota, jam, harga, status [coach]
  app.patch("/:id", { preHandler: app.requireRole("coach") }, todo("Setting slot: kuota, jam, harga, status"));
  // POST /api/v1/open-play/:id/join: Join dan mulai pembayaran [login]
  app.post("/:id/join", { preHandler: app.requireRole() }, todo("Join dan mulai pembayaran"));
  // DELETE /api/v1/open-play/:id/join: Batal join [login]
  app.delete("/:id/join", { preHandler: app.requireRole() }, todo("Batal join"));
  // GET /api/v1/open-play/:id/participants: Peserta terkonfirmasi [coach]
  app.get("/:id/participants", { preHandler: app.requireRole("coach") }, todo("Peserta terkonfirmasi"));
}
