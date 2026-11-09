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
