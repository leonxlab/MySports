import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul bracket. Daftar endpoint: backend/src/modules/bracket/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const bracketApi = {
  /** Buat bracket dari jumlah pemain, lapangan, durasi */
  generateBracket: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/bracket/generate", opts),
  /** Bracket milik satu open play */
  getBracketByOpenPlay: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/bracket/open-play/:openPlayId", opts),
  /** Detail bracket */
  getBracket: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/bracket/:id", opts),
  /** Koreksi manual susunan pemain */
  editBracketMatch: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PATCH", "/bracket/:id/matches/:matchId", opts),
  /** Buat ulang bracket */
  regenerateBracket: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/bracket/:id/regenerate", opts),
};
