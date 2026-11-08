import type { FastifyInstance } from "fastify";
import { todo } from "../../core/errors";

export async function routes(app: FastifyInstance) {
  // POST /api/v1/payments/checkout: Buat pembayaran untuk open play, sewa lapangan, atau sewa alat [login]
  app.post("/checkout", { preHandler: app.requireRole() }, todo("Buat pembayaran untuk open play, sewa lapangan, atau sewa alat"));
  // POST /api/v1/payments/webhook/:provider: Callback gateway (verifikasi signature, idempotent) [publik]
  app.post("/webhook/:provider", todo("Callback gateway (verifikasi signature, idempotent)"));
  // POST /api/v1/payments/bookings: Sewa lapangan [login]
  app.post("/bookings", { preHandler: app.requireRole() }, todo("Sewa lapangan"));
  // GET /api/v1/payments/bookings/mine: Booking milik sendiri [login]
  app.get("/bookings/mine", { preHandler: app.requireRole() }, todo("Booking milik sendiri"));
  // GET /api/v1/payments/wallet: Saldo [login]
  app.get("/wallet", { preHandler: app.requireRole() }, todo("Saldo"));
  // GET /api/v1/payments/wallet/entries: Riwayat saldo [login]
  app.get("/wallet/entries", { preHandler: app.requireRole() }, todo("Riwayat saldo"));
  // POST /api/v1/payments/withdrawals: Tarik saldo [login]
  app.post("/withdrawals", { preHandler: app.requireRole() }, todo("Tarik saldo"));
  // GET /api/v1/payments/withdrawals: Riwayat penarikan [login]
  app.get("/withdrawals", { preHandler: app.requireRole() }, todo("Riwayat penarikan"));
  // GET /api/v1/payments/fee-settings: Model dan persen biaya layanan [admin]
  app.get("/fee-settings", { preHandler: app.requireRole("admin") }, todo("Model dan persen biaya layanan"));
  // PUT /api/v1/payments/fee-settings: Ubah model (potongan saat withdraw / fee ke pembayar) dan persen [admin]
  app.put("/fee-settings", { preHandler: app.requireRole("admin") }, todo("Ubah model (potongan saat withdraw / fee ke pembayar) dan persen"));
}
