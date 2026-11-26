import type { AppContext } from "../../core/context";
import { AppError, forbidden, notFound } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createMatchApi, type MatchApi } from "../match";
import { createScoringApi, type ScoringApi } from "../scoring";
import type { IngestResult } from "../scoring/service";
import { AttemptLimiter, CODE_TTL_MINUTES, generateSessionCode, isValidSessionCode, normalizeSessionCode } from "./code";
import {
  calibrationSchema,
  type CapabilityInput,
  type CreateSessionInput,
  type DetectionEvent,
  type DeviceRole,
  type JoinSessionInput,
  MAX_SEGMENT_BYTES,
  type SignSegmentInput,
} from "./schema";

export const SEGMENT_BUCKET = "segments";
/** Device dianggap online bila heartbeat terakhir lebih baru dari ini. */
export const ONLINE_WINDOW_MS = 30_000;
/**
 * Syarat awal kamera dari proposal (1080p 30 fps, tersambung daya). Angka final dari uji di HP target.
 * TODO(decision): pertanyaan terbuka #12.
 */
export const CAMERA_MIN = { shortSide: 1080, fps: 30 } as const;

type SessionStatus = "open" | "active" | "closed";

interface SessionRow {
  id: string;
  match_id: string | null;
  coach_id: string;
  pair_code: string;
  status: SessionStatus;
  calibration: unknown;
  expires_at: string;
  consent_at: string | null;
  sport: string | null;
  created_at: string;
}

type StoredCapability = CapabilityInput & { warnings?: string[] };

interface DeviceRow {
  id: string;
  session_id: string;
  user_id: string;
  role: DeviceRole;
  capability: StoredCapability | null;
  joined_at: string;
  last_seen_at: string | null;
}

interface SegmentRow {
  id: string;
  session_id: string;
  device_id: string;
  seq: number;
  storage_path: string;
  size_bytes: number | null;
  status: "pending_upload" | "queued" | "processing" | "done" | "failed";
}

const SESSION_COLUMNS = "id, match_id, coach_id, pair_code, status, calibration, expires_at, consent_at, sport, created_at";
const DEVICE_COLUMNS = "id, session_id, user_id, role, capability, joined_at, last_seen_at";
const SEGMENT_COLUMNS = "id, session_id, device_id, seq, storage_path, size_bytes, status";

export interface DeviceView {
  id: string;
  userId: string;
  role: DeviceRole;
  online: boolean;
  lastSeenAt: string | null;
  capability: CapabilityInput | null;
  warnings: string[];
}

export interface SessionView {
  id: string;
  matchId: string | null;
  sport: string | null;
  coachId: string;
  /** Hanya untuk Coach pemilik sesi (ditampilkan sebagai kode dan QR). */
  code: string | null;
  status: SessionStatus;
  expiresAt: string;
  consentAt: string | null;
  calibrated: boolean;
  devices: DeviceView[];
}

/** Penyimpanan segmen. Dipisah supaya test tidak butuh Supabase Storage. */
export interface SegmentStorage {
  createSignedUploadUrl(path: string): Promise<{ path: string; token: string; signedUrl: string }>;
  /** Ukuran file dalam byte, atau null bila belum ada. */
  sizeOf(path: string): Promise<number | null>;
}

export type PlayActivityEvent = Extract<DetectionEvent, { type: "play_activity" }>;

export interface LevelIngest {
  ingestPlayActivity(events: PlayActivityEvent[]): Promise<{ eventId: string; status: string }[]>;
}

export interface Dependencies {
  match: Pick<MatchApi, "getMatchSettings">;
  scoring: Pick<ScoringApi, "ingestSuggestedEvents">;
  level: LevelIngest;
  storage: SegmentStorage;
  limiter: AttemptLimiter;
  now: () => Date;
}

export type EventResult = IngestResult | { eventId: string; status: string; reason?: string };

const isAdmin = (user: AuthUser) => user.roles.includes("admin");
const isCamera = (role: DeviceRole | undefined) => role === "camera_home" || role === "camera_away";
const pgCode = (e: unknown) => (e as { code?: string } | null)?.code;

