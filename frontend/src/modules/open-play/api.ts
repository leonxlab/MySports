import { apiClient } from "@/lib/api-client";
import type {
  CreateOpenPlayBody,
  JoinResult,
  MemberDetail,
  MemberSummary,
  OpenPlayView,
  SearchOpenPlayQuery,
  UpdateOpenPlayBody,
} from "./types";

// Panggilan API modul open-play. Daftar endpoint: backend/src/modules/open-play/README.md
export const openPlayApi = {
  /** Cari open play berdasarkan jarak, cabang, tanggal */
  search: (query: SearchOpenPlayQuery = {}) =>
    apiClient.request<OpenPlayView[]>("GET", "/open-play", { query: { ...query } }),
  /** Detail open play */
  get: (id: string) => apiClient.request<OpenPlayView>("GET", "/open-play/:id", { params: { id } }),
  /** Buat open play [coach] */
  create: (body: CreateOpenPlayBody) => apiClient.request<OpenPlayView>("POST", "/open-play", { body }),
  /** Setting slot: kuota, jam, harga, status [coach] */
  update: (id: string, body: UpdateOpenPlayBody) =>
    apiClient.request<OpenPlayView>("PATCH", "/open-play/:id", { params: { id }, body }),
  /** Join dan mulai pembayaran */
  join: (id: string) => apiClient.request<JoinResult>("POST", "/open-play/:id/join", { params: { id } }),
  /** Batal join */
  leave: (id: string) => apiClient.request<void>("DELETE", "/open-play/:id/join", { params: { id } }),
  /** Peserta terkonfirmasi [coach] */
  listParticipants: (id: string) =>
    apiClient.request<MemberSummary[]>("GET", "/open-play/:id/participants", { params: { id } }),
  /** Coach mencari pemain [coach] */
  searchMembers: (q: string, sport?: string) =>
    apiClient.request<MemberSummary[]>("GET", "/open-play/members/search", { query: { q, sport } }),
  /** Info lengkap member [coach] */
  getMember: (userId: string) =>
    apiClient.request<MemberDetail>("GET", "/open-play/members/:userId", { params: { userId } }),
};
