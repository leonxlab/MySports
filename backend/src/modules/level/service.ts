import type { AppContext } from "../../core/context";

/** Aturan XP dari proposal (bagian Profil dan Level). */
export const XP_PER_MINUTE = { openPlay: 2, solo: 1 } as const;
export const DAILY_CAP_MINUTES = 180;
export const MAX_LEVEL = 300;

/**
 * XP kumulatif minimum untuk mencapai level n.
 * Level 1 = 0 XP, Level 2 = 50, Level 3 = 150, lalu selisih naik 200 XP tiap level mulai Level 4:
 * XP naik ke level n = 200 * (n - 3), n >= 4.  Bentuk tertutup: 150 + 100 * (n - 3) * (n - 2).
 */
export function cumulativeXpForLevel(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return 50;
  if (n === 3) return 150;
  return 150 + 100 * (n - 3) * (n - 2);
}

/** Level 0 = belum ada sesi terverifikasi. */
export function levelFromXp(xp: number, hasVerifiedSession: boolean): number {
  if (!hasVerifiedSession) return 0;
  let level = 1;
  while (level < MAX_LEVEL && xp >= cumulativeXpForLevel(level + 1)) level++;
  return level;
}

/** Hanya menit terverifikasi yang dihitung, maksimal 180 menit per hari. */
export function xpForDay(
  verifiedMinutes: { openPlay: number; solo: number },
  alreadyCountedMinutesToday = 0,
): { minutesCounted: number; xp: number } {
  let room = Math.max(0, DAILY_CAP_MINUTES - alreadyCountedMinutesToday);
  const openPlay = Math.min(verifiedMinutes.openPlay, room);
  room -= openPlay;
  const solo = Math.min(verifiedMinutes.solo, room);
  return {
    minutesCounted: openPlay + solo,
    xp: openPlay * XP_PER_MINUTE.openPlay + solo * XP_PER_MINUTE.solo,
  };
}

export function createLevelService(_ctx: AppContext) {
  return {
    // TODO: ambil user_xp dari DB, ingest play-activity dari yolo-service, tulis xp_ledger
  };
}

export type LevelService = ReturnType<typeof createLevelService>;