/** Peringatan bila kemampuan device di bawah syarat awal. Murni, dites. */
export function capabilityWarnings(role: DeviceRole, c: CapabilityInput): string[] {
  if (role === "controller") return [];
  const warnings: string[] = [];
  if (Math.min(c.width, c.height) < CAMERA_MIN.shortSide) warnings.push("RESOLUTION_BELOW_1080P");
  if (c.fps < CAMERA_MIN.fps) warnings.push("FPS_BELOW_30");
  if (c.charging === false) warnings.push("NOT_CHARGING");
  return warnings;
}

function supabaseStorage(ctx: AppContext): SegmentStorage {
  const bucket = () => ctx.supabase.storage.from(SEGMENT_BUCKET);
  return {
    async createSignedUploadUrl(path) {
      // upsert: unggah ulang segmen yang sama (koneksi putus di tengah) menimpa file setengah jadi.
      const { data, error } = await bucket().createSignedUploadUrl(path, { upsert: true });
      if (error) throw error;
      return { path: data.path, token: data.token, signedUrl: data.signedUrl };
    },
    async sizeOf(path) {
      const slash = path.lastIndexOf("/");
      const name = path.slice(slash + 1);
      const { data, error } = await bucket().list(path.slice(0, slash), { search: name });
      if (error) throw error;
      const file = (data ?? []).find((f) => f.name === name);
      if (!file) return null;
      const size = (file.metadata as { size?: number } | null)?.size;
      return typeof size === "number" ? size : 0;
    },
  };
}

/** TODO(integration): menunggu level.ingestPlayActivity (Eugene). Sampai itu ada, event dilewati. */
const pendingLevel: LevelIngest = {
  async ingestPlayActivity(events) {
    return events.map((e) => ({ eventId: e.event_id, status: "skipped" }));
  },
};

/**
 * Logika bisnis modul devices. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: device_sessions, session_devices, video_segments.
 */
