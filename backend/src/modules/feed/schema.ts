import { z } from "zod";
import { sportSchema } from "../accounts/schema";

export const contentTypeSchema = z.enum(["open_play", "venue", "equipment", "thread"]);
export const contentKindSchema = z.enum([
  "open_play",
  "venue",
  "equipment",
  "thread",
  "achievement",
  "score",
]);
export const contentFormatSchema = z.enum(["text", "photo", "video"]);
export const signalKindSchema = z.enum([
  "search",
  "view_open_play",
  "view_thread",
  "post_thread",
  "join_open_play",
]);

export const classifyContentSchema = z
  .object({
    content_type: contentTypeSchema,
    content_id: z.string().uuid(),
    sport: sportSchema.nullable().optional(),
    content_kind: contentKindSchema,
    format: contentFormatSchema.nullable().optional(),
    city: z.string().trim().max(120).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    level_min: z.number().int().min(0).nullable().optional(),
    level_max: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (input) =>
      (input.latitude === undefined || input.latitude === null) ===
      (input.longitude === undefined || input.longitude === null),
    { message: "Latitude dan longitude harus diisi bersama", path: ["latitude"] },
  )
  .refine(
    (input) =>
      input.level_min == null || input.level_max == null || input.level_min <= input.level_max,
    { message: "level_min tidak boleh melebihi level_max", path: ["level_max"] },
  );

export const recordSignalSchema = z
  .object({
    kind: signalKindSchema,
    sport: sportSchema.optional(),
    term: z.string().trim().max(100).optional(),
    ref_id: z.string().uuid().optional(),
  })
  .refine((input) => input.kind !== "search" || Boolean(input.term), {
    message: "Term wajib diisi untuk sinyal pencarian",
    path: ["term"],
  })
  .refine(
    (input) =>
      (input.kind !== "view_thread" && input.kind !== "post_thread") || Boolean(input.ref_id),
    {
      message: "ref_id wajib diisi untuk interaksi thread",
      path: ["ref_id"],
    },
  )
  .refine(
    (input) =>
      (input.kind !== "view_open_play" && input.kind !== "join_open_play") || Boolean(input.ref_id),
    {
      message: "ref_id wajib diisi untuk interaksi open play",
      path: ["ref_id"],
    },
  );

export const feedFiltersSchema = z
  .object({
    sport: sportSchema.optional(),
    content_kind: contentKindSchema.optional(),
    format: contentFormatSchema.optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radius_km: z.coerce.number().int().min(1).max(500).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().optional(),
  })
  .refine((input) => (input.latitude === undefined) === (input.longitude === undefined), {
    message: "Latitude dan longitude harus diisi bersama",
    path: ["latitude"],
  })
  .refine((input) => input.radius_km === undefined || input.latitude !== undefined, {
    message: "Lokasi wajib diisi untuk filter jarak",
    path: ["radius_km"],
  });

export type ClassifyContentInput = z.infer<typeof classifyContentSchema>;
export type RecordSignalInput = z.infer<typeof recordSignalSchema>;
export type FeedFilters = z.infer<typeof feedFiltersSchema>;
