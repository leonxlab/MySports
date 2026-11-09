import type { AppContext } from "../../core/context";
import { AppError, forbidden, notFound } from "../../core/errors";
import { computeFees, computeWithdrawFee, type FeeModel } from "./fees";
import { createGateway, type PaymentGateway } from "./gateway";
import type { PaymentStatus } from "./state";
import { createVenuesApi, type VenuesApi } from "../venues";

export type PaymentTargetType = "open_play" | "court_booking" | "equipment_rental";

export interface CreateCheckoutInput {
  payerId: string;
  targetType: PaymentTargetType;
  targetId: string;
}

export interface CheckoutResult {
  paymentId: string;
  status: PaymentStatus;
  /** Rupiah bulat, dihitung server dari harga target. */
  chargeAmount: number;
  /** Hanya untuk tampilan. Status akhir selalu dari webhook. */
  redirectUrl: string | null;
}

export interface PaidPayment {
  paymentId: string;
  payerId: string;
  payeeId: string | null;
  targetType: PaymentTargetType;
  targetId: string;
  amount: number;
}

export type OnPaidHandler = (payment: PaidPayment) => Promise<void>;

export interface FeeSettings {
  model: FeeModel;
  percent: number;
}

export interface WebhookResult {
  /** `duplicate` = sudah pernah diproses, `ignored` = referensi tidak dikenal. */
  outcome: "paid" | "failed" | "duplicate" | "ignored";
}

interface PaymentRow {
  id: string;
  payer_id: string;
  payee_id: string | null;
  target_type: PaymentTargetType;
  target_id: string;
  amount: number | string;
  fee_amount: number | string;
  fee_model: FeeModel | null;
  gateway_ref: string | null;
  status: PaymentStatus;
}

export type VenuesPort = Pick<VenuesApi, "getCourt" | "findFreeSlots" | "markSlotBooked" | "releaseSlot" | "releaseRange">;

export interface Dependencies {
  /** Untuk test. Default: dari env (PAYMENT_PROVIDER). */
  gateway?: PaymentGateway;
  /** Untuk test. Default: createVenuesApi(ctx). */
  venues?: VenuesPort;
}

export interface CreateBookingInput {
  bookedBy: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
}

// handler internal (konfirmasi booking) cukup didaftarkan sekali per AppContext
const initialized = new WeakSet<AppContext>();

// Satu registri per AppContext, supaya createPaymentsApi(ctx) yang dipanggil berulang
// oleh modul berbeda (open-play, equipment) memakai daftar handler yang sama.
const handlerRegistry = new WeakMap<AppContext, Map<PaymentTargetType, OnPaidHandler[]>>();

function handlersFor(ctx: AppContext) {
  let map = handlerRegistry.get(ctx);
  if (!map) {
    map = new Map();
    handlerRegistry.set(ctx, map);
  }
  return map;
}

const money = (v: number | string) => Math.round(Number(v));

/** Yang ditagih ke pembayar: harga + fee bila model payer_fee. */
const chargeOf = (p: Pick<PaymentRow, "amount" | "fee_amount" | "fee_model">) =>
  money(p.amount) + (p.fee_model === "payer_fee" ? money(p.fee_amount) : 0);

/** Harga sewa: tarif per jam x durasi, dibulatkan ke rupiah terdekat. */
export function bookingPrice(pricePerHour: number, startsAt: string, endsAt: string): number {
  const minutes = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000;
  return Math.round((pricePerHour * minutes) / 60);
}

/**
 * Logika bisnis modul payments. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: payments, wallets, wallet_entries, withdrawals, fee_settings, court_bookings.
 */
