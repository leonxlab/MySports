import { apiClient } from "@/lib/api-client";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/supabase";
import type {
  AddEventBody,
  Foul,
  MatchStats,
  PlayerPointsBody,
  ReviewEventBody,
  Scoreboard,
  UserSportStats,
} from "./types";

// Panggilan API modul scoring. Daftar endpoint: backend/src/modules/scoring/README.md
export const scoringApi = {
  /** Statistik pemain per cabang */
  getUserStats: (userId: string) =>
    apiClient.request<UserSportStats[]>("GET", "/scoring/users/:userId/stats", { params: { userId } }),
  /** Papan skor dan antrean usulan AI */
  getScoreboard: (matchId: string) => apiClient.request<Scoreboard>("GET", "/scoring/:matchId", { params: { matchId } }),
  /** Statistik match per pemain */
  getMatchStats: (matchId: string) =>
    apiClient.request<MatchStats>("GET", "/scoring/:matchId/stats", { params: { matchId } }),
  /** Input skor manual [coach] */
  addScoreEvent: (matchId: string, body: AddEventBody) =>
    apiClient.request<Scoreboard>("POST", "/scoring/:matchId/events", { params: { matchId }, body }),
  /** Catat pelanggaran [coach] */
  addFoul: (matchId: string, body: { playerId: string; kind?: string }) =>
    apiClient.request<Foul>("POST", "/scoring/:matchId/fouls", { params: { matchId }, body }),
  /** Isi atau koreksi poin peserta [coach] */
  setPlayerPoints: (matchId: string, playerId: string, body: PlayerPointsBody) =>
    apiClient.request<MatchStats>("PUT", "/scoring/:matchId/players/:playerId/points", {
      params: { matchId, playerId },
      body,
    }),
  /** Konfirmasi atau koreksi usulan AI [coach] */
  reviewScoreEvent: (eventId: string, body: ReviewEventBody) =>
    apiClient.request<Scoreboard>("PATCH", "/scoring/events/:eventId", { params: { eventId }, body }),
  /** Batalkan kejadian skor [coach] */
  voidScoreEvent: (eventId: string) =>
    apiClient.request<Scoreboard>("DELETE", "/scoring/events/:eventId", { params: { eventId } }),
  /** URL WebSocket kanal match dengan token login (?token=, lihat backend core/realtime.ts). */
  async liveUrl(matchId: string): Promise<string> {
    const token = await getAccessToken();
    const base = `${env.apiUrl.replace(/^http/, "ws")}/api/v1/match/${encodeURIComponent(matchId)}/live`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },
};
