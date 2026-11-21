import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { AppError, unauthorized } from "../../core/errors";
import {
  otpRequestSchema,
  otpVerifySchema,
  type OtpPurpose,
  type OtpRequestInput,
  type OtpVerifyInput,
} from "./schema";

/**
 * OTP email untuk daftar dan login. Kode 6 digit dikirim via SMTP Resend
 * (smtp.resend.com:465, user "resend", password = RESEND_API_KEY).
 * Penyimpanan di tabel `auth_otp_codes` (hash saja, tidak pernah teks polos).
 * Rate limit bertingkat supaya tidak bisa dipakai spam:
 *   - kirim: maks 5 permintaan per email per jam, maks 30 per IP per jam
 *   - verifikasi: maks 5 percobaan salah per kode, lalu kode hangus
 *   - cooldown: 60 detik antar pengiriman ke email yang sama
 * Login dengan Google tetap lewat Supabase OAuth; OTP email hanya untuk
 * alur daftar/masuk di dalam aplikasi (in-app), bukan pengganti OAuth.
 */

const CODE_TTL_MINUTES = 5;
const SEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_EMAIL_PER_HOUR = 5;
const MAX_SENDS_PER_IP_PER_HOUR = 30;
const MAX_VERIFY_ATTEMPTS = 5;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function hashEmail(email: string, pepper: string) {
  return sha256(`${email}|${pepper}`);
}

function hashCode(code: string, email: string, pepper: string) {
  return sha256(`${code}|${email}|${pepper}`);
}

