import { describe, expect, it } from "vitest";
import {
  BracketError,
  generateBracket,
  playersPerCourt,
  roundCount,
  type BracketInput,
  type BracketRound,
} from "./algorithm";

const players = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

function input(over: Partial<BracketInput> & Pick<BracketInput, "sport" | "mode">): BracketInput {
  return {
    playerIds: players(8),
    courtCount: 1,
    totalMinutes: 100,
    matchMinutes: 20,
    breakMinutes: 5, // 4 ronde
    ...over,
  };
}

function playCounts(rounds: BracketRound[], ids: string[]) {
  const counts = new Map(ids.map((id) => [id, 0]));
  for (const r of rounds) {
    for (const m of r.matches) for (const id of [...m.home, ...m.away]) counts.set(id, counts.get(id)! + 1);
  }
  return counts;
}

function expectValid(rounds: BracketRound[], ids: string[]) {
  for (const r of rounds) {
    const seen = [...r.matches.flatMap((m) => [...m.home, ...m.away]), ...r.resting];
    // setiap pemain tepat satu kali per ronde (main atau istirahat)
    expect([...seen].sort()).toEqual([...ids].sort());
  }
  const counts = [...playCounts(rounds, ids).values()];
  expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
}

describe("jumlah ronde", () => {
  it("durasi total dibagi (match + jeda), dibulatkan ke bawah", () => {
    expect(roundCount(90, 20, 5)).toBe(3);
    expect(roundCount(100, 20, 5)).toBe(4);
  });
});

describe("playersPerCourt", () => {
  it("racket: tunggal 2, ganda 4", () => {
    for (const sport of ["badminton", "tennis", "padel"] as const) {
      expect(playersPerCourt(sport, "singles")).toBe(2);
      expect(playersPerCourt(sport, "doubles")).toBe(4);
    }
  });
  it("tim: dua kali pemain per sisi", () => {
    expect(playersPerCourt("basketball", "team")).toBe(10);
    expect(playersPerCourt("basketball", "team", 3)).toBe(6);
    expect(playersPerCourt("futsal", "team")).toBe(10);
  });
  it("menolak mode yang tidak cocok dengan cabang", () => {
    expect(() => playersPerCourt("badminton", "team")).toThrow(BracketError);
    expect(() => playersPerCourt("basketball", "doubles")).toThrow(BracketError);
  });
});

