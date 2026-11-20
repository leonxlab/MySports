import { describe, expect, it } from "vitest";
import { rulesBySport } from "./index";

describe("aturan skor", () => {
  it("lima cabang terdaftar", () => {
    expect(Object.keys(rulesBySport).sort()).toEqual(
      ["badminton", "basketball", "futsal", "padel", "tennis"],
    );
  });

  it.todo("basket: tembakan 2 dan 3 poin menambah skor tim yang benar");
  it.todo("futsal: gol menambah 1 poin");
  it.todo("badminton: aturan rally dan batas poin dari setting match");
  it.todo("setting match yang diedit Coach menimpa nilai bawaan");
});
