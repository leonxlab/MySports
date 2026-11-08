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
