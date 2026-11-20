import { describe, expect, it } from "vitest";
import { validateCorrection } from "./correction";

const ctx = {
  participants: ["a", "b", "c", "d", "e", "f"],
  otherPlayersInRound: ["e", "f"],
  perSide: 2,
};

describe("validateCorrection", () => {
  it("koreksi sah tidak punya masalah", () => {
    expect(validateCorrection(["a", "b"], ["c", "d"], ctx)).toEqual([]);
  });
  it("pemain tidak dikenal ditolak", () => {
    expect(validateCorrection(["a", "x"], ["c", "d"], ctx)).toContain("UNKNOWN_PLAYER");
  });
  it("pemain ganda dalam satu match ditolak", () => {
    expect(validateCorrection(["a", "a"], ["c", "d"], ctx)).toContain("DUPLICATE_PLAYER");
    expect(validateCorrection(["a", "b"], ["b", "d"], ctx)).toContain("DUPLICATE_PLAYER");
  });
  it("pemain yang sudah main di match lain pada ronde sama ditolak", () => {
    expect(validateCorrection(["a", "b"], ["c", "e"], ctx)).toContain("PLAYER_IN_OTHER_MATCH");
  });
  it("ukuran sisi harus sama dengan aslinya", () => {
    expect(validateCorrection(["a"], ["c", "d"], ctx)).toContain("WRONG_SIDE_SIZE");
  });
});

import { swapPlayers, SwapError } from "./correction";

describe("swapPlayers", () => {
  const round = {
    matches: [
      { id: "m1", home: ["a", "b"], away: ["c", "d"] },
      { id: "m2", home: ["e", "f"], away: ["g", "h"] },
    ],
    resting: ["i"],
  };

  it("menukar pemain antar match", () => {
    const r = swapPlayers(round, "a", "e");
    expect(r.matches[0]).toEqual({ id: "m1", home: ["e", "b"], away: ["c", "d"] });
    expect(r.matches[1]).toEqual({ id: "m2", home: ["a", "f"], away: ["g", "h"] });
  });
  it("menukar pemain di dalam satu match", () => {
    expect(swapPlayers(round, "a", "c").matches[0]).toEqual({ id: "m1", home: ["c", "b"], away: ["a", "d"] });
  });
  it("menukar pemain main dengan yang istirahat", () => {
    const r = swapPlayers(round, "a", "i");
    expect(r.matches[0]!.home).toEqual(["i", "b"]);
    expect(r.resting).toEqual(["a"]);
  });
  it("tidak mengubah ronde asli dan menjaga jumlah pemain", () => {
    const r = swapPlayers(round, "b", "h");
    expect(round.matches[0]!.home).toEqual(["a", "b"]);
    const all = [...r.matches.flatMap((m) => [...m.home, ...m.away]), ...r.resting].sort();
    expect(all).toEqual(["a", "b", "c", "d", "e", "f", "g", "h", "i"]);
  });
  it("menolak pemain sama atau tidak ada di ronde", () => {
    expect(() => swapPlayers(round, "a", "a")).toThrow(SwapError);
    expect(() => swapPlayers(round, "a", "zzz")).toThrow(SwapError);
  });
});
