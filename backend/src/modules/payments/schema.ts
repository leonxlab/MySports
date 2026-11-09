import { z } from "zod";

// Skema zod untuk body dan query modul payments.
// Tipe respons yang dipakai frontend ditulis ulang di frontend/src/modules/payments/types.ts.

export const checkoutSchema = z.object({
  targetType: z.enum(["open_play", "court_booking", "equipment_rental"]),
  targetId: z.string().uuid(),
});
export type CheckoutBody = z.infer<typeof checkoutSchema>;

export const withdrawSchema = z.object({
  /** Rupiah bulat. */
  amount: z.number().int().min(1).max(1_000_000_000),
});

export const feeSettingsSchema = z.object({
  model: z.enum(["withdraw_percent", "payer_fee"]),
  percent: z.number().min(0).max(100),
});
export type FeeSettingsBody = z.infer<typeof feeSettingsSchema>;

export const entriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
