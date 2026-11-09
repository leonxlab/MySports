import { apiClient } from "@/lib/api-client";
import type {
  BookingView,
  CheckoutResult,
  CreateBookingBody,
  CreateBookingResult,
  FeePreview,
  FeeSettings,
  PaymentStatusView,
  PaymentTargetType,
  Wallet,
  WalletEntry,
  WithdrawalResult,
  WithdrawalView,
} from "./types";

// Panggilan API modul payments. Daftar endpoint: backend/src/modules/payments/README.md
// paymentWebhook sengaja tidak ada: webhook dipanggil gateway, bukan frontend.
export const paymentsApi = {
  /** Buat pembayaran untuk open play, sewa lapangan, atau sewa alat */
  createCheckout: (body: { targetType: PaymentTargetType; targetId: string }) =>
    apiClient.request<CheckoutResult>("POST", "/payments/checkout", { body }),
  /** Sewa lapangan */
  createCourtBooking: (body: CreateBookingBody) =>
    apiClient.request<CreateBookingResult>("POST", "/payments/bookings", { body }),
  /** Booking milik sendiri */
  listMyBookings: () => apiClient.request<BookingView[]>("GET", "/payments/bookings/mine"),
  /** Saldo */
  getWallet: () => apiClient.request<Wallet>("GET", "/payments/wallet"),
  /** Riwayat saldo */
  listWalletEntries: (limit = 50) =>
    apiClient.request<WalletEntry[]>("GET", "/payments/wallet/entries", { query: { limit } }),
  /** Tarik saldo */
  requestWithdrawal: (amount: number) =>
    apiClient.request<WithdrawalResult>("POST", "/payments/withdrawals", { body: { amount } }),
  /** Riwayat penarikan */
  listWithdrawals: () => apiClient.request<WithdrawalView[]>("GET", "/payments/withdrawals"),
  /** Model dan persen biaya layanan [admin] */
  getFeeSettings: () => apiClient.request<FeeSettings>("GET", "/payments/fee-settings"),
  /** Contoh hitungan biaya dari server sebelum disimpan [admin] */
  previewFees: (query: { model: string; percent: number; amount: number }) =>
    apiClient.request<FeePreview>("GET", "/payments/fee-preview", { query }),
  /** Status satu pembayaran milik sendiri */
  getPayment: (id: string) =>
    apiClient.request<PaymentStatusView>("GET", "/payments/:id", { params: { id } }),
  /** Ubah model dan persen biaya layanan [admin] */
  updateFeeSettings: (body: FeeSettings) =>
    apiClient.request<FeeSettings>("PUT", "/payments/fee-settings", { body }),
};
