import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../core/context";
import type { AppError } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createFakeSupabase } from "../../../tests/fakeSupabase";
import { AttemptLimiter } from "./code";
import type { DetectionEvent } from "./schema";
import { capabilityWarnings, createDevicesService } from "./service";

const coach: AuthUser = { id: "coach", roles: ["user", "coach"] };
const cam: AuthUser = { id: "cam", roles: ["user"] };
const cam2: AuthUser = { id: "cam2", roles: ["user"] };
const NOW = new Date("2026-11-12T08:00:00Z");
const MATCH = "11111111-1111-4111-8111-111111111111";

function setup(fileSize: number | null = 1000) {
  const fake = createFakeSupabase({ device_sessions: [], session_devices: [], video_segments: [] });
  const publish = vi.fn();
  const ctx = { supabase: fake.db, realtime: { publish, subscribe: vi.fn() } } as unknown as AppContext;
  const scoring = {
    ingestSuggestedEvents: vi.fn(async (events: { event_id: string }[]) =>
      events.map((e) => ({ eventId: e.event_id, status: "stored" as const, scoreEventId: "s1" })),
    ),
  };
  const level = { ingestPlayActivity: vi.fn(async (events: { event_id: string }[]) => events.map((e) => ({ eventId: e.event_id, status: "stored" }))) };
  const storage = {
    createSignedUploadUrl: vi.fn(async (path: string) => ({ path, token: "t", signedUrl: `https://storage/${path}` })),
    sizeOf: vi.fn(async () => fileSize),
  };
  const match = { getMatchSettings: vi.fn(async () => ({ id: MATCH, sport: "basketball", createdBy: "coach" }) as never) };
  const svc = createDevicesService(ctx, {
    match,
    scoring: scoring as never,
    level: level as never,
    storage,
    limiter: new AttemptLimiter(3, 60_000),
    now: () => NOW,
  });
  return { svc, fake, publish, scoring, level, storage };
}

const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: AppError) => e.code ?? e.message,
  );

async function sessionWithCamera() {
  const t = setup();
  const session = await t.svc.createSession(coach, { matchId: MATCH });
  await t.svc.joinSession(cam, { code: session.code!, role: "camera_home" });
  return { ...t, session };
}

describe("pairing", () => {
  it("Coach membuat sesi dengan kode, cabang dari match, dan masa berlaku", async () => {
    const { svc } = setup();
    const s = await svc.createSession(coach, { matchId: MATCH });
    expect(s.code).toMatch(/^[2-9A-Z]{6}$/);
    expect(s.sport).toBe("basketball");
    expect(new Date(s.expiresAt).getTime()).toBeGreaterThan(NOW.getTime());
  });

  it("satu peran satu device, controller hanya Coach, kode tidak bocor ke device lain", async () => {
    const { svc, session } = await sessionWithCamera();
    const joined = await svc.joinSession(cam, { code: session.code!.toLowerCase(), role: "camera_home" });
    expect(joined.session.code).toBeNull();
    expect(await code(svc.joinSession(cam2, { code: session.code!, role: "camera_home" }))).toBe("ROLE_TAKEN");
    expect(await code(svc.joinSession(cam2, { code: session.code!, role: "controller" }))).toBe("FORBIDDEN");
    expect(await code(svc.joinSession(cam, { code: session.code!, role: "camera_away" }))).toBe("ALREADY_JOINED");
    expect((await svc.joinSession(cam2, { code: session.code!, role: "camera_away" })).device.role).toBe("camera_away");
  });

  it("kode salah dibatasi percobaannya; kode kedaluwarsa ditolak", async () => {
    const { svc, fake } = setup();
    const s = await svc.createSession(coach, { sport: "futsal" });
    for (let i = 0; i < 3; i++) expect(await code(svc.joinSession(cam, { code: "ZZZZZZ", role: "camera_home" }))).toBe("SESSION_CODE_INVALID");
    expect(await code(svc.joinSession(cam, { code: s.code!, role: "camera_home" }))).toBe("TOO_MANY_ATTEMPTS");

    fake.tables.device_sessions![0]!.expires_at = "2026-11-12T07:00:00Z";
    expect(await code(svc.joinSession(cam2, { code: s.code!, role: "camera_home" }))).toBe("SESSION_CODE_INVALID");
  });
});

describe("kemampuan device", () => {
  it("peringatan di bawah 1080p 30 fps atau tanpa charger, controller tanpa peringatan", () => {
    expect(capabilityWarnings("camera_home", { width: 1920, height: 1080, fps: 30, charging: true })).toEqual([]);
    expect(capabilityWarnings("camera_home", { width: 1280, height: 720, fps: 24, charging: false })).toEqual([
      "RESOLUTION_BELOW_1080P",
      "FPS_BELOW_30",
      "NOT_CHARGING",
    ]);
    expect(capabilityWarnings("controller", { width: 640, height: 480, fps: 10 })).toEqual([]);
  });
});

