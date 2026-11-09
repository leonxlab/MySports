// Tipe data modul payments (bentuk respons API). Ditulis ulang dari backend/src/modules/payments/service.ts.
// Semua nominal: rupiah bulat. Frontend hanya menampilkan, tidak menghitung biaya.

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentTargetType = "open_play" | "court_booking" | "equipment_rental";

export interface CheckoutResult {
  paymentId: string;
  status: PaymentStatus;
  /** Total yang dibayar pembayar, dihitung server. */
  chargeAmount: number;
  /** Hanya untuk tampilan. Status akhir selalu dari webhook. */
  redirectUrl: string | null;
}

export interface CreateBookingBody {
  courtId: string;
  startsAt: string;
  endsAt: string;
}
export interface CreateBookingResult {
  bookingId: string;
  checkout: CheckoutResult;
}

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "expired" | string;
export interface BookingView {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  paymentId: string | null;
}

export interface Wallet {
  balance: number;
}
export interface WalletEntry {
  id: string;
  kind: string;
  amount: number;
  paymentId: string | null;
  createdAt: string;
}
export interface WithdrawalView {
  id: string;
  amount: number;
  fee: number;
  status: string;
  createdAt: string;
  processedAt: string | null;
}
export interface WithdrawalResult {
  id: string;
  amount: number;
  fee: number;
  net: number;
  status: "requested";
}

export type FeeModel = "withdraw_percent" | "payer_fee";
export interface FeeSettings {
  model: FeeModel;
  percent: number;
}

export interface PaymentStatusView {
  id: string;
  status: PaymentStatus | "settled";
  chargeAmount: number;
}

/** Contoh hitungan dari server. Frontend tidak menghitung biaya sendiri. */
export interface FeePreview {
  charge: {
    chargeAmount: number;
    creditAmount: number;
    platformFee: number;
    gatewayFee: number;
    platformNet: number;
  };
  withdraw: { fee: number; net: number } | null;
}
