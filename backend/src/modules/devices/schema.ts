import { z } from "zod";

/**
 * Kontrak event YOLO -> backend. Sumber kebenaran: contracts/detection-event.schema.json.
 * Ubah file contracts dulu (PR terpisah), baru file ini dan yolo-service/app/core/events.py.
 */
const base = {
  event_id: z.string().uuid(), // kunci idempotensi, dibuat yolo-service
  session_id: z.string().uuid(),
  match_id: z.string().uuid().nullable(),
  segment_id: z.string().uuid(),
  camera: z.enum(["home", "away"]),
  sport: z.enum(["basketball", "badminton", "tennis", "padel", "futsal"]),
  timestamp_ms: z.number().int().nonnegative(), // waktu kejadian di dalam match
  confidence: z.number().min(0).max(1),
};

export const detectionEventSchema = z.discriminatedUnion("type", [
  z.object({
    ...base,
    type: z.literal("basket_made"),
    payload: z.object({
      team_color: z.string().optional(),
      shot_distance_m: z.number().nonnegative().optional(),
    }),
  }),
  z.object({
    ...base,
    type: z.literal("goal"),
    payload: z.object({ team_color: z.string().optional() }),
  }),
  z.object({
    ...base,
    type: z.literal("ball_landed"),
    payload: z.object({ in_bounds: z.boolean(), side: z.enum(["home", "away"]).optional() }),
  }),
  z.object({
    ...base,
    type: z.literal("play_activity"),
    payload: z.object({
      active_seconds: z.number().nonnegative(),
      players_detected: z.number().int().nonnegative(),
    }),
  }),
]);

export const ingestEventsBody = z.object({ events: z.array(detectionEventSchema).min(1).max(500) });

export type DetectionEvent = z.infer<typeof detectionEventSchema>;

/**
 * Kontrak kalibrasi lapangan. Sumber kebenaran: contracts/calibration.schema.json.
 * Cermin pydantic: yolo-service/app/modules/calibration/contract.py.
 * TODO(decision): titik wajib per cabang masih usulan (4 sudut + ring/gawang).
 */
export const CALIBRATION_SPORTS = ["basketball", "badminton", "tennis", "padel", "futsal"] as const;
export const CALIBRATION_LAYOUTS = ["full_court", "half_court", "singles", "doubles", "standard"] as const;

/** Tata lapangan yang sah per cabang. */
export const LAYOUTS_BY_SPORT: Record<(typeof CALIBRATION_SPORTS)[number], readonly (typeof CALIBRATION_LAYOUTS)[number][]> = {
  basketball: ["full_court", "half_court"],
  badminton: ["singles", "doubles"],
  tennis: ["singles", "doubles"],
  padel: ["standard"],
  futsal: ["standard"],
};

const pointSchema = z.object({ x: z.number().nonnegative(), y: z.number().nonnegative() }).strict();

const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hoop"), points: z.array(pointSchema).length(2) }).strict(),
  z.object({ kind: z.literal("goal"), points: z.array(pointSchema).length(4) }).strict(),
]);

const cameraCalibrationSchema = z
  .object({
    frame: z.object({ width: z.number().int().min(1), height: z.number().int().min(1) }).strict(),
    court_corners: z.array(pointSchema).length(4),
    targets: z.array(targetSchema).max(2),
    marked_at: z.string().datetime({ offset: true }),
  })
  .strict()
  // Tidak bisa ditulis di JSON Schema: titik harus di dalam frame acuan.
  .superRefine((cam, ctx) => {
    const points = [...cam.court_corners, ...cam.targets.flatMap((t) => t.points)];
    if (points.some((p) => p.x > cam.frame.width || p.y > cam.frame.height)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Titik kalibrasi di luar frame" });
    }
  });

export const calibrationSchema = z
  .object({
    version: z.literal(1),
    sport: z.enum(CALIBRATION_SPORTS),
    layout: z.enum(CALIBRATION_LAYOUTS),
    cameras: z
      .object({ home: cameraCalibrationSchema.optional(), away: cameraCalibrationSchema.optional() })
      .strict()
      .refine((c) => c.home !== undefined || c.away !== undefined, { message: "Minimal satu kamera" }),
  })
  .strict()
  .superRefine((cal, ctx) => {
    if (!LAYOUTS_BY_SPORT[cal.sport].includes(cal.layout)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["layout"],
        message: `Layout ${cal.layout} tidak sah untuk ${cal.sport}`,
      });
    }
  });

export type Calibration = z.infer<typeof calibrationSchema>;
