import { z } from "zod";

// Skema zod untuk body dan query modul venues.
// Tipe respons yang dipakai frontend ditulis ulang di frontend/src/modules/venues/types.ts.

const sport = z.enum(["basketball", "badminton", "tennis", "padel", "futsal"]);

export const createVenueSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type CreateVenueInput = z.infer<typeof createVenueSchema>;

export const updateVenueSchema = createVenueSchema.partial();
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;

export const addCourtSchema = z.object({
  sport,
  name: z.string().trim().min(1).max(80),
  pricePerHour: z.number().int().min(0).max(100_000_000).default(0),
});
export type AddCourtInput = z.infer<typeof addCourtSchema>;

export const searchVenuesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.1).max(100).default(10),
  sport: sport.optional(),
});
export type SearchVenuesInput = z.infer<typeof searchVenuesSchema>;

export const availabilityQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export const setAvailabilitySchema = z.object({
  slots: z
    .array(
      z.object({
        startsAt: z.string().datetime({ offset: true }),
        endsAt: z.string().datetime({ offset: true }),
        status: z.enum(["free", "blocked"]),
      }),
    )
    .min(1)
    .max(500),
});
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;

export const setPriceSchema = z.object({
  pricePerHour: z.number().int().min(0).max(100_000_000),
});
