import { z } from "zod";

export const otpPurposeSchema = z.enum(["signup", "login"]);

export const otpRequestSchema = z.object({
  email: z.string().trim().email().max(254),
  purpose: otpPurposeSchema,
});

export const otpVerifySchema = z.object({
  email: z.string().trim().email().max(254),
  purpose: otpPurposeSchema,
  code: z.string().regex(/^\d{6}$/, "Kode 6 digit angka"),
});

export type OtpPurpose = z.infer<typeof otpPurposeSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
