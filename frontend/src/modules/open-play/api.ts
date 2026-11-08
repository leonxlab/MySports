import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul open-play. Daftar endpoint: backend/src/modules/open-play/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const openPlayApi = {
  /** Cari open play berdasarkan jarak, cabang, tanggal */
  searchOpenPlays: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/open-play", opts),
  /** Coach mencari pemain */
  searchMembers: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/open-play/members/search", opts),
  /** Info lengkap member (nama, umur, pengalaman, Level, galeri) */
  getMemberInfo: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/open-play/members/:userId", opts),
  /** Detail open play */
  getOpenPlay: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/open-play/:id", opts),
  /** Buat open play */
  createOpenPlay: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/open-play", opts),
  /** Setting slot: kuota, jam, harga, status */
  updateSlot: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PATCH", "/open-play/:id", opts),
  /** Join dan mulai pembayaran */
  joinOpenPlay: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/open-play/:id/join", opts),
  /** Batal join */
  leaveOpenPlay: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("DELETE", "/open-play/:id/join", opts),
  /** Peserta terkonfirmasi */
  listParticipants: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/open-play/:id/participants", opts),
};
