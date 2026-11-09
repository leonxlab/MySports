import type { AppContext } from "../../core/context";
import { AppError } from "../../core/errors";
import type { FeeModel } from "./fees";
import type { PaymentStatus } from "./state";

export type PaymentTargetType = "open_play" | "court_booking" | "equipment_rental";

export interface CreateCheckoutInput {
  payerId: string;
  targetType: PaymentTargetType;
  targetId: string;
  /** Mencegah checkout ganda untuk target yang sama. Dibuat server, bukan dari klien. */
  idempotencyKey: string;
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

const notImplemented = (fn: string) =>
  new AppError(501, "NOT_IMPLEMENTED", `payments.${fn} belum diimplementasi`);

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

/**
 * Logika bisnis modul payments. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: payments, wallets, wallet_entries, withdrawals, fee_settings, court_bookings.
 *
 * Saat ini kerangka tipe (INTEGRATION.md): `onPaid` dan `dispatchPaid` sudah bekerja,
 * sisanya melempar 501 sampai diimplementasi di issue berikutnya.
 */
export function createPaymentsService(ctx: AppContext) {
  return {
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

    // TODO(integration): dipakai open-play (join) dan booking lapangan.
    async createCheckout(_input: CreateCheckoutInput): Promise<CheckoutResult> {
      throw notImplemented("createCheckout");
    },

    async settle(_paymentId: string): Promise<void> {
      throw notImplemented("settle");
    },

    async getFeeSettings(): Promise<FeeSettings> {
      throw notImplemented("getFeeSettings");
    },
  };
}

export type PaymentsService = ReturnType<typeof createPaymentsService>;
