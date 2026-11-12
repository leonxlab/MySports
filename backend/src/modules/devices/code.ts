import { randomInt } from "node:crypto";

/**
 * Kode sesi pairing: pendek, tanpa karakter yang mudah tertukar (0/O, 1/I/L), acak kriptografis.
 * 31 karakter ^ 6 = sekitar 887 juta kombinasi; dengan batas percobaan per user, tebakan acak tidak praktis.
 */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 6;
/** TODO(decision): masa berlaku kode. Cukup untuk setup kamera sebelum match. */
export const CODE_TTL_MINUTES = 30;

export function generateSessionCode(rand: (max: number) => number = randomInt): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  return code;
}

/** Normalisasi input pengguna: huruf besar, buang spasi dan tanda hubung. */
export function normalizeSessionCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isValidSessionCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/**
 * Batas percobaan kode salah per user dalam jendela waktu. Disimpan di memori proses (cukup untuk
 * satu dyno, sama seperti RealtimeHub). TODO(decision): pindah ke tabel bila backend >1 dyno.
 */
export class AttemptLimiter {
  private failures = new Map<string, number[]>();

  constructor(
    private readonly max = 10,
    private readonly windowMs = 10 * 60 * 1000,
  ) {}

  private recent(key: string, now: number) {
    const list = (this.failures.get(key) ?? []).filter((t) => now - t < this.windowMs);
    this.failures.set(key, list);
    return list;
  }

  isBlocked(key: string, now = Date.now()): boolean {
    return this.recent(key, now).length >= this.max;
  }

  recordFailure(key: string, now = Date.now()) {
    this.recent(key, now).push(now);
  }

  reset(key: string) {
    this.failures.delete(key);
  }
}
