import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  YOLO_SERVICE_KEY: z.string().min(16),
  PAYMENT_PROVIDER: z.string().default("undecided"),
  PAYMENT_WEBHOOK_SECRET: z.string().default(""),
  // Gateway LxPay (QRIS LeonXLab, https://leonxlab.app/docs/lxpay). Aktif bila PAYMENT_PROVIDER=lxpay.
  LXPAY_API_KEY: z.string().default(""),
  LXPAY_WEBHOOK_SECRET: z.string().default(""),
  LXPAY_BASE_URL: z.string().default("https://leonxlab.app"),
  // OTP email via SMTP Resend (modul auth-otp). Nonaktif bila API key kosong.
  RESEND_API_KEY: z.string().default(""),
  RESEND_SMTP_HOST: z.string().default("smtp.resend.com"),
  RESEND_SMTP_PORT: z.coerce.number().default(465),
  RESEND_FROM_EMAIL: z.string().default("Peluit OTP <otp@id.leonxlab.com>"),
  OTP_PEPPER: z.string().default(""),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    console.error("Env tidak valid:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment");
  }
  return parsed.data;
}