export function createDevicesService(ctx: AppContext, deps?: Partial<Dependencies>) {
  const db = ctx.supabase;
  const match = deps?.match ?? createMatchApi(ctx);
  const scoring = deps?.scoring ?? createScoringApi(ctx);
  const level = deps?.level ?? pendingLevel;
  const storage = deps?.storage ?? supabaseStorage(ctx);
  const limiter = deps?.limiter ?? new AttemptLimiter();
  const now = deps?.now ?? (() => new Date());

  async function loadSession(id: string): Promise<SessionRow> {
    const { data, error } = await db.from("device_sessions").select(SESSION_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("SESSION_NOT_FOUND", "Sesi tidak ditemukan");
    return data as SessionRow;
  }

  async function loadDevices(sessionId: string): Promise<DeviceRow[]> {
    const { data, error } = await db.from("session_devices").select(DEVICE_COLUMNS).eq("session_id", sessionId);
    if (error) throw error;
    return (data ?? []) as DeviceRow[];
  }

  function deviceView(d: DeviceRow): DeviceView {
    const lastSeen = d.last_seen_at ? new Date(d.last_seen_at).getTime() : null;
    let capability: CapabilityInput | null = null;
    let warnings: string[] = [];
    if (d.capability) {
      const { warnings: w, ...rest } = d.capability;
      capability = rest;
      warnings = w ?? [];
    }
    return {
      id: d.id,
      userId: d.user_id,
      role: d.role,
      online: lastSeen !== null && now().getTime() - lastSeen < ONLINE_WINDOW_MS,
      lastSeenAt: d.last_seen_at,
      capability,
      warnings,
    };
  }

  function sessionView(s: SessionRow, devices: DeviceRow[], viewer?: AuthUser): SessionView {
    const isCoach = !!viewer && (viewer.id === s.coach_id || isAdmin(viewer));
    return {
      id: s.id,
      matchId: s.match_id,
      sport: s.sport,
      coachId: s.coach_id,
      code: isCoach ? s.pair_code : null,
      status: s.status,
      expiresAt: s.expires_at,
      consentAt: s.consent_at,
      calibrated: s.calibration !== null && s.calibration !== undefined,
      devices: devices.map(deviceView),
    };
  }

  function assertCoach(user: AuthUser, s: SessionRow) {
    if (s.coach_id !== user.id && !isAdmin(user)) throw forbidden("Hanya Coach sesi ini yang boleh melakukan ini");
  }

  const deviceOf = (user: AuthUser, devices: DeviceRow[]) => devices.find((d) => d.user_id === user.id);

  async function publishStatus(sessionId: string) {
    const [s, devices] = await Promise.all([loadSession(sessionId), loadDevices(sessionId)]);
    ctx.realtime.publish(`devices:${sessionId}`, { type: "session", session: sessionView(s, devices) });
  }

  async function myDevice(user: AuthUser, sessionId: string) {
    const devices = await loadDevices(sessionId);
    const device = deviceOf(user, devices);
    if (!device) throw forbidden("Device ini belum terpasang di sesi");
    return device;
  }

  return {
    /** Untuk modul match: status sesi tanpa kode pairing. */
    async getSession(id: string): Promise<SessionView> {
      const s = await loadSession(id);
      return sessionView(s, await loadDevices(id));
    },

    /** Untuk WebSocket: Coach pemilik, device yang sudah join, atau admin. */
    async canView(user: AuthUser, id: string): Promise<boolean> {
      const s = await loadSession(id).catch(() => null);
      if (!s) return false;
      if (s.coach_id === user.id || isAdmin(user)) return true;
      return !!deviceOf(user, await loadDevices(id));
    },

    async getSessionFor(user: AuthUser, id: string): Promise<SessionView> {
      const s = await loadSession(id);
      const devices = await loadDevices(id);
      if (s.coach_id !== user.id && !isAdmin(user) && !deviceOf(user, devices)) {
        throw forbidden("Kamu bukan bagian dari sesi ini");
      }
      return sessionView(s, devices, user);
    },

    async createSession(user: AuthUser, input: CreateSessionInput): Promise<SessionView> {
      let sport: string | null = input.sport ?? null;
      if (input.matchId) {
        const m = await match.getMatchSettings(input.matchId);
        if (m.createdBy !== user.id && !isAdmin(user)) throw forbidden("Match ini bukan milikmu");
        sport = m.sport;
      }
      // TODO(decision): siapa yang boleh membuat sesi main tanpa Coach (XP solo). Sekarang hanya role coach.
      const expiresAt = new Date(now().getTime() + CODE_TTL_MINUTES * 60_000).toISOString();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await db
          .from("device_sessions")
          .insert({
            match_id: input.matchId ?? null,
            coach_id: user.id,
            pair_code: generateSessionCode(),
            sport,
            status: "open",
            calibration: null,
            consent_at: null,
            expires_at: expiresAt,
          })
          .select(SESSION_COLUMNS)
          .single();
        if (!error) return sessionView(data as SessionRow, [], user);
        if (pgCode(error) !== "23505") throw error; // kode bentrok: coba kode lain
      }
      throw new AppError(503, "SESSION_CODE_EXHAUSTED", "Gagal membuat kode sesi, coba lagi");
    },

    async joinSession(user: AuthUser, input: JoinSessionInput): Promise<{ session: SessionView; device: DeviceView }> {
      if (limiter.isBlocked(user.id)) {
        throw new AppError(429, "TOO_MANY_ATTEMPTS", "Terlalu banyak kode salah, coba lagi nanti");
      }
      const fail = () => {
        limiter.recordFailure(user.id);
        return new AppError(404, "SESSION_CODE_INVALID", "Kode sesi salah atau sudah kedaluwarsa");
      };
      const code = normalizeSessionCode(input.code);
      if (!isValidSessionCode(code)) throw fail();
      const { data, error } = await db.from("device_sessions").select(SESSION_COLUMNS).eq("pair_code", code).maybeSingle();
      if (error) throw error;
      const s = data as SessionRow | null;
      if (!s || s.status === "closed" || new Date(s.expires_at).getTime() <= now().getTime()) throw fail();
      limiter.reset(user.id);

      if (input.role === "controller" && s.coach_id !== user.id && !isAdmin(user)) {
        throw forbidden("Controller dipegang Coach sesi ini");
      }
      const devices = await loadDevices(s.id);
      if (devices.some((d) => d.user_id === user.id && d.role !== input.role)) {
        throw new AppError(409, "ALREADY_JOINED", "Akun ini sudah memegang peran lain di sesi ini");
      }
      const holder = devices.find((d) => d.role === input.role);
      if (holder && holder.user_id !== user.id) throw new AppError(409, "ROLE_TAKEN", "Peran ini sudah dipakai device lain");

      let device = holder;
      if (!device) {
        const { data: row, error: insertError } = await db
          .from("session_devices")
          .insert({
            session_id: s.id,
            user_id: user.id,
            role: input.role,
            capability: null,
            last_seen_at: now().toISOString(),
          })
          .select(DEVICE_COLUMNS)
          .single();
        if (insertError) {
          if (pgCode(insertError) === "23505") throw new AppError(409, "ROLE_TAKEN", "Peran ini sudah dipakai device lain");
          throw insertError;
        }
        device = row as DeviceRow;
      }
      await publishStatus(s.id);
      const all = [...devices.filter((d) => d.id !== device.id), device];
      return { session: sessionView(s, all, user), device: deviceView(device) };
    },

    async reportCapability(user: AuthUser, sessionId: string, input: CapabilityInput): Promise<DeviceView> {
      const device = await myDevice(user, sessionId);
      const capability: StoredCapability = { ...input, warnings: capabilityWarnings(device.role, input) };
      const seen = now().toISOString();
      const { error } = await db.from("session_devices").update({ capability, last_seen_at: seen }).eq("id", device.id);
      if (error) throw error;
      await publishStatus(sessionId);
      return deviceView({ ...device, capability, last_seen_at: seen });
    },

    /** Heartbeat device (tiap beberapa detik) untuk status online di layar Coach. */
    async heartbeat(user: AuthUser, sessionId: string): Promise<DeviceView> {
      const device = await myDevice(user, sessionId);
      const seen = now().toISOString();
      const { error } = await db.from("session_devices").update({ last_seen_at: seen }).eq("id", device.id);
      if (error) throw error;
      await publishStatus(sessionId);
      return deviceView({ ...device, last_seen_at: seen });
    },

    async saveCalibration(user: AuthUser, sessionId: string, raw: unknown): Promise<SessionView> {
      const s = await loadSession(sessionId);
      assertCoach(user, s);
      const calibration = calibrationSchema.parse(raw);
      if (s.sport && calibration.sport !== s.sport) {
        throw new AppError(400, "CALIBRATION_SPORT_MISMATCH", "Cabang kalibrasi berbeda dengan cabang sesi");
      }
      const { error } = await db.from("device_sessions").update({ calibration }).eq("id", sessionId);
      if (error) throw error;
      await publishStatus(sessionId);
      return sessionView({ ...s, calibration }, await loadDevices(sessionId), user);
    },

    /** Simpan waktu persetujuan pemain. Coach atau kamera sesi ini yang boleh mencatat. Idempoten. */
    async recordConsent(user: AuthUser, sessionId: string): Promise<SessionView> {
      const s = await loadSession(sessionId);
      const devices = await loadDevices(sessionId);
      if (s.coach_id !== user.id && !isAdmin(user) && !isCamera(deviceOf(user, devices)?.role)) {
        throw forbidden("Hanya Coach atau kamera sesi ini");
      }
      const consentAt = s.consent_at ?? now().toISOString();
      if (!s.consent_at) {
        const { error } = await db.from("device_sessions").update({ consent_at: consentAt }).eq("id", sessionId);
        if (error) throw error;
        await publishStatus(sessionId);
      }
      return sessionView({ ...s, consent_at: consentAt }, devices, user);
    },

    /** Signed URL unggah langsung ke Storage (tidak lewat backend). Path {sessionId}/{deviceId}/{seq}. */
    async signSegment(user: AuthUser, sessionId: string, input: SignSegmentInput) {
      const s = await loadSession(sessionId);
      if (s.status === "closed") throw new AppError(409, "SESSION_CLOSED", "Sesi sudah ditutup");
      if (!s.consent_at) throw new AppError(409, "CONSENT_REQUIRED", "Persetujuan pemain belum dicatat");
      const device = deviceOf(user, await loadDevices(sessionId));
      if (!device || !isCamera(device.role)) throw forbidden("Hanya kamera sesi ini yang boleh mengunggah");
      if (input.sizeBytes > MAX_SEGMENT_BYTES) throw new AppError(413, "SEGMENT_TOO_LARGE", "Segmen maksimal 50 MB");

      const path = `${sessionId}/${device.id}/${input.seq}`;
      const { data: existing, error: findError } = await db
        .from("video_segments")
        .select(SEGMENT_COLUMNS)
        .eq("device_id", device.id)
        .eq("seq", input.seq)
        .maybeSingle();
      if (findError) throw findError;
      let segment = existing as SegmentRow | null;
      if (segment && segment.status !== "pending_upload") {
        throw new AppError(409, "SEGMENT_ALREADY_UPLOADED", "Segmen ini sudah diunggah");
      }
      const fields = {
        size_bytes: input.sizeBytes,
        mime_type: input.mimeType,
        start_offset_ms: input.startOffsetMs,
        duration_ms: input.durationMs,
      };
      if (segment) {
        const { error } = await db.from("video_segments").update(fields).eq("id", segment.id);
        if (error) throw error;
      } else {
        const { data, error } = await db
          .from("video_segments")
          .insert({ session_id: sessionId, device_id: device.id, seq: input.seq, storage_path: path, status: "pending_upload", ...fields })
          .select(SEGMENT_COLUMNS)
          .single();
        if (error) throw error;
        segment = data as SegmentRow;
      }
      if (s.status === "open") {
        const { error } = await db.from("device_sessions").update({ status: "active" }).eq("id", sessionId);
        if (error) throw error;
      }
      const upload = await storage.createSignedUploadUrl(path);
      return { segmentId: segment.id, path: upload.path, token: upload.token, signedUrl: upload.signedUrl };
    },

    /** Kamera selesai mengunggah. Backend memastikan file ada, lalu segmen masuk antrean. Idempoten. */
    async markUploaded(user: AuthUser, sessionId: string, segmentId: string) {
      const device = await myDevice(user, sessionId);
      const { data, error } = await db.from("video_segments").select(SEGMENT_COLUMNS).eq("id", segmentId).maybeSingle();
      if (error) throw error;
      const segment = data as SegmentRow | null;
      if (!segment || segment.session_id !== sessionId || segment.device_id !== device.id) {
        throw notFound("SEGMENT_NOT_FOUND", "Segmen tidak ditemukan");
      }
      if (segment.status !== "pending_upload") return { segmentId, status: segment.status };

      const size = await storage.sizeOf(segment.storage_path);
      if (size === null) throw new AppError(409, "SEGMENT_NOT_UPLOADED", "File segmen belum ada di Storage");
      if (size > MAX_SEGMENT_BYTES) throw new AppError(413, "SEGMENT_TOO_LARGE", "Segmen maksimal 50 MB");
      const { error: updateError } = await db
        .from("video_segments")
        .update({ status: "queued", ...(size > 0 ? { size_bytes: size } : {}) })
        .eq("id", segmentId)
        .eq("status", "pending_upload");
      if (updateError) throw updateError;
      return { segmentId, status: "queued" as const };
    },

    /**
     * Batch event dari yolo-service. Kejadian bola ke scoring (suggested), play_activity ke level.
     * Idempoten (scoring memakai event_key). Hasil per event, urutan sama dengan input.
     */
    async ingestEvents(events: DetectionEvent[]): Promise<{ results: EventResult[] }> {
      const ball = events.filter((e) => e.type !== "play_activity");
      const activity = events.filter((e): e is PlayActivityEvent => e.type === "play_activity");
      const [ballResults, activityResults] = await Promise.all([
        ball.length ? scoring.ingestSuggestedEvents(ball) : Promise.resolve([] as EventResult[]),
        activity.length ? level.ingestPlayActivity(activity) : Promise.resolve([] as EventResult[]),
      ]);
      const byId = new Map<string, EventResult>();
      for (const r of [...ballResults, ...activityResults]) byId.set(r.eventId, r);
      return {
        results: events.map((e) => byId.get(e.event_id) ?? { eventId: e.event_id, status: "skipped", reason: "UNKNOWN" }),
      };
    },
  };
}

export type DevicesService = ReturnType<typeof createDevicesService>;
