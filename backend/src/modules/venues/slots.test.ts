import { describe, expect, it } from "vitest";
import { findOverlap, overlaps, slotsCovering, type SlotLike } from "./slots";

const slot = (id: string, h1: number, h2: number, status: SlotLike["status"] = "free"): SlotLike => ({
  id,
  startsAt: `2026-11-10T${String(h1).padStart(2, "0")}:00:00Z`,
  endsAt: `2026-11-10T${String(h2).padStart(2, "0")}:00:00Z`,
  status,
});
const at = (h: number) => `2026-11-10T${String(h).padStart(2, "0")}:00:00Z`;

describe("slotsCovering", () => {
  const slots = [slot("a", 8, 9), slot("b", 9, 10), slot("c", 10, 11), slot("d", 12, 13)];

  it("menutup rentang dengan beberapa slot berurutan", () => {
    expect(slotsCovering(slots, at(8), at(11))?.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
  it("satu slot saja", () => {
    expect(slotsCovering(slots, at(9), at(10))?.map((s) => s.id)).toEqual(["b"]);
  });
  it("null bila ada celah", () => {
    expect(slotsCovering(slots, at(10), at(13))).toBeNull();
  });
  it("null bila ada slot yang tidak free", () => {
    expect(slotsCovering([slot("a", 8, 9), slot("b", 9, 10, "booked")], at(8), at(10))).toBeNull();
    expect(slotsCovering([slot("a", 8, 9, "blocked")], at(8), at(9))).toBeNull();
  });
  it("null bila batas tidak pas dengan slot", () => {
    expect(slotsCovering(slots, at(8), at(10.5 as number))).toBeNull();
    expect(slotsCovering(slots, at(7), at(9))).toBeNull();
  });
  it("null bila rentang terbalik atau kosong", () => {
    expect(slotsCovering(slots, at(10), at(9))).toBeNull();
    expect(slotsCovering([], at(8), at(9))).toBeNull();
  });
});

describe("overlaps dan findOverlap", () => {
  it("batas yang bersentuhan tidak dianggap tumpang tindih", () => {
    expect(overlaps(at(8), at(9), at(9), at(10))).toBe(false);
    expect(overlaps(at(8), at(10), at(9), at(11))).toBe(true);
  });
  it("menemukan pasangan yang bertabrakan", () => {
    expect(findOverlap([slot("a", 8, 9), slot("b", 9, 10)])).toBeNull();
    expect(findOverlap([slot("a", 8, 10), slot("b", 9, 11)])).not.toBeNull();
  });
  it("rentang tidak valid dianggap bermasalah", () => {
    expect(findOverlap([slot("a", 10, 9)])).not.toBeNull();
  });
});
