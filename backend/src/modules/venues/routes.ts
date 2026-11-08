import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // GET /api/v1/venues: Cari lapangan berdasarkan jarak dan cabang (lat, lng, sport, radius) [publik]
  app.get("/", todo("Cari lapangan berdasarkan jarak dan cabang (lat, lng, sport, radius)"));
  // GET /api/v1/venues/pending: Lapangan menunggu persetujuan [admin]
  app.get("/pending", { preHandler: app.requireRole("admin") }, todo("Lapangan menunggu persetujuan"));
  // GET /api/v1/venues/:id: Detail lapangan [publik]
  app.get("/:id", todo("Detail lapangan"));
  // POST /api/v1/venues: Daftarkan lapangan baru [owner lapangan]
  app.post("/", { preHandler: app.requireRole("owner") }, todo("Daftarkan lapangan baru"));
  // PATCH /api/v1/venues/:id: Ubah data lapangan [owner lapangan]
  app.patch("/:id", { preHandler: app.requireRole("owner") }, todo("Ubah data lapangan"));
  // POST /api/v1/venues/:id/courts: Tambah court di lapangan [owner lapangan]
  app.post("/:id/courts", { preHandler: app.requireRole("owner") }, todo("Tambah court di lapangan"));
  // GET /api/v1/venues/courts/:courtId/availability: Jadwal kosong dan terpakai [publik]
  app.get("/courts/:courtId/availability", todo("Jadwal kosong dan terpakai"));
  // PUT /api/v1/venues/courts/:courtId/availability: Update ketersediaan [owner lapangan]
  app.put("/courts/:courtId/availability", { preHandler: app.requireRole("owner") }, todo("Update ketersediaan"));
  // PUT /api/v1/venues/courts/:courtId/price: Atur harga sewa [owner lapangan]
  app.put("/courts/:courtId/price", { preHandler: app.requireRole("owner") }, todo("Atur harga sewa"));
  // POST /api/v1/venues/:id/approve: Setujui lapangan [admin]
  app.post("/:id/approve", { preHandler: app.requireRole("admin") }, todo("Setujui lapangan"));
  // POST /api/v1/venues/:id/reject: Tolak lapangan [admin]
  app.post("/:id/reject", { preHandler: app.requireRole("admin") }, todo("Tolak lapangan"));
}