function safeEqualHex(a: string, b: string) {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export interface AuthOtpService {
  request(input: OtpRequestInput, ip: string | undefined): Promise<{ sent: boolean }>;
  /** Mengembalikan URL pertukaran sesi Supabase (magic link token hash) setelah OTP valid. */
  verify(
    input: OtpVerifyInput,
    ip: string | undefined,
  ): Promise<{ created: boolean; redirect_url: string }>;
}

export function createAuthOtpService(ctx: {
  env: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    RESEND_API_KEY: string;
    RESEND_SMTP_HOST: string;
    RESEND_SMTP_PORT: number;
    RESEND_FROM_EMAIL: string;
    OTP_PEPPER: string;
  };
  supabase: import("@supabase/supabase-js").SupabaseClient;
}): AuthOtpService {
  const { env, supabase } = ctx;
  const pepper = env.OTP_PEPPER || env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 32);
  // SMTP Resend: user tetap "resend", password = API key. Kosong = mode dev (kode ke log).
  const transporter: Transporter | null = env.RESEND_API_KEY
    ? nodemailer.createTransport({
        host: env.RESEND_SMTP_HOST,
        port: env.RESEND_SMTP_PORT,
        secure: true,
        auth: { user: "resend", pass: env.RESEND_API_KEY },
      })
    : null;

  function emailOf(raw: string) {
    return raw.trim().toLowerCase();
  }

  async function sendEmail(to: string, code: string, purpose: OtpPurpose) {
    if (!transporter) {
      // Dev tanpa RESEND_API_KEY: kode ditulis ke log supaya bisa dicoba.
      console.warn(`[auth-otp] RESEND_API_KEY kosong — kode untuk ${to}: ${code}`);
      return;
    }
    const subject = purpose === "signup" ? "Kode daftar Peluit" : "Kode masuk Peluit";
    try {
      await transporter.sendMail({
        from: env.RESEND_FROM_EMAIL,
        to,
        subject,
        text: `Kode ${purpose === "signup" ? "pendaftaran" : "login"} kamu: ${code}\n\nBerlaku ${CODE_TTL_MINUTES} menit. Jangan bagikan kode ini kepada siapa pun. Kalau bukan kamu yang meminta, abaikan email ini.`,
        html: `<div style="font-family: Arial, sans-serif; max-width: 420px; margin: 0 auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
  <h2 style="margin: 0 0 8px;">Peluit</h2>
  <p style="color: #555;">Gunakan kode ${purpose === "signup" ? "pendaftaran" : "verifikasi"} berikut untuk melanjutkan:</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; margin: 24px 0;">${code}</p>
  <p style="color: #555; font-size: 14px;">Kode berlaku selama ${CODE_TTL_MINUTES} menit. Jangan bagikan kode ini kepada siapa pun, termasuk pihak Peluit.</p>
</div>`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(502, "OTP_SEND_FAILED", `Gagal mengirim email: ${message}`);
    }
  }

  return {
    async request(input, ip) {
      const email = emailOf(input.email);
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600_000);
      const cooldownAt = new Date(now.getTime() - SEND_COOLDOWN_SECONDS * 1000);

      // cooldown per email
      const { data: last } = await supabase
        .from("auth_otp_codes")
        .select("requested_at")
        .eq("email", email)
        .eq("purpose", input.purpose)
        .gte("requested_at", cooldownAt.toISOString())
        .order("requested_at", { ascending: false })
        .limit(1);
      if (last && last.length > 0) {
        throw new AppError(429, "OTP_COOLDOWN", "Tunggu sebentar sebelum meminta kode lagi");
      }

      // batas per email per jam
      const { count: emailCount } = await supabase
        .from("auth_otp_codes")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .eq("purpose", input.purpose)
        .gte("requested_at", hourAgo.toISOString());
      if ((emailCount ?? 0) >= MAX_SENDS_PER_EMAIL_PER_HOUR) {
        throw new AppError(429, "OTP_LIMIT_EMAIL", "Terlalu banyak permintaan kode untuk email ini");
      }

      // batas per IP per jam
      if (ip) {
        const ipHash = sha256(`${ip}|${pepper}`);
        const { count: ipCount } = await supabase
          .from("auth_otp_codes")
          .select("id", { count: "exact", head: true })
          .eq("ip_hash", ipHash)
          .gte("requested_at", hourAgo.toISOString());
        if ((ipCount ?? 0) >= MAX_SENDS_PER_IP_PER_HOUR) {
          throw new AppError(429, "OTP_LIMIT_IP", "Terlalu banyak permintaan kode dari jaringan ini");
        }
      }

      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60_000);

      // Satu kode aktif per (email, purpose): hanguskan yang lama dengan mengganti barisnya.
      await supabase
        .from("auth_otp_codes")
        .delete()
        .eq("email", email)
        .eq("purpose", input.purpose)
        .is("consumed_at", null);

      const { error } = await supabase.from("auth_otp_codes").insert({
        email,
        email_hash: hashEmail(email, pepper),
        purpose: input.purpose,
        code_hash: hashCode(code, email, pepper),
        expires_at: expiresAt.toISOString(),
        ip_hash: ip ? sha256(`${ip}|${pepper}`) : null,
      });
      if (error) throw new AppError(500, "OTP_STORE_FAILED", "Gagal menyimpan kode");

      await sendEmail(email, code, input.purpose);
      return { sent: true };
    },

    async verify(input, _ip) {
      const email = emailOf(input.email);
      const now = new Date().toISOString();

      const { data: rows, error } = await supabase
        .from("auth_otp_codes")
        .select("id, code_hash, attempts, expires_at, consumed_at")
        .eq("email", email)
        .eq("purpose", input.purpose)
        .is("consumed_at", null)
        .order("requested_at", { ascending: false })
        .limit(1);
      if (error) throw new AppError(500, "OTP_LOOKUP_FAILED", "Gagal memeriksa kode");
      const record = rows?.[0];
      if (!record) throw unauthorized("Kode tidak ditemukan atau sudah dipakai. Minta kode baru.");

      if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
        throw unauthorized("Terlalu banyak percobaan salah. Minta kode baru.");
      }
      if (record.expires_at < now) {
        throw unauthorized("Kode sudah kedaluwarsa. Minta kode baru.");
      }

      if (!safeEqualHex(record.code_hash, hashCode(input.code, email, pepper))) {
        const nextAttempts = record.attempts + 1;
        await supabase
          .from("auth_otp_codes")
          .update({ attempts: nextAttempts })
          .eq("id", record.id);
        if (nextAttempts >= MAX_VERIFY_ATTEMPTS) {
          // hanguskan kode setelah batas percobaan, paksa minta baru
          await supabase.from("auth_otp_codes").delete().eq("id", record.id);
        }
        throw unauthorized("Kode salah");
      }

      // tandai terpakai agar tidak bisa dipakai ulang
      await supabase.from("auth_otp_codes").update({ consumed_at: now }).eq("id", record.id);

      // Daftar: buat user Supabase (email belum terdaftar).
      // Login: buat magic link supaya frontend dapat sesi tanpa password.
      if (input.purpose === "signup") {
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
        });
        if (createError || !created?.user) {
          const message = createError?.message ?? "";
          if (message.includes("already") || message.includes("terdaftar")) {
            throw new AppError(409, "EMAIL_TAKEN", "Email sudah terdaftar, gunakan login");
          }
          throw new AppError(500, "ACCOUNT_CREATE_FAILED", "Gagal membuat akun");
        }
        // TODO(integration): frontend memanggil signInWithOtp untuk sesi setelah akun dibuat.
        return { created: true, redirect_url: `${"/"}?auth=otp-signup` };
      }

      const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkError || !link?.properties?.hashed_token) {
        throw new AppError(500, "SESSION_FAILED", "Gagal membuat sesi login");
      }
      // Frontend menukar hashed_token ini menjadi sesi lewat
      // supabase.auth.verifyOtp({ type: "magiclink", token_hash, ... }).
      return {
        created: false,
        redirect_url: `/auth/callback?token_hash=${link.properties.hashed_token}&type=magiclink`,
      };
    },
  };
}

export const otpServiceSymbol = Symbol("authOtp");

export function registerOtpRoutes(app: FastifyInstance) {
  const service = createAuthOtpService(app.ctx);

  app.post("/request", async (request) => {
    const input = otpRequestSchema.parse(request.body);
    const ip =
      (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      request.ip;
    return service.request(input, ip);
  });

  app.post("/verify", async (request) => {
    const input = otpVerifySchema.parse(request.body);
    const ip =
      (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
      request.ip;
    return service.verify(input, ip);
  });
}
