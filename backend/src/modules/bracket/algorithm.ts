/**
 * Pembagian pemain ke lapangan dan ronde (fungsi murni, tanpa database).
 * Aturan lengkap: docs/proposal.md bagian "Bracket Otomatis".
 *
 *  - kapasitas per ronde  = lapangan x pemain per lapangan
 *  - pemain istirahat     = peserta - kapasitas (bergantian)
 *  - jumlah ronde         = floor(durasi total / (durasi match + jeda))
 *  - prioritas main       = pemain dengan jumlah main paling sedikit masuk lebih dulu
 *  - selisih jumlah main antar pemain paling banyak 1
 *  - pasangan dan lawan dirotasi supaya tidak berulang (sebisanya)
 *
 * Hasil deterministik: input sama + `seed` sama -> bracket sama.
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
  /** Mengubah variasi pasangan. Default 1. */
  seed?: number;
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

export class BracketError extends Error {
  constructor(
    public code: "INVALID_MODE" | "NOT_ENOUGH_PLAYERS" | "NO_ROUNDS" | "INVALID_INPUT",
    message: string,
  ) {
    super(message);
  }
}

/** TODO(decision): ukuran tim bawaan basket dan futsal bila Coach tidak mengatur. */
export const DEFAULT_TEAM_SIZE = 5;

const racketSports: Sport[] = ["badminton", "tennis", "padel"];

export function playersPerSide(
  sport: Sport,
  mode: Mode,
  playersPerSideOverride?: number,
): number {
  if (mode === "singles") return 1;
  if (mode === "doubles") return 2;
  return playersPerSideOverride ?? DEFAULT_TEAM_SIZE;
}

export function playersPerCourt(sport: Sport, mode: Mode, playersPerSideOverride?: number): number {
  const racket = racketSports.includes(sport);
  if (racket && mode === "team") {
    throw new BracketError("INVALID_MODE", `${sport} hanya tunggal atau ganda`);
  }
  if (!racket && mode !== "team") {
    throw new BracketError("INVALID_MODE", `${sport} dimainkan per tim`);
  }
  if (mode === "team" && playersPerSideOverride !== undefined) {
    if (!Number.isInteger(playersPerSideOverride) || playersPerSideOverride < 1) {
      throw new BracketError("INVALID_INPUT", "playersPerSide harus bilangan bulat >= 1");
    }
  }
  return 2 * playersPerSide(sport, mode, playersPerSideOverride);
}

export function roundCount(totalMinutes: number, matchMinutes: number, breakMinutes: number) {
  return Math.floor(totalMinutes / (matchMinutes + breakMinutes));
}

// ---------- util ----------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

class History {
  partners = new Map<string, number>();
  opponents = new Map<string, number>();
  teamOpponents = new Map<string, number>();

