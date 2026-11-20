/**
 * Validasi koreksi manual susunan pemain (fungsi murni).
 * Coach boleh mengubah isi satu match, tetapi susunan ronde tetap harus masuk akal.
 */
export interface CorrectionContext {
  /** Pemain terkonfirmasi di open play ini. */
  participants: string[];
  /** Pemain di match lain pada ronde yang sama. */
  otherPlayersInRound: string[];
  /** Ukuran sisi yang diharapkan (tunggal 1, ganda 2, tim sesuai pengaturan). */
  perSide: number;
}

export type CorrectionProblem =
  | "UNKNOWN_PLAYER"
  | "DUPLICATE_PLAYER"
  | "PLAYER_IN_OTHER_MATCH"
  | "WRONG_SIDE_SIZE";

/** Mengembalikan daftar masalah; kosong berarti koreksi sah. */
export function validateCorrection(
  home: string[],
  away: string[],
  ctx: CorrectionContext,
): CorrectionProblem[] {
  const problems = new Set<CorrectionProblem>();
  const all = [...home, ...away];
  const participants = new Set(ctx.participants);
  const others = new Set(ctx.otherPlayersInRound);

  if (home.length !== ctx.perSide || away.length !== ctx.perSide) problems.add("WRONG_SIDE_SIZE");
  if (new Set(all).size !== all.length) problems.add("DUPLICATE_PLAYER");
  for (const id of all) {
    if (!participants.has(id)) problems.add("UNKNOWN_PLAYER");
    if (others.has(id)) problems.add("PLAYER_IN_OTHER_MATCH");
  }
  return [...problems];
}

export interface SwapRound {
  matches: { id: string; home: string[]; away: string[] }[];
  resting: string[];
}

export class SwapError extends Error {
  constructor(
    public code: "SAME_PLAYER" | "PLAYER_NOT_IN_ROUND",
    message: string,
  ) {
    super(message);
  }
}

/**
 * Tukar posisi dua pemain dalam satu ronde (fungsi murni). Tiap pemain bisa sedang di sisi mana pun
 * dari match mana pun, atau sedang istirahat. Hasilnya selalu sah: tidak ada pemain ganda dan
 * ukuran sisi tidak berubah, jadi tidak perlu `validateCorrection` lagi.
 */
export function swapPlayers(round: SwapRound, a: string, b: string): SwapRound {
  if (a === b) throw new SwapError("SAME_PLAYER", "Pilih dua pemain yang berbeda");
  const present = new Set([...round.matches.flatMap((m) => [...m.home, ...m.away]), ...round.resting]);
  if (!present.has(a) || !present.has(b)) {
    throw new SwapError("PLAYER_NOT_IN_ROUND", "Pemain tidak ada di ronde ini");
  }
  const swap = (id: string) => (id === a ? b : id === b ? a : id);
  return {
    matches: round.matches.map((m) => ({ id: m.id, home: m.home.map(swap), away: m.away.map(swap) })),
    resting: round.resting.map(swap),
  };
}
