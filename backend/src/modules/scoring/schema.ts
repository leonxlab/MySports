import { z } from "zod";

// Skema zod untuk body dan query modul scoring.
// Tipe respons yang dipakai frontend ditulis ulang di frontend/src/modules/scoring/types.ts.

export const teamSchema = z.enum(["home", "away"]);

export const matchParams = z.object({ matchId: z.string().uuid() });
export const eventParams = z.object({ eventId: z.string().uuid() });
export const userParams = z.object({ userId: z.string().uuid() });
export const playerParams = z.object({ matchId: z.string().uuid(), playerId: z.string().uuid() });

/** Label aksi manual Coach (jenis tembakan, tendangan, pukulan). Contoh: "layup", "smash", "penalty". */
const actionLabel = z.string().trim().min(1).max(40);

/** Input skor manual dari controller Coach. Masuk langsung sebagai `confirmed`. */
export const addEventBody = z
  .object({
    kind: z.enum(["basket_made", "goal", "point"]),
    team: teamSchema,
    /** Wajib untuk basket: 1 (lemparan bebas), 2, atau 3. */
    points: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    scorerId: z.string().uuid().optional(),
    action: actionLabel.optional(),
    occurredAtMs: z.number().int().nonnegative().optional(),
  })
  .strict()
  .refine((b) => b.kind !== "basket_made" || b.points !== undefined, {
    message: "Basket wajib memilih poin 1, 2, atau 3",
    path: ["points"],
  });
export type AddEventInput = z.infer<typeof addEventBody>;

/** Konfirmasi atau koreksi kejadian (usulan AI atau kejadian yang sudah dihitung). */
export const reviewEventBody = z
  .object({
    action: z.enum(["confirm", "correct"]),
    team: teamSchema.optional(),
    points: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    scorerId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type ReviewEventInput = z.infer<typeof reviewEventBody>;

export const playerPointsBody = z
  .object({
    points: z.number().int().min(0).max(1000),
    stats: z.record(actionLabel, z.number().int().min(0).max(1000)).optional(),
  })
  .strict();
export type PlayerPointsInput = z.infer<typeof playerPointsBody>;

export const foulBody = z
  .object({
    playerId: z.string().uuid(),
    kind: z.string().trim().min(1).max(50).optional(),
  })
  .strict();
export type FoulInput = z.infer<typeof foulBody>;
