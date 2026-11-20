import type { FastifyInstance } from "fastify";
import { AppError } from "../../core/errors";
import { bookingSchema, checkoutSchema, entriesQuerySchema, feePreviewSchema, feeSettingsSchema, withdrawSchema } from "./schema";
import { createPaymentsService } from "./service";

export async function routes(app: FastifyInstance) {
  const payments = createPaymentsService(app.ctx);

  // Webhook butuh byte asli body untuk verifikasi signature. Parser ini hanya berlaku di modul payments.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (request, body, done) => {
    if (request.url.includes("/webhook/")) return done(null, body);
    try {
      done(null, body === "" ? {} : JSON.parse(body as string));
    } catch {
      done(new AppError(400, "INVALID_JSON", "Body bukan JSON yang valid"), undefined);
    }
  });

  // POST /api/v1/payments/checkout: Buat pembayaran untuk open play, sewa lapangan, atau sewa alat [login]
  app.post("/checkout", { preHandler: app.requireRole() }, async (request, reply) => {
    const input = checkoutSchema.parse(request.body);
    return reply.code(201).send(await payments.createCheckout({ payerId: request.user!.id, ...input }));
  });

  // POST /api/v1/payments/webhook/:provider: Callback gateway (verifikasi signature, idempotent) [publik]
  app.post<{ Params: { provider: string } }>("/webhook/:provider", async (request) => {
    if (typeof request.body !== "string") throw new AppError(400, "INVALID_EVENT", "Body webhook kosong");
    const headers = Object.fromEntries(
      Object.entries(request.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    );
    return payments.handleWebhook(request.body, headers);
  });

  // POST /api/v1/payments/bookings: Sewa lapangan [login]
  app.post("/bookings", { preHandler: app.requireRole() }, async (request, reply) => {
    const input = bookingSchema.parse(request.body);
    return reply.code(201).send(await payments.createBooking({ bookedBy: request.user!.id, ...input }));
  });
  // GET /api/v1/payments/bookings/mine: Booking milik sendiri [login]
  app.get("/bookings/mine", { preHandler: app.requireRole() }, (request) =>
    payments.listMyBookings(request.user!.id),
  );

  // GET /api/v1/payments/wallet: Saldo [login]
  app.get("/wallet", { preHandler: app.requireRole() }, (request) => payments.getWallet(request.user!.id));
  // GET /api/v1/payments/wallet/entries: Riwayat saldo [login]
  app.get("/wallet/entries", { preHandler: app.requireRole() }, (request) =>
    payments.listWalletEntries(request.user!.id, entriesQuerySchema.parse(request.query).limit),
  );
  // POST /api/v1/payments/withdrawals: Tarik saldo [login]
  app.post("/withdrawals", { preHandler: app.requireRole() }, async (request, reply) =>
    reply.code(201).send(await payments.requestWithdrawal(request.user!.id, withdrawSchema.parse(request.body).amount)),
  );
  // GET /api/v1/payments/withdrawals: Riwayat penarikan [login]
  app.get("/withdrawals", { preHandler: app.requireRole() }, (request) =>
    payments.listWithdrawals(request.user!.id),
  );
  // GET /api/v1/payments/fee-settings: Model dan persen biaya layanan [admin]
  app.get("/fee-settings", { preHandler: app.requireRole("admin") }, () => payments.getFeeSettings());
  // PUT /api/v1/payments/fee-settings: Ubah model (potongan saat withdraw / fee ke pembayar) dan persen [admin]
  app.put("/fee-settings", { preHandler: app.requireRole("admin") }, (request) =>
    payments.updateFeeSettings(request.user!.id, feeSettingsSchema.parse(request.body)),
  );
  // GET /api/v1/payments/fee-preview: Contoh hitungan biaya sebelum disimpan [admin]
  app.get("/fee-preview", { preHandler: app.requireRole("admin") }, (request) => {
    const q = feePreviewSchema.parse(request.query);
    return payments.previewFees(q.model, q.percent, q.amount);
  });
  // GET /api/v1/payments/:id: Status satu pembayaran milik sendiri [login]
  app.get<{ Params: { id: string } }>("/:id", { preHandler: app.requireRole() }, (request) =>
    payments.getPayment(request.user!.id, request.params.id),
  );
}
