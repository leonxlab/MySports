import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul match. Daftar endpoint: backend/src/modules/match/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const matchApi = {
  /** Nilai bawaan aturan per cabang */
  getDefaultSettings: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/match/defaults/:sport", opts),
  /** Buat match dari bracket match atau manual */
  createMatch: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/match", opts),
  /** Detail dan status match */
  getMatch: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/match/:id", opts),
  /** Edit setting match (Coach atau User sesuai kepemilikan) */
  updateMatchSettings: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PATCH", "/match/:id/settings", opts),
  /** Mulai */
  startMatch: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/match/:id/start", opts),
  /** Pause */
  pauseMatch: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/match/:id/pause", opts),
  /** Lanjut */
  resumeMatch: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/match/:id/resume", opts),
  /** Selesai */
  finishMatch: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/match/:id/finish", opts),
  /** Time out */
  callTimeout: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/match/:id/timeout", opts),
  /** Hydration break */
  startHydrationBreak: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/match/:id/hydration", opts),
};
