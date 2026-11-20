import { describe, expect, it } from "vitest";
import { cumulativeXpForLevel, levelFromXp, xpForDay } from "./service";

// Angka diambil dari tabel "Kebutuhan XP per level" di docs/proposal.md
describe("kurva level", () => {
  it.each([
    [2, 50],
    [3, 150],
    [4, 350],
    [5, 750],
    [6, 1350],
    [10, 5750],
    [20, 30750],
    [50, 225750],
    [100, 950750],
    [300, 8850750],
  ])("XP kumulatif level %i = %i", (level, xp) => {
    expect(cumulativeXpForLevel(level)).toBe(xp);
  });

  it("level 0 bila belum ada sesi terverifikasi", () => {
    expect(levelFromXp(0, false)).toBe(0);
    expect(levelFromXp(0, true)).toBe(1);
  });

  it("naik level tepat di ambang XP", () => {
    expect(levelFromXp(49, true)).toBe(1);
    expect(levelFromXp(50, true)).toBe(2);
    expect(levelFromXp(349, true)).toBe(3);
    expect(levelFromXp(350, true)).toBe(4);
  });

  it("level maksimal 300", () => {
    expect(levelFromXp(99_999_999, true)).toBe(300);
  });
});

describe("XP harian", () => {
  it("open play 2 XP per menit, solo 1 XP per menit", () => {
    expect(xpForDay({ openPlay: 60, solo: 0 })).toEqual({ minutesCounted: 60, xp: 120 });
    expect(xpForDay({ openPlay: 0, solo: 60 })).toEqual({ minutesCounted: 60, xp: 60 });
  });

  it("maksimal 180 menit per hari (360 XP bila semua open play)", () => {
    expect(xpForDay({ openPlay: 300, solo: 0 })).toEqual({ minutesCounted: 180, xp: 360 });
  });

  it("menit yang sudah dihitung hari ini mengurangi sisa jatah", () => {
    expect(xpForDay({ openPlay: 100, solo: 0 }, 120)).toEqual({ minutesCounted: 60, xp: 120 });
  });
});
