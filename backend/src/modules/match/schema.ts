import { z } from "zod";

// Skema zod untuk body dan query modul match.
// Tipe respons yang dipakai frontend ditulis ulang di frontend/src/modules/match/types.ts.

export const sportSchema = z.enum(["basketball", "badminton", "tennis", "padel", "futsal"]);

const breakRule = z.object({
  count: z.number().int().min(0).max(20),
  seconds: z.number().int().min(0).max(1800),
});

/** Penimpa sebagian dari nilai bawaan cabang. Field yang tidak dikirim memakai nilai bawaan. */
export const settingsOverrideSchema = z
  .object({
    mode: z.enum(["singles", "doubles", "team"]),
    durationMinutes: z.number().int().min(1).max(240),
    playersPerSide: z.number().int().min(1).max(10),
    timeout: breakRule.partial(),
    hydration: breakRule.partial(),
    breakMinutes: z.number().int().min(0).max(120),
    rules: z.record(z.unknown()),
  })
  .partial()
  .strict();
export type SettingsOverride = z.infer<typeof settingsOverrideSchema>;

export const createMatchSchema = z
  .object({
    /** Wajib bila tanpa bracketMatchId; bila ada bracketMatchId, cabang diambil dari bracket. */
    sport: sportSchema.optional(),
    bracketMatchId: z.string().uuid().optional(),
    settings: settingsOverrideSchema.optional(),
  })
  .refine((v) => v.sport || v.bracketMatchId, { message: "Isi sport atau bracketMatchId" });
export type CreateMatchInput = z.infer<typeof createMatchSchema>;

export const updateSettingsSchema = settingsOverrideSchema;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
