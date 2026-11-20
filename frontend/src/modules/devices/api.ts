import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul devices. Daftar endpoint: backend/src/modules/devices/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const devicesApi = {
  /** Buat sesi pairing (kode sesi dan QR) */
  createSession: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/devices/sessions", opts),
  /** Pasang device dengan kode: {code, role} */
  joinSession: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/devices/sessions/join", opts),
  /** Status sesi dan device */
  getSession: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/devices/sessions/:id", opts),
  /** Laporkan kemampuan device (WebGPU, FPS) */
  reportCapability: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/devices/sessions/:id/capability", opts),
  /** Simpan kalibrasi ring, gawang, atau garis */
  saveCalibration: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/devices/sessions/:id/calibration", opts),
  /** Minta signed URL upload segmen (maks 50 MB) */
  signSegmentUpload: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/devices/sessions/:id/segments/sign", opts),
  /** Tandai segmen siap diproses (masuk antrean) */
  markSegmentUploaded: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/devices/sessions/:id/segments/:segmentId/uploaded", opts),
};