export function createPaymentsService(ctx: AppContext, deps: Dependencies = {}) {
  const db = ctx.supabase;
  let gatewayInstance = deps.gateway;
  const venues: VenuesPort = deps.venues ?? createVenuesApi(ctx);

  function gateway(): PaymentGateway {
    if (gatewayInstance) return gatewayInstance;
    try {
      gatewayInstance = createGateway(ctx.env);
      return gatewayInstance;
    } catch {
      throw new AppError(503, "PAYMENT_PROVIDER_NOT_CONFIGURED", "Payment gateway belum dikonfigurasi");
    }
  }

  async function getFeeSettings(): Promise<FeeSettings> {
    const { data, error } = await db.from("fee_settings").select("model, percent").eq("id", 1).single();
    if (error) throw error;
    return { model: data.model as FeeModel, percent: Number(data.percent) };
  }

  /**
   * Harga dan penerima SELALU dari server. Klien hanya menyebut target.
   * TODO(integration): court_booking menunggu venues.findFreeSlots/markSlotBooked (booking lapangan),
   * equipment_rental menunggu modul equipment (Fase 4).
   */
  async function resolveTarget(input: CreateCheckoutInput) {
    if (input.targetType === "open_play") {
      const { data: op, error } = await db
        .from("open_plays")
        .select("id, coach_id, price, status")
        .eq("id", input.targetId)
        .maybeSingle();
      if (error) throw error;
      if (!op) throw notFound("OPEN_PLAY_NOT_FOUND", "Open play tidak ditemukan");

      const { data: part, error: pErr } = await db
        .from("open_play_participants")
        .select("status")
        .eq("open_play_id", input.targetId)
        .eq("user_id", input.payerId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!part || part.status !== "pending_payment") {
        throw new AppError(409, "NOT_PENDING_PAYMENT", "Kamu belum join open play ini atau sudah membayar");
      }
      return { amount: money(op.price), payeeId: op.coach_id as string, description: "Open play" };
    }
    if (input.targetType === "court_booking") {
      const { data: b, error } = await db
        .from("court_bookings")
        .select("id, booked_by, court_id, starts_at, ends_at, status")
        .eq("id", input.targetId)
        .maybeSingle();
      if (error) throw error;
      if (!b || b.booked_by !== input.payerId) throw notFound("BOOKING_NOT_FOUND", "Booking tidak ditemukan");
      if (b.status !== "pending") throw new AppError(409, "BOOKING_NOT_PENDING", "Booking sudah diproses");
      const court = await venues.getCourt(b.court_id as string);
      return {
        amount: bookingPrice(court.pricePerHour, b.starts_at as string, b.ends_at as string),
        payeeId: court.venue.ownerId,
        description: `Sewa ${court.venue.name} - ${court.name}`,
      };
    }
    throw new AppError(501, "NOT_IMPLEMENTED", `Checkout untuk ${input.targetType} belum diimplementasi`);
  }

  /** Lepas tahanan slot dan batalkan booking yang belum dibayar. */
  async function cancelBooking(bookingId: string) {
    const { data: b, error } = await db
      .from("court_bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId)
      .eq("status", "pending")
      .select("court_id, starts_at, ends_at");
    if (error) throw error;
    const row = (b ?? [])[0];
    if (row) await venues.releaseRange(row.court_id as string, row.starts_at as string, row.ends_at as string);
  }

  async function loadPayment(id: string): Promise<PaymentRow> {
    const { data, error } = await db.from("payments").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("PAYMENT_NOT_FOUND", "Pembayaran tidak ditemukan");
    return data as PaymentRow;
  }

  const service = {
    /** Dipanggil modul lain (open-play, equipment) untuk bereaksi saat pembayaran lunas. */
    onPaid(targetType: PaymentTargetType, handler: OnPaidHandler): void {
      const map = handlersFor(ctx);
      map.set(targetType, [...(map.get(targetType) ?? []), handler]);
    },

    /** Dipanggil internal oleh handler webhook setelah event `paid` yang valid. */
    async dispatchPaid(payment: PaidPayment): Promise<void> {
      for (const handler of handlersFor(ctx).get(payment.targetType) ?? []) {
        await handler(payment);
      }
    },

    /**
     * Sewa lapangan. Slot ditahan (atomik) sejak booking dibuat supaya dua orang tidak membayar
     * jam yang sama; dilepas lagi bila pembayaran gagal. TODO(decision): batas waktu tahan slot
     * yang tidak dibayar (belum ada penjadwal).
     */
    async createBooking(input: CreateBookingInput) {
      const court = await venues.getCourt(input.courtId);
      if (!court.active || court.venue.status !== "approved") {
        throw new AppError(409, "COURT_UNAVAILABLE", "Court tidak tersedia");
      }
      if (court.venue.ownerId === input.bookedBy) {
        throw new AppError(400, "SELF_PAYMENT", "Tidak bisa menyewa lapangan sendiri");
      }
      const slots = await venues.findFreeSlots(input.courtId, input.startsAt, input.endsAt);
      if (!slots) throw new AppError(409, "SLOT_UNAVAILABLE", "Jam yang dipilih tidak tersedia");
      await venues.markSlotBooked(slots.map((s) => s.id));

      try {
        const { data, error } = await db
          .from("court_bookings")
          .insert({
            booked_by: input.bookedBy,
            court_id: input.courtId,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
          })
          .select("id")
          .single();
        if (error) throw error;
        const bookingId = data.id as string;
        const checkout = await service.createCheckout({
          payerId: input.bookedBy,
          targetType: "court_booking",
          targetId: bookingId,
        });
        return { bookingId, checkout };
      } catch (e) {
        await venues.releaseSlot(slots.map((s) => s.id));
        throw e;
      }
    },

    async listMyBookings(userId: string) {
      const { data, error } = await db
        .from("court_bookings")
        .select("id, court_id, starts_at, ends_at, status, payment_id, created_at")
        .eq("booked_by", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b) => ({
        id: b.id as string,
        courtId: b.court_id as string,
        startsAt: b.starts_at as string,
        endsAt: b.ends_at as string,
        status: b.status as string,
        paymentId: (b.payment_id as string | null) ?? null,
      }));
    },

    async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
      const target = await resolveTarget(input);
      if (target.payeeId === input.payerId) {
        throw new AppError(400, "SELF_PAYMENT", "Tidak bisa membayar diri sendiri");
      }

      // idempoten: satu tagihan pending per pembayar dan target
      const { data: existing, error: exErr } = await db
        .from("payments")
        .select("*")
        .eq("payer_id", input.payerId)
        .eq("target_type", input.targetType)
        .eq("target_id", input.targetId)
        .eq("status", "pending")
        .maybeSingle();
      if (exErr) throw exErr;
      if (existing) {
        const p = existing as PaymentRow;
        return { paymentId: p.id, status: p.status, chargeAmount: chargeOf(p), redirectUrl: null };
      }

      const gw = gateway();
      const settings = await getFeeSettings();
      const fees = computeFees(settings.model, settings.percent, target.amount);

      const { data: row, error } = await db
        .from("payments")
        .insert({
          payer_id: input.payerId,
          payee_id: target.payeeId,
          target_type: input.targetType,
          target_id: input.targetId,
          amount: target.amount,
          fee_amount: fees.platformFee,
          fee_model: settings.model,
          gateway: gw.name,
        })
        .select("id")
        .single();
      if (error) throw error;
      const paymentId = row.id as string;

      try {
        const charge = await gw.createCharge({
          idempotencyKey: paymentId,
          amount: fees.chargeAmount,
          description: target.description,
        });
        const { error: upErr } = await db
          .from("payments")
          .update({ gateway_ref: charge.gatewayRef })
          .eq("id", paymentId);
        if (upErr) throw upErr;
        return {
          paymentId,
          status: "pending",
          chargeAmount: fees.chargeAmount,
          redirectUrl: charge.redirectUrl,
        };
      } catch (e) {
        await db.from("payments").update({ status: "failed" }).eq("id", paymentId).eq("status", "pending");
        throw e;
      }
    },

    /**
     * Satu-satunya jalan status bayar berubah. Signature diverifikasi dulu, lalu transisi
     * pending -> paid/failed dilakukan dengan UPDATE bersyarat, jadi webhook ganda tidak
     * pernah memicu efek dua kali.
     */
    async handleWebhook(rawBody: string, headers: Record<string, string | undefined>): Promise<WebhookResult> {
      const gw = gateway();
      if (!gw.verifyWebhook(rawBody, headers)) {
        throw new AppError(401, "INVALID_SIGNATURE", "Signature webhook tidak valid");
      }
      let event;
      try {
        event = gw.parseEvent(rawBody);
      } catch {
        throw new AppError(400, "INVALID_EVENT", "Isi webhook tidak valid");
      }

      const { data: found, error } = await db
        .from("payments")
        .select("*")
        .eq("gateway_ref", event.gatewayRef)
        .maybeSingle();
      if (error) throw error;
      if (!found) return { outcome: "ignored" };
      const payment = found as PaymentRow;

      if (event.status === "paid" && event.amount !== chargeOf(payment)) {
        throw new AppError(422, "AMOUNT_MISMATCH", "Jumlah yang dibayar tidak sesuai tagihan");
      }

      const patch =
        event.status === "paid" ? { status: "paid", paid_at: new Date().toISOString() } : { status: "failed" };
      const { data: changed, error: upErr } = await db
        .from("payments")
        .update(patch)
        .eq("id", payment.id)
        .eq("status", "pending")
        .select("id");
      if (upErr) throw upErr;
      if ((changed ?? []).length === 0) return { outcome: "duplicate" };

      if (event.status === "failed") {
        if (payment.target_type === "court_booking") await cancelBooking(payment.target_id);
        return { outcome: "failed" };
      }

      await service.dispatchPaid({
        paymentId: payment.id,
        payerId: payment.payer_id,
        payeeId: payment.payee_id,
        targetType: payment.target_type,
        targetId: payment.target_id,
        amount: money(payment.amount),
      });
      return { outcome: "paid" };
    },

    /**
     * Teruskan dana ke saldo penerima. Aman dipanggil berulang: hanya status `paid` yang bisa disettle.
     * TODO(decision): kapan dipanggil. Asumsi: open_play setelah open play selesai, court_booking segera.
     */
    async settle(paymentId: string): Promise<void> {
      const payment = await loadPayment(paymentId);
      if (!payment.payee_id) throw new AppError(409, "NO_PAYEE", "Pembayaran tidak punya penerima");
      const { error } = await db.rpc("payments_settle", {
        p_payment_id: paymentId,
        p_payee: payment.payee_id,
        p_credit: money(payment.amount),
      });
      if (error) {
        const msg = (error as { message?: string }).message ?? "";
        if (msg.includes("PAYMENT_NOT_PAID")) {
          throw new AppError(409, "PAYMENT_NOT_PAID", "Hanya pembayaran berstatus paid yang bisa diteruskan");
        }
        throw error;
      }
    },

    getFeeSettings,

    async updateFeeSettings(adminId: string, input: FeeSettings): Promise<FeeSettings> {
      const { error } = await db
        .from("fee_settings")
        .update({
          model: input.model,
          percent: input.percent,
          updated_by: adminId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      if (error) throw error;
      return getFeeSettings();
    },

    async getWallet(userId: string) {
      const { data, error } = await db.from("wallets").select("balance").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return { balance: money(data?.balance ?? 0) };
    },

    async listWalletEntries(userId: string, limit = 50) {
      const { data, error } = await db
        .from("wallet_entries")
        .select("id, kind, amount, payment_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((e) => ({
        id: e.id as string,
        kind: e.kind as string,
        amount: money(e.amount),
        paymentId: (e.payment_id as string | null) ?? null,
        createdAt: e.created_at as string,
      }));
    },

    /**
     * TODO(decision): tujuan transfer (rekening/e-wallet) dan penyedia payout belum dipilih.
     * Saat ini penarikan hanya tercatat berstatus `requested`.
     */
    async requestWithdrawal(userId: string, amount: number) {
      const settings = await getFeeSettings();
      const fee = settings.model === "withdraw_percent" ? computeWithdrawFee(settings.percent, amount).fee : 0;
      const { data, error } = await db.rpc("wallet_withdraw", { p_user: userId, p_amount: amount, p_fee: fee });
      if (error) {
        const msg = (error as { message?: string }).message ?? "";
        if (msg.includes("INSUFFICIENT_BALANCE")) {
          throw new AppError(409, "INSUFFICIENT_BALANCE", "Saldo tidak cukup");
        }
        throw error;
      }
      return { id: data as string, amount, fee, net: amount - fee, status: "requested" as const };
    },

    async listWithdrawals(userId: string) {
      const { data, error } = await db
        .from("withdrawals")
        .select("id, amount, fee_amount, status, created_at, processed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((w) => ({
        id: w.id as string,
        amount: money(w.amount),
        fee: money(w.fee_amount),
        status: w.status as string,
        createdAt: w.created_at as string,
        processedAt: (w.processed_at as string | null) ?? null,
      }));
    },

    /** Pembayaran milik pemanggil saja. */
    async getPayment(userId: string, id: string) {
      const p = await loadPayment(id);
      if (p.payer_id !== userId) throw forbidden("Bukan pembayaranmu");
      return { id: p.id, status: p.status, chargeAmount: chargeOf(p) };
    },
  };

  if (!initialized.has(ctx)) {
    initialized.add(ctx);
    // Booking lapangan lunas: konfirmasi booking, lalu teruskan dana ke Owner segera.
    // TODO(decision): kapan settle untuk court_booking (asumsi: segera setelah dibayar).
    service.onPaid("court_booking", async (p) => {
      const { error } = await db
        .from("court_bookings")
        .update({ status: "confirmed", payment_id: p.paymentId })
        .eq("id", p.targetId)
        .eq("status", "pending");
      if (error) throw error;
      await service.settle(p.paymentId);
    });
  }
  return service;
}

export type PaymentsService = ReturnType<typeof createPaymentsService>;