describe("segmen", () => {
  const sign = { seq: 0, sizeBytes: 1000, mimeType: "video/webm" as const, startOffsetMs: 0, durationMs: 30_000 };

  it("tanpa persetujuan pemain, segmen tidak bisa diunggah", async () => {
    const { svc, session } = await sessionWithCamera();
    expect(await code(svc.signSegment(cam, session.id, sign))).toBe("CONSENT_REQUIRED");
  });

  it("signed URL, file dicek ada, lalu masuk antrean; idempoten", async () => {
    const { svc, session, fake, storage } = await sessionWithCamera();
    await svc.recordConsent(cam, session.id);
    const signed = await svc.signSegment(cam, session.id, sign);
    expect(storage.createSignedUploadUrl).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${session.id}/.+/0$`)));
    expect(fake.tables.video_segments![0]).toMatchObject({ status: "pending_upload", start_offset_ms: 0, duration_ms: 30_000 });
    expect(fake.tables.device_sessions![0]!.status).toBe("active");

    expect(await svc.markUploaded(cam, session.id, signed.segmentId)).toEqual({ segmentId: signed.segmentId, status: "queued" });
    expect(await svc.markUploaded(cam, session.id, signed.segmentId)).toEqual({ segmentId: signed.segmentId, status: "queued" });
    expect(await code(svc.signSegment(cam, session.id, sign))).toBe("SEGMENT_ALREADY_UPLOADED");
  });

  it("file belum ada di Storage tidak masuk antrean; controller tidak boleh mengunggah", async () => {
    const t = setup(null);
    const s = await t.svc.createSession(coach, { matchId: MATCH });
    await t.svc.joinSession(cam, { code: s.code!, role: "camera_home" });
    await t.svc.joinSession(coach, { code: s.code!, role: "controller" });
    await t.svc.recordConsent(coach, s.id);
    const signed = await t.svc.signSegment(cam, s.id, sign);
    expect(await code(t.svc.markUploaded(cam, s.id, signed.segmentId))).toBe("SEGMENT_NOT_UPLOADED");
    expect(await code(t.svc.signSegment(coach, s.id, sign))).toBe("FORBIDDEN");
  });
});

describe("kalibrasi", () => {
  it("disimpan bila sesuai kontrak dan cabang sesi", async () => {
    const { svc, session } = await sessionWithCamera();
    const cal = {
      version: 1,
      sport: "basketball",
      layout: "full_court",
      cameras: {
        home: {
          frame: { width: 1920, height: 1080 },
          court_corners: [
            { x: 100, y: 1000 },
            { x: 1800, y: 1000 },
            { x: 1500, y: 300 },
            { x: 400, y: 300 },
          ],
          targets: [{ kind: "hoop", points: [{ x: 940, y: 200 }, { x: 980, y: 200 }] }],
          marked_at: "2026-11-12T08:00:00Z",
        },
      },
    };
    expect((await svc.saveCalibration(coach, session.id, cal)).calibrated).toBe(true);
    expect(await code(svc.saveCalibration(coach, session.id, { ...cal, sport: "futsal", layout: "standard" }))).toBe(
      "CALIBRATION_SPORT_MISMATCH",
    );
    expect(await code(svc.saveCalibration(cam, session.id, cal))).toBe("FORBIDDEN");
  });
});

describe("ingest event", () => {
  it("bola ke scoring, play_activity ke level, hasil per event berurutan", async () => {
    const { svc, scoring, level } = setup();
    const base = {
      session_id: "22222222-2222-4222-8222-222222222222",
      match_id: MATCH,
      segment_id: "33333333-3333-4333-8333-333333333333",
      camera: "home" as const,
      sport: "basketball" as const,
      timestamp_ms: 1000,
      confidence: 0.9,
    };
    const events: DetectionEvent[] = [
      { ...base, event_id: "a", type: "play_activity", payload: { active_seconds: 30, players_detected: 6 } },
      { ...base, event_id: "b", type: "basket_made", payload: {} },
    ];
    const { results } = await svc.ingestEvents(events);
    expect(results.map((r) => [r.eventId, r.status])).toEqual([
      ["a", "stored"],
      ["b", "stored"],
    ]);
    expect(scoring.ingestSuggestedEvents).toHaveBeenCalledWith([events[1]]);
    expect(level.ingestPlayActivity).toHaveBeenCalledWith([events[0]]);
  });
});
