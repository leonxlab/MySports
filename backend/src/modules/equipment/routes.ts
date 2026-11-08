import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/equipment: Cari alat terdekat (rekomendasi alat milik Coach lebih dulu) [login]
  app.get("/", { preHandler: app.requireRole() }, todo("Cari alat terdekat (rekomendasi alat milik Coach lebih dulu)"));
  // GET /api/v1/equipment/:id: Detail alat [login]
  app.get("/:id", { preHandler: app.requireRole() }, todo("Detail alat"));
  // POST /api/v1/equipment: Daftarkan alat untuk disewakan [login]
  app.post("/", { preHandler: app.requireRole() }, todo("Daftarkan alat untuk disewakan"));
  // PATCH /api/v1/equipment/:id: Ubah data alat [login]
  app.patch("/:id", { preHandler: app.requireRole() }, todo("Ubah data alat"));
  // POST /api/v1/equipment/:id/rent: Sewa alat [login]
  app.post("/:id/rent", { preHandler: app.requireRole() }, todo("Sewa alat"));
}
