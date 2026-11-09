import { z } from "zod";

export const sportSchema = z.enum(["basketball", "badminton", "tennis", "padel", "futsal"]);
export const mediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  path: z.string().trim().min(1).max(500),
});

export const createThreadSchema = z.object({
  sport: sportSchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(5000).optional(),
  media: z.array(mediaItemSchema).max(10).default([]),
});

export const addPostSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  media: z.array(mediaItemSchema).max(10).default([]),
});

export const listThreadsSchema = z.object({
  sport: sportSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const signMediaSchema = z.object({
  file_name: z.string().trim().min(1).max(200),
  content_type: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]),
  file_size: z
    .number()
    .int()
    .positive()
    .max(50 * 1024 * 1024),
});

export const createReportSchema = z.object({
  target_type: z.enum(["thread", "post"]),
  target_id: z.string().uuid(),
  reason: z.string().trim().min(1).max(1000),
});

export const listReportsSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed"]).default("open"),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export const resolveReportSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  hide_content: z.boolean().default(false),
});

export const idParamsSchema = z.object({ id: z.string().uuid() });
export const cursorSchema = z.object({
  created_at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type AddPostInput = z.infer<typeof addPostSchema>;
export type ListThreadsInput = z.infer<typeof listThreadsSchema>;
export type SignMediaInput = z.infer<typeof signMediaSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ListReportsInput = z.infer<typeof listReportsSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
