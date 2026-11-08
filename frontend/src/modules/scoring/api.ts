import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul scoring. Daftar endpoint: backend/src/modules/scoring/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const scoringApi = {
  /** Statistik pemain per cabang */
  getUserStats: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/scoring/users/:userId/stats", opts),
  /** Papan skor */
  getScoreboard: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/scoring/:matchId", opts),
  /** Statistik match */
  getMatchStats: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/scoring/:matchId/stats", opts),
  /** Input skor manual */
  addScoreEvent: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/scoring/:matchId/events", opts),
  /** Catat pelanggaran */
  addFoul: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/scoring/:matchId/fouls", opts),
  /** Isi atau koreksi poin peserta */
  setPlayerPoints: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PUT", "/scoring/:matchId/players/:playerId/points", opts),
  /** Konfirmasi atau koreksi usulan AI */
  confirmScoreEvent: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PATCH", "/scoring/events/:eventId", opts),
  /** Batalkan kejadian skor */
  voidScoreEvent: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("DELETE", "/scoring/events/:eventId", opts),
};
