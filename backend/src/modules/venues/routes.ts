import type { FastifyInstance } from "fastify";
import {
  addCourtSchema,
  availabilityQuerySchema,
  createVenueSchema,
  searchVenuesSchema,
  setAvailabilitySchema,
  setPriceSchema,
  updateVenueSchema,
} from "./schema";
import { createVenuesService } from "./service";

export async function routes(app: FastifyInstance) {
  const venues = createVenuesService(app.ctx);

  // GET /api/v1/venues: Cari lapangan berdasarkan jarak dan cabang (lat, lng, sport, radius) [publik]
  app.get("/", (request) => venues.search(searchVenuesSchema.parse(request.query)));
  // GET /api/v1/venues/pending: Lapangan menunggu persetujuan [admin]
  app.get("/pending", { preHandler: app.requireRole("admin") }, () => venues.listPending());
  // GET /api/v1/venues/:id: Detail lapangan [publik]
  app.get<{ Params: { id: string } }>("/:id", (request) => venues.getVenue(request.params.id));
  // POST /api/v1/venues: Daftarkan lapangan baru [owner lapangan]
  app.post("/", { preHandler: app.requireRole("owner") }, async (request, reply) =>
    reply.code(201).send(await venues.createVenue(request.user!, createVenueSchema.parse(request.body))),
  );
  // PATCH /api/v1/venues/:id: Ubah data lapangan [owner lapangan]
  app.patch<{ Params: { id: string } }>("/:id", { preHandler: app.requireRole("owner") }, (request) =>
    venues.updateVenue(request.user!, request.params.id, updateVenueSchema.parse(request.body)),
  );
  // POST /api/v1/venues/:id/courts: Tambah court di lapangan [owner lapangan]
  app.post<{ Params: { id: string } }>(
    "/:id/courts",
    { preHandler: app.requireRole("owner") },
    async (request, reply) =>
      reply
        .code(201)
        .send(await venues.addCourt(request.user!, request.params.id, addCourtSchema.parse(request.body))),
  );
  // GET /api/v1/venues/courts/:courtId/availability: Jadwal kosong dan terpakai [publik]
  app.get<{ Params: { courtId: string } }>("/courts/:courtId/availability", (request) => {
    const q = availabilityQuerySchema.parse(request.query);
    return venues.getAvailability(request.params.courtId, q.from, q.to);
  });
  // PUT /api/v1/venues/courts/:courtId/availability: Update ketersediaan [owner lapangan]
  app.put<{ Params: { courtId: string } }>(
    "/courts/:courtId/availability",
    { preHandler: app.requireRole("owner") },
    (request) =>
      venues.setAvailability(request.user!, request.params.courtId, setAvailabilitySchema.parse(request.body)),
  );
  // PUT /api/v1/venues/courts/:courtId/price: Atur harga sewa [owner lapangan]
  app.put<{ Params: { courtId: string } }>(
    "/courts/:courtId/price",
    { preHandler: app.requireRole("owner") },
    (request) =>
      venues.setPrice(request.user!, request.params.courtId, setPriceSchema.parse(request.body).pricePerHour),
  );
  // POST /api/v1/venues/:id/approve: Setujui lapangan [admin]
  app.post<{ Params: { id: string } }>("/:id/approve", { preHandler: app.requireRole("admin") }, (request) =>
    venues.approve(request.params.id),
  );
  // POST /api/v1/venues/:id/reject: Tolak lapangan [admin]
  app.post<{ Params: { id: string } }>("/:id/reject", { preHandler: app.requireRole("admin") }, (request) =>
    venues.reject(request.params.id),
  );
}
