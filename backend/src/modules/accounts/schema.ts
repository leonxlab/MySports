import { z } from "zod";

export const sportSchema = z.enum(["basketball", "badminton", "tennis", "padel", "futsal"]);

export const bootstrapProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(80),
});

export const updateProfileSchema = z
  .object({
    display_name: z.string().trim().min(1).max(80).optional(),
    age: z.number().int().min(5).max(100).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    photo_path: z.string().trim().min(1).max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Minimal satu field harus diisi");

export const experienceSchema = z
  .object({
    years: z.number().min(0).max(80).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Minimal satu field harus diisi");

export const galleryItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("photo"),
    storage_path: z.string().trim().min(1).max(500),
  }),
  z.object({
    kind: z.literal("video"),
    storage_path: z.string().trim().min(1).max(500),
  }),
  z.object({
    kind: z.literal("quote"),
    quote_text: z.string().trim().min(1).max(1000),
  }),
]);

export const uploadSchema = z.object({
  file_name: z.string().trim().min(1).max(200),
  content_type: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]),
});

export type BootstrapProfileInput = z.infer<typeof bootstrapProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type GalleryItemInput = z.infer<typeof galleryItemSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;
