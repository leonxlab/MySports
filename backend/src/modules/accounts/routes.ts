import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // POST /api/v1/accounts/bootstrap: Buat profil dan role user setelah signup Supabase Auth [login]
  app.post("/bootstrap", { preHandler: app.requireRole() }, todo("Buat profil dan role user setelah signup Supabase Auth"));
  // GET /api/v1/accounts/me: Profil sendiri beserta role dan Level [login]
  app.get("/me", { preHandler: app.requireRole() }, todo("Profil sendiri beserta role dan Level"));
  // PATCH /api/v1/accounts/me: Ubah nama, usia, bio, foto [login]
  app.patch("/me", { preHandler: app.requireRole() }, todo("Ubah nama, usia, bio, foto"));
  // GET /api/v1/accounts/:id: Profil publik pemain lain (admin tampil sebagai user biasa) [login]
  app.get("/:id", { preHandler: app.requireRole() }, todo("Profil publik pemain lain (admin tampil sebagai user biasa)"));
  // PUT /api/v1/accounts/me/experience/:sport: Isi pengalaman bermain per cabang [login]
  app.put("/me/experience/:sport", { preHandler: app.requireRole() }, todo("Isi pengalaman bermain per cabang"));
  // POST /api/v1/accounts/me/gallery: Tambah foto, video, atau quote ke galeri [login]
  app.post("/me/gallery", { preHandler: app.requireRole() }, todo("Tambah foto, video, atau quote ke galeri"));
  // DELETE /api/v1/accounts/me/gallery/:itemId: Hapus item galeri [login]
  app.delete("/me/gallery/:itemId", { preHandler: app.requireRole() }, todo("Hapus item galeri"));
  // POST /api/v1/accounts/me/photo/sign: Minta signed URL upload foto profil [login]
  app.post("/me/photo/sign", { preHandler: app.requireRole() }, todo("Minta signed URL upload foto profil"));
}
