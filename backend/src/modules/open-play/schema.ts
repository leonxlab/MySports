import { z } from "zod";

// Skema zod untuk body dan query modul open-play.
// Tipe respons yang dipakai frontend ditulis ulang di frontend/src/modules/open-play/types.ts.

const sport = z.enum(["basketball", "badminton", "tennis", "padel", "futsal"]);
const iso = z.string().datetime({ offset: true });

export const createOpenPlaySchema = z
  .object({
    courtId: z.string().uuid(),
    startsAt: iso,
    endsAt: iso,
    quota: z.number().int().min(1).max(200),
    /** Rupiah bulat. 0 = gratis. */
    price: z.number().int().min(0).max(100_000_000),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), { message: "endsAt harus setelah startsAt" });
export type CreateOpenPlayInput = z.infer<typeof createOpenPlaySchema>;

export const updateOpenPlaySchema = z
  .object({
    startsAt: iso,
    endsAt: iso,
    quota: z.number().int().min(1).max(200),
    price: z.number().int().min(0).max(100_000_000),
    status: z.enum(["open", "closed", "cancelled", "finished"]),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Tidak ada yang diubah" });
export type UpdateOpenPlayInput = z.infer<typeof updateOpenPlaySchema>;

export const searchOpenPlaySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.1).max(100).default(10),
  sport: sport.optional(),
  /** Tanggal (YYYY-MM-DD, UTC). */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type SearchOpenPlayInput = z.infer<typeof searchOpenPlaySchema>;

export const memberSearchSchema = z.object({
  q: z.string().trim().min(1).max(80),
  sport: sport.optional(),
});
