import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul community. Daftar endpoint: backend/src/modules/community/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const communityApi = {
  /** Daftar thread (filter cabang) */
  listThreads: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/community/threads", opts),
  /** Buat thread */
  createThread: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/community/threads", opts),
  /** Detail thread dan balasan */
  getThread: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/community/threads/:id", opts),
  /** Balas thread */
  addPost: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/community/threads/:id/posts", opts),
  /** Signed URL upload foto atau video */
  signMediaUpload: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/community/media/sign", opts),
  /** Laporkan konten */
  reportContent: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/community/reports", opts),
  /** Antrean laporan */
  listReports: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/community/reports", opts),
  /** Tindak laporan */
  resolveReport: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/community/reports/:id/resolve", opts),
};
