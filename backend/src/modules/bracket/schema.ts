import { z } from "zod";

// Skema zod untuk body dan query modul bracket.
// Tipe respons yang dipakai frontend ditulis ulang di frontend/src/modules/bracket/types.ts.

export const generateBracketSchema = z.object({
  openPlayId: z.string().uuid(),
  mode: z.enum(["singles", "doubles", "team"]),
  courtCount: z.number().int().min(1).max(50),
  matchMinutes: z.number().int().min(1).max(240),
  breakMinutes: z.number().int().min(0).max(120).default(0),
  /** Kosong = dipakai selisih jam mulai dan selesai open play. */
  totalMinutes: z.number().int().min(1).max(1440).optional(),
  /** Basket half court: jumlah pemain per sisi. */
  playersPerSide: z.number().int().min(1).max(10).optional(),
});
export type GenerateBracketInput = z.infer<typeof generateBracketSchema>;

export const regenerateBracketSchema = generateBracketSchema.omit({ openPlayId: true }).partial();
export type RegenerateBracketInput = z.infer<typeof regenerateBracketSchema>;

export const correctMatchSchema = z.object({
  home: z.array(z.string().uuid()).min(1),
  away: z.array(z.string().uuid()).min(1),
});
export type CorrectMatchInput = z.infer<typeof correctMatchSchema>;
