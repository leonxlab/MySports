import { apiClient } from "@/lib/api-client";
import { env } from "@/lib/env";
import { getAccessToken, getSupabase } from "@/lib/supabase";
import type { Sport } from "@/modules/venues";
import type { Capability, DeviceRole, DeviceView, SessionView, SignedSegment, SignSegmentBody } from "./types";

// Panggilan API modul devices. Daftar endpoint: backend/src/modules/devices/README.md
export const devicesApi = {
  /** Buat sesi pairing (kode sesi dan QR) [coach] */
  createSession: (body: { matchId?: string; sport?: Sport }) =>
    apiClient.request<SessionView>("POST", "/devices/sessions", { body }),
  /** Pasang device dengan kode */
  joinSession: (code: string, role: DeviceRole) =>
    apiClient.request<{ session: SessionView; device: DeviceView }>("POST", "/devices/sessions/join", {
      body: { code, role },
    }),
  /** Status sesi dan device */
  getSession: (id: string) => apiClient.request<SessionView>("GET", "/devices/sessions/:id", { params: { id } }),
  /** Laporkan kemampuan device */
  reportCapability: (id: string, body: Capability) =>
    apiClient.request<DeviceView>("POST", "/devices/sessions/:id/capability", { params: { id }, body }),
  heartbeat: (id: string) => apiClient.request<DeviceView>("POST", "/devices/sessions/:id/heartbeat", { params: { id } }),
  /** Catat persetujuan pemain sebelum direkam */
  recordConsent: (id: string) =>
    apiClient.request<SessionView>("POST", "/devices/sessions/:id/consent", { params: { id }, body: { agreed: true } }),
  /** Simpan kalibrasi (bentuk: contracts/calibration.schema.json) [coach] */
  saveCalibration: (id: string, body: unknown) =>
    apiClient.request<SessionView>("POST", "/devices/sessions/:id/calibration", { params: { id }, body }),
  /** Minta signed URL upload segmen (maks 50 MB) */
  signSegmentUpload: (id: string, body: SignSegmentBody) =>
    apiClient.request<SignedSegment>("POST", "/devices/sessions/:id/segments/sign", { params: { id }, body }),
  /** Tandai segmen siap diproses */
  markSegmentUploaded: (id: string, segmentId: string) =>
    apiClient.request<{ segmentId: string; status: string }>(
      "POST",
      "/devices/sessions/:id/segments/:segmentId/uploaded",
      { params: { id, segmentId } },
    ),
  /** Unggah langsung ke Supabase Storage lewat signed URL, tidak lewat backend (rules.md bagian 2). */
  async uploadToSignedUrl(signed: SignedSegment, blob: Blob) {
    const { error } = await getSupabase().storage.from("segments").uploadToSignedUrl(signed.path, signed.token, blob, {
      contentType: blob.type,
      upsert: true,
    });
    if (error) throw error;
  },
  /** URL WebSocket status sesi dengan token login. */
  async liveUrl(id: string): Promise<string> {
    const token = await getAccessToken();
    const base = `${env.apiUrl.replace(/^http/, "ws")}/api/v1/devices/sessions/${encodeURIComponent(id)}/live`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },
};