// Kasus dari tabel "Contoh per cabang dan mode" di docs/proposal.md.
describe("generateBracket: contoh dari proposal", () => {
  it("badminton ganda, 3 lapangan, 16 pemain: 12 main + 4 istirahat, tiap pemain main 3x dalam 4 ronde", () => {
    const ids = players(16);
    const rounds = generateBracket(input({ sport: "badminton", mode: "doubles", playerIds: ids, courtCount: 3 }));
    expect(rounds).toHaveLength(4);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(3);
      expect(r.resting).toHaveLength(4);
    }
    for (const c of playCounts(rounds, ids).values()) expect(c).toBe(3);
    expectValid(rounds, ids);
    // istirahat ronde 1-4 sama seperti tabel proposal
    expect(rounds[0]!.resting).toEqual(["P13", "P14", "P15", "P16"]);
    expect(rounds[1]!.resting).toEqual(["P9", "P10", "P11", "P12"]);
    expect(rounds[2]!.resting).toEqual(["P5", "P6", "P7", "P8"]);
    expect(rounds[3]!.resting).toEqual(["P1", "P2", "P3", "P4"]);
  });

  it("badminton ganda 16 pemain: pasangan tidak berulang dalam satu siklus", () => {
    const rounds = generateBracket(input({ sport: "badminton", mode: "doubles", playerIds: players(16), courtCount: 3 }));
    const seen = new Set<string>();
    for (const r of rounds) {
      for (const m of r.matches) {
        for (const side of [m.home, m.away]) {
          const k = [...side].sort().join("|");
          expect(seen.has(k)).toBe(false);
          seen.add(k);
        }
      }
    }
  });

  it("badminton tunggal, 2 lapangan, 6 pemain: 4 main + 2 istirahat, tiap pemain main 2x dalam 3 ronde", () => {
    const ids = players(6);
    const rounds = generateBracket(
      input({ sport: "badminton", mode: "singles", playerIds: ids, courtCount: 2, totalMinutes: 75 }),
    );
    expect(rounds).toHaveLength(3);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
      expect(r.resting).toHaveLength(2);
    }
    for (const c of playCounts(rounds, ids).values()) expect(c).toBe(2);
    expectValid(rounds, ids);
  });

  it("tennis tunggal, 3 lapangan, 8 pemain: 6 main + 2 istirahat, 4 ronde, tiap pemain main 3x", () => {
    const ids = players(8);
    const rounds = generateBracket(input({ sport: "tennis", mode: "singles", playerIds: ids, courtCount: 3 }));
    expect(rounds).toHaveLength(4);
    for (const r of rounds) expect(r.resting).toHaveLength(2);
    for (const c of playCounts(rounds, ids).values()) expect(c).toBe(3);
    expectValid(rounds, ids);
  });

  it("tennis ganda, 1 lapangan, 6 pemain: 4 main + 2 istirahat, 3 ronde, tiap pemain main 2x", () => {
    const ids = players(6);
    const rounds = generateBracket(
      input({ sport: "tennis", mode: "doubles", playerIds: ids, courtCount: 1, totalMinutes: 75 }),
    );
    expect(rounds).toHaveLength(3);
    for (const c of playCounts(rounds, ids).values()) expect(c).toBe(2);
    expectValid(rounds, ids);
  });

  it("padel ganda, 2 lapangan, 10 pemain: 8 main + 2 istirahat, 5 ronde, tiap pemain main 4x", () => {
    const ids = players(10);
    const rounds = generateBracket(
      input({ sport: "padel", mode: "doubles", playerIds: ids, courtCount: 2, totalMinutes: 125 }),
    );
    expect(rounds).toHaveLength(5);
    for (const r of rounds) expect(r.resting).toHaveLength(2);
    for (const c of playCounts(rounds, ids).values()) expect(c).toBe(4);
    expectValid(rounds, ids);
  });

  it("padel tunggal, 1 lapangan, 4 pemain: 2 main + 2 istirahat, 2 ronde, tiap pemain main 1x", () => {
    const ids = players(4);
    const rounds = generateBracket(
      input({ sport: "padel", mode: "singles", playerIds: ids, courtCount: 1, totalMinutes: 50 }),
    );
    expect(rounds).toHaveLength(2);
    for (const c of playCounts(rounds, ids).values()) expect(c).toBe(1);
    expectValid(rounds, ids);
  });

  it("basket full court, 15 pemain (3 tim x 5): T1-T2, T1-T3, T2-T3, tiap tim istirahat sekali", () => {
    const ids = players(15);
    const rounds = generateBracket(
      input({ sport: "basketball", mode: "team", playerIds: ids, courtCount: 1, totalMinutes: 75 }),
    );
    expect(rounds).toHaveLength(3);
    const team = (p: string) => Math.floor((Number(p.slice(1)) - 1) / 5) + 1;
    const pairs = rounds.map((r) => {
      const m = r.matches[0]!;
      expect(new Set(m.home.map(team)).size).toBe(1);
      expect(new Set(m.away.map(team)).size).toBe(1);
      return [team(m.home[0]!), team(m.away[0]!)].sort().join("-");
    });
    expect([...pairs].sort()).toEqual(["1-2", "1-3", "2-3"]);
    const restingTeams = rounds.map((r) => team(r.resting[0]!));
    expect(new Set(restingTeams).size).toBe(3);
    expectValid(rounds, ids);
  });

  it("basket tepat 10 pemain: satu lapangan 5 lawan 5, tim diacak ulang tiap ronde", () => {
    const ids = players(10);
    const rounds = generateBracket(
      input({ sport: "basketball", mode: "team", playerIds: ids, courtCount: 1, totalMinutes: 125 }),
    );
    expect(rounds).toHaveLength(5);
    for (const r of rounds) {
      expect(r.resting).toHaveLength(0);
      expect(r.matches[0]!.home).toHaveLength(5);
      expect(r.matches[0]!.away).toHaveLength(5);
    }
    const homes = new Set(rounds.map((r) => [...r.matches[0]!.home].sort().join()));
    expect(homes.size).toBeGreaterThan(1);
    expectValid(rounds, ids);
  });

  it("futsal 25 pemain (5 tim x 5), 2 lapangan: 20 main + 5 istirahat per ronde, tiap pemain main 4x", () => {
    const ids = players(25);
    const rounds = generateBracket(
      input({ sport: "futsal", mode: "team", playerIds: ids, courtCount: 2, totalMinutes: 125 }),
    );
    expect(rounds).toHaveLength(5);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
      expect(r.resting).toHaveLength(5);
    }
    for (const c of playCounts(rounds, ids).values()) expect(c).toBe(4);
    expectValid(rounds, ids);
  });
});

