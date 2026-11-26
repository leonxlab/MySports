import { describe, expect, it } from "vitest";
import {
  AttemptLimiter,
  CODE_ALPHABET,
  CODE_LENGTH,
  generateSessionCode,
  isValidSessionCode,
  normalizeSessionCode,
} from "./code";

describe("kode sesi", () => {
  it("panjang tetap dan hanya memakai alfabet tanpa karakter membingungkan", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateSessionCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(isValidSessionCode(code)).toBe(true);
    }
    for (const c of "01OIL") expect(CODE_ALPHABET).not.toContain(c);
  });

  it("deterministik dengan sumber acak tiruan", () => {
    expect(generateSessionCode(() => 0)).toBe("222222");
  });

  it("normalisasi input pengguna", () => {
    expect(normalizeSessionCode(" ab3-c4d ")).toBe("AB3C4D");
    expect(isValidSessionCode("AB0C4D")).toBe(false);
    expect(isValidSessionCode("AB3C4")).toBe(false);
  });
});

describe("AttemptLimiter", () => {
  it("memblokir setelah batas gagal dan pulih setelah jendela lewat", () => {
    const l = new AttemptLimiter(3, 1000);
    for (let i = 0; i < 3; i++) l.recordFailure("u", 0);
    expect(l.isBlocked("u", 500)).toBe(true);
    expect(l.isBlocked("u", 1500)).toBe(false);
    expect(l.isBlocked("other", 500)).toBe(false);
  });
});
