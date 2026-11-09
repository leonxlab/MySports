import { apiClient } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { Sport } from "@/modules/venues";
import type { CreateMatchBody, MatchSettings, MatchSettingsPatch, MatchView } from "./types";

// Panggilan API modul match. Daftar endpoint: backend/src/modules/match/README.md
const control = (action: string) => (id: string) =>
  apiClient.request<MatchView>("POST", `/match/:id/${action}`, { params: { id } });

export const matchApi = {
  /** Nilai bawaan aturan per cabang [coach] */
  getDefaultSettings: (sport: Sport) =>
    apiClient.request<MatchSettings>("GET", "/match/defaults/:sport", { params: { sport } }),
  /** Buat match dari bracket match atau manual [coach] */
  create: (body: CreateMatchBody) => apiClient.request<MatchView>("POST", "/match", { body }),
  /** Detail dan status match */
  get: (id: string) => apiClient.request<MatchView>("GET", "/match/:id", { params: { id } }),
  /** Edit setting match, hanya sebelum dimulai */
  updateSettings: (id: string, body: MatchSettingsPatch) =>
    apiClient.request<MatchView>("PATCH", "/match/:id/settings", { params: { id }, body }),
  start: control("start"),
  pause: control("pause"),
  resume: control("resume"),
  finish: control("finish"),
  timeout: control("timeout"),
  hydration: control("hydration"),
  /** URL WebSocket timer langsung. TODO(auth): kirim token setelah dev-c menambahkan verifikasi WS. */
  liveUrl: (id: string) => `${env.apiUrl.replace(/^http/, "ws")}/api/v1/match/${encodeURIComponent(id)}/live`,
};