describe("generateBracket: sifat umum", () => {
  it("selisih jumlah main antar pemain paling banyak 1 untuk kombinasi acak", () => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 40; i++) {
      const doubles = rnd() < 0.5;
      const perCourt = doubles ? 4 : 2;
      const courts = 1 + Math.floor(rnd() * 3);
      const n = perCourt + Math.floor(rnd() * 14);
      const rounds = generateBracket(
        input({
          sport: "badminton",
          mode: doubles ? "doubles" : "singles",
          playerIds: players(n),
          courtCount: courts,
          totalMinutes: 25 * (1 + Math.floor(rnd() * 9)),
          seed: i + 1,
        }),
      );
      expectValid(rounds, players(n));
    }
  });

  it("peserta kurang dari kapasitas: hanya lapangan yang bisa terisi dipakai", () => {
    const rounds = generateBracket(
      input({ sport: "badminton", mode: "doubles", playerIds: players(9), courtCount: 3 }),
    );
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
      expect(r.resting).toHaveLength(1);
    }
    expectValid(rounds, players(9));
  });

  it("jumlah ronde bukan kelipatan siklus tetap adil", () => {
    // 16 pemain, 3 lapangan ganda -> siklus 4 ronde; 6 ronde tetap selisih <= 1
    const ids = players(16);
    const rounds = generateBracket(
      input({ sport: "badminton", mode: "doubles", playerIds: ids, courtCount: 3, totalMinutes: 150 }),
    );
    expect(rounds).toHaveLength(6);
    expectValid(rounds, ids);
  });

  it("deterministik untuk seed yang sama", () => {
    const base = input({ sport: "badminton", mode: "doubles", playerIds: players(13), courtCount: 3 });
    expect(generateBracket({ ...base, seed: 3 })).toEqual(generateBracket({ ...base, seed: 3 }));
  });

  it("basket half court dengan 3 pemain per sisi", () => {
    const ids = players(12);
    const rounds = generateBracket(
      input({ sport: "basketball", mode: "team", playerIds: ids, courtCount: 1, playersPerSide: 3 }),
    );
    expect(rounds[0]!.matches[0]!.home).toHaveLength(3);
    expectValid(rounds, ids);
  });

  it("futsal dengan sisa pemain tidak habis dibagi tim tetap adil", () => {
    const ids = players(23);
    const rounds = generateBracket(
      input({ sport: "futsal", mode: "team", playerIds: ids, courtCount: 2, totalMinutes: 125 }),
    );
    expectValid(rounds, ids);
  });

  it("menolak input tidak valid", () => {
    const base = input({ sport: "badminton", mode: "doubles", playerIds: players(3) });
    expect(() => generateBracket(base)).toThrow(/minimal 4/);
    expect(() => generateBracket({ ...base, playerIds: ["a", "a", "b", "c"] })).toThrow(BracketError);
    expect(() => generateBracket({ ...base, playerIds: players(8), courtCount: 0 })).toThrow(BracketError);
    expect(() => generateBracket({ ...base, playerIds: players(8), totalMinutes: 10 })).toThrow(/ronde/);
  });
});
