/**
 * Pembagian pemain ke lapangan dan ronde (fungsi murni, tanpa database).
 * Aturan lengkap: docs/proposal.md bagian "Bracket Otomatis".
 *
 *  - kapasitas per ronde  = lapangan x pemain per lapangan
 *  - pemain istirahat     = peserta - kapasitas (bergantian)
 *  - jumlah ronde         = floor(durasi total / (durasi match + jeda))
 *  - prioritas main       = pemain dengan jumlah main paling sedikit masuk lebih dulu
 *  - selisih jumlah main antar pemain paling banyak 1
 *  - pasangan dan lawan dirotasi supaya tidak berulang
 */
export type Sport = "basketball" | "badminton" | "tennis" | "padel" | "futsal";
export type Mode = "singles" | "doubles" | "team";

export interface BracketInput {
  sport: Sport;
  mode: Mode;
  playerIds: string[];
  courtCount: number;
  totalMinutes: number;
  matchMinutes: number;
  breakMinutes: number;
  /** Basket half court: jumlah pemain per sisi diatur Coach. */
  playersPerSide?: number;
}

export interface BracketMatch {
  court: number;
  home: string[];
  away: string[];
}
export interface BracketRound {
  round: number;
  matches: BracketMatch[];
  resting: string[];
}

export function playersPerCourt(_sport: Sport, _mode: Mode, _playersPerSide?: number): number {
  // TODO: singles 2, doubles 4 (badminton/tennis/padel). Basket dan futsal dirotasi per tim.
  throw new Error("TODO: playersPerCourt");
}

export function roundCount(totalMinutes: number, matchMinutes: number, breakMinutes: number) {
  return Math.floor(totalMinutes / (matchMinutes + breakMinutes));
}

export function generateBracket(_input: BracketInput): BracketRound[] {
  // TODO: implementasi. Mulai dari kasus badminton ganda, lalu tunggal, lalu basket/futsal (rotasi tim).
  throw new Error("TODO: generateBracket");
}
