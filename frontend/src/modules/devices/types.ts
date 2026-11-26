// Tipe data modul devices (bentuk respons API). Ditulis ulang dari backend/src/modules/devices/service.ts.
import type { Sport } from "@/modules/venues";

export type DeviceRole = "camera_home" | "camera_away" | "controller";

export interface Capability {
  width: number;
  height: number;
  fps: number;
  webgpu?: boolean;
  connection?: string;
  batteryLevel?: number;
  charging?: boolean;
}

export interface DeviceView {
  id: string;
  userId: string;
  role: DeviceRole;
  online: boolean;
  lastSeenAt: string | null;
  capability: Capability | null;
  /** Kode dari backend: RESOLUTION_BELOW_1080P, FPS_BELOW_30, NOT_CHARGING */
  warnings: string[];
}

export interface SessionView {
  id: string;
  matchId: string | null;
  sport: Sport | null;
  coachId: string;
  /** Hanya terisi untuk Coach pemilik sesi. */
  code: string | null;
  status: "open" | "active" | "closed";
  expiresAt: string;
  consentAt: string | null;
  calibrated: boolean;
  devices: DeviceView[];
}

export interface SignedSegment {
  segmentId: string;
  path: string;
  token: string;
  signedUrl: string;
}

export interface SignSegmentBody {
  seq: number;
  sizeBytes: number;
  mimeType: "video/webm" | "video/mp4";
  startOffsetMs: number;
  durationMs: number;
}

export type DevicesLiveMessage = { type: "session"; session: SessionView } | { type: "subscribed"; channel: string };
