import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul feed. Daftar endpoint: backend/src/modules/feed/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const feedApi = {
  /** Feed 'Let me choose for you' */
  getHomeFeed: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/feed/home", opts),
  /** Menu global semua cabang (tanpa personalisasi, bisa difilter) */
  getExplore: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/feed/explore", opts),
  /** Catat sinyal kebiasaan (pencarian, lihat, join) */
  recordSignal: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/feed/signals", opts),
};
