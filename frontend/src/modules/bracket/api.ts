import { apiClient } from "@/lib/api-client";
import type { BracketView, GenerateBracketBody, RegenerateBracketBody } from "./types";

// Panggilan API modul bracket. Daftar endpoint: backend/src/modules/bracket/README.md
// Seluruh susunan bracket dihitung server. Frontend hanya menampilkan dan mengirim aksi.
export const bracketApi = {
  /** Buat bracket dari jumlah pemain, lapangan, durasi [coach] */
  generate: (body: GenerateBracketBody) => apiClient.request<BracketView>("POST", "/bracket/generate", { body }),
  /** Bracket milik satu open play (404 BRACKET_NOT_FOUND bila belum ada) */
  getByOpenPlay: (openPlayId: string) =>
    apiClient.request<BracketView>("GET", "/bracket/open-play/:openPlayId", { params: { openPlayId } }),
  /** Detail bracket */
  get: (id: string) => apiClient.request<BracketView>("GET", "/bracket/:id", { params: { id } }),
  /** Koreksi manual susunan pemain [coach] */
  editMatch: (id: string, matchId: string, body: { home: string[]; away: string[] }) =>
    apiClient.request<BracketView>("PATCH", "/bracket/:id/matches/:matchId", { params: { id, matchId }, body }),
  /** Tukar dua pemain dalam satu ronde [coach] */
  swap: (id: string, body: { roundId: string; a: string; b: string }) =>
    apiClient.request<BracketView>("POST", "/bracket/:id/swap", { params: { id }, body }),
  /** Buat ulang bracket [coach] */
  regenerate: (id: string, body: RegenerateBracketBody = {}) =>
    apiClient.request<BracketView>("POST", "/bracket/:id/regenerate", { params: { id }, body }),
};
