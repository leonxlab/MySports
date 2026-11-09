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
