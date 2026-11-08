import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul payments. Daftar endpoint: backend/src/modules/payments/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const paymentsApi = {
  /** Buat pembayaran untuk open play, sewa lapangan, atau sewa alat */
  createCheckout: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/payments/checkout", opts),
  /** Callback gateway (verifikasi signature, idempotent) */
  paymentWebhook: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/payments/webhook/:provider", opts),
  /** Sewa lapangan */
  createCourtBooking: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/payments/bookings", opts),
  /** Booking milik sendiri */
  listMyBookings: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/payments/bookings/mine", opts),
  /** Saldo */
  getWallet: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/payments/wallet", opts),
  /** Riwayat saldo */
  listWalletEntries: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/payments/wallet/entries", opts),
  /** Tarik saldo */
  requestWithdrawal: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/payments/withdrawals", opts),
  /** Riwayat penarikan */
  listWithdrawals: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/payments/withdrawals", opts),
  /** Model dan persen biaya layanan */
  getFeeSettings: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/payments/fee-settings", opts),
  /** Ubah model (potongan saat withdraw / fee ke pembayar) dan persen */
  updateFeeSettings: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PUT", "/payments/fee-settings", opts),
};