  private bump(map: Map<string, number>, k: string) {
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  recordMatch(home: string[], away: string[]) {
    for (const side of [home, away]) {
      for (let i = 0; i < side.length; i++) {
        for (let j = i + 1; j < side.length; j++) this.bump(this.partners, key(side[i]!, side[j]!));
      }
    }
    for (const h of home) for (const a of away) this.bump(this.opponents, key(h, a));
  }
  matchCost(home: string[], away: string[]) {
    let cost = 0;
    for (const side of [home, away]) {
      for (let i = 0; i < side.length; i++) {
        for (let j = i + 1; j < side.length; j++) {
          cost += 10 * (this.partners.get(key(side[i]!, side[j]!)) ?? 0);
        }
      }
    }
    for (const h of home) for (const a of away) cost += this.opponents.get(key(h, a)) ?? 0;
    return cost;
  }
}

const TRIES = 400;

/** Pilih siapa yang main: yang paling sedikit main dulu, lalu yang terakhir main paling lama. */
function pickPlayers(
  ids: string[],
  plays: Map<string, number>,
  lastPlayed: Map<string, number>,
  count: number,
) {
  const order = new Map(ids.map((id, i) => [id, i]));
  const sorted = [...ids].sort(
    (a, b) =>
      plays.get(a)! - plays.get(b)! ||
      lastPlayed.get(a)! - lastPlayed.get(b)! ||
      order.get(a)! - order.get(b)!,
  );
  const active = sorted.slice(0, count);
  const activeSet = new Set(active);
  const resting = ids.filter((id) => !activeSet.has(id));
  // pertahankan urutan awal supaya hasil mudah dibaca
  return { active: ids.filter((id) => activeSet.has(id)), resting };
}

/** Bagi pemain aktif ke lapangan dan sisi dengan biaya pengulangan terkecil. */
function arrangeIndividuals(
  active: string[],
  courts: number,
  perSide: number,
  history: History,
  rand: () => number,
): BracketMatch[] {
  const perCourt = perSide * 2;
  let best: BracketMatch[] | null = null;
  let bestCost = Infinity;

  for (let t = 0; t < TRIES; t++) {
    const order = t === 0 ? active : shuffle(active, rand);
    const matches: BracketMatch[] = [];
    let cost = 0;
    for (let c = 0; c < courts; c++) {
      const group = order.slice(c * perCourt, (c + 1) * perCourt);
      // untuk ganda coba tiga cara membagi empat orang, tunggal hanya satu
      const splits =
        perSide === 2
          ? [
              [[0, 1], [2, 3]],
              [[0, 2], [1, 3]],
              [[0, 3], [1, 2]],
            ]
          : [[Array.from({ length: perSide }, (_, i) => i), Array.from({ length: perSide }, (_, i) => perSide + i)]];
      let bestSplit: { home: string[]; away: string[] } | null = null;
      let bestSplitCost = Infinity;
      for (const [h, a] of splits as number[][][]) {
        const home = h!.map((i) => group[i]!);
        const away = a!.map((i) => group[i]!);
        const sc = history.matchCost(home, away);
        if (sc < bestSplitCost) {
          bestSplitCost = sc;
          bestSplit = { home, away };
        }
      }
      cost += bestSplitCost;
      matches.push({ court: c + 1, home: bestSplit!.home, away: bestSplit!.away });
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = matches;
      if (cost === 0) break;
    }
  }
  return best!;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------- generator ----------

export function generateBracket(input: BracketInput): BracketRound[] {
  const {
    sport,
    mode,
    playerIds,
    courtCount,
    totalMinutes,
    matchMinutes,
    breakMinutes,
    seed = 1,
  } = input;

  if (new Set(playerIds).size !== playerIds.length) {
    throw new BracketError("INVALID_INPUT", "playerIds berisi duplikat");
  }
  if (!Number.isInteger(courtCount) || courtCount < 1) {
    throw new BracketError("INVALID_INPUT", "courtCount harus >= 1");
  }
  if (matchMinutes <= 0 || breakMinutes < 0 || totalMinutes <= 0) {
    throw new BracketError("INVALID_INPUT", "durasi tidak valid");
  }

  const perCourt = playersPerCourt(sport, mode, input.playersPerSide);
  const perSide = perCourt / 2;
  const rounds = roundCount(totalMinutes, matchMinutes, breakMinutes);
  if (rounds < 1) throw new BracketError("NO_ROUNDS", "Durasi tidak cukup untuk satu ronde");

  const n = playerIds.length;
  const courtsUsed = Math.min(courtCount, Math.floor(n / perCourt));
  if (courtsUsed < 1) {
    throw new BracketError("NOT_ENOUGH_PLAYERS", `Butuh minimal ${perCourt} pemain`);
  }

  const rand = mulberry32(seed);
  const history = new History();
  const plays = new Map(playerIds.map((id) => [id, 0]));
  const lastPlayed = new Map(playerIds.map((id) => [id, 0]));
  const result: BracketRound[] = [];

  // Tim tetap: olahraga tim, semua pemain terbagi habis jadi tim, dan tim lebih banyak
  // daripada yang bisa main sekaligus. Selain itu tim dibentuk ulang tiap ronde.
  const numTeams = mode === "team" ? Math.floor(n / perSide) : 0;
  const fixedTeams = mode === "team" && n % perSide === 0 && numTeams > courtsUsed * 2;

  if (fixedTeams) {
    const teams = chunk(playerIds, perSide);
    const teamIds = teams.map((_, i) => `T${i}`);
    const teamPlays = new Map(teamIds.map((id) => [id, 0]));
    const teamLast = new Map(teamIds.map((id) => [id, 0]));
    const matchups = new Map<string, number>();

    for (let r = 1; r <= rounds; r++) {
      const { active, resting } = pickPlayers(teamIds, teamPlays, teamLast, courtsUsed * 2);
      // pasangkan tim aktif dengan lawan yang paling jarang dihadapi
      let best: string[][] = [];
      let bestCost = Infinity;
      for (let t = 0; t < TRIES; t++) {
        const order = t === 0 ? active : shuffle(active, rand);
        const pairs = chunk(order, 2);
        const cost = pairs.reduce((s, [a, b]) => s + (matchups.get(key(a!, b!)) ?? 0), 0);
        if (cost < bestCost) {
          bestCost = cost;
          best = pairs;
          if (cost === 0) break;
        }
      }
      const matches: BracketMatch[] = best.map(([a, b], i) => {
        matchups.set(key(a!, b!), (matchups.get(key(a!, b!)) ?? 0) + 1);
        return { court: i + 1, home: teams[Number(a!.slice(1))]!, away: teams[Number(b!.slice(1))]! };
      });
      for (const id of active) {
        teamPlays.set(id, teamPlays.get(id)! + 1);
        teamLast.set(id, r);
      }
      result.push({
        round: r,
        matches,
        resting: resting.flatMap((id) => teams[Number(id.slice(1))]!),
      });
    }
    return result;
  }

  for (let r = 1; r <= rounds; r++) {
    const { active, resting } = pickPlayers(playerIds, plays, lastPlayed, courtsUsed * perCourt);
    const matches = arrangeIndividuals(active, courtsUsed, perSide, history, rand);
    for (const m of matches) history.recordMatch(m.home, m.away);
    for (const id of active) {
      plays.set(id, plays.get(id)! + 1);
      lastPlayed.set(id, r);
    }
    result.push({ round: r, matches, resting });
  }
  return result;
}
