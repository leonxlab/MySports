import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  IllegalTransitionError,
  isFinal,
  type PaymentStatus,
} from "./state";

const all: PaymentStatus[] = ["pending", "paid", "failed", "refunded", "settled"];
const legal: [PaymentStatus, PaymentStatus][] = [
  ["pending", "paid"],
  ["pending", "failed"],
  ["paid", "settled"],
  ["paid", "refunded"],
];

describe("state machine pembayaran", () => {
  it.each(legal)("%s -> %s sah", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it("semua transisi selain yang sah ditolak", () => {
    for (const from of all) {
      for (const to of all) {
        const isLegal = legal.some(([f, t]) => f === from && t === to);
        expect(canTransition(from, to)).toBe(isLegal);
      }
    }
  });

  it("melempar IllegalTransitionError untuk transisi ilegal", () => {
    expect(() => assertTransition("settled", "paid")).toThrow(IllegalTransitionError);
    expect(() => assertTransition("pending", "settled")).toThrow(IllegalTransitionError);
    expect(() => assertTransition("failed", "paid")).toThrow(IllegalTransitionError);
  });

  it("status akhir tidak punya transisi keluar", () => {
    expect(isFinal("settled")).toBe(true);
    expect(isFinal("failed")).toBe(true);
    expect(isFinal("refunded")).toBe(true);
    expect(isFinal("pending")).toBe(false);
    expect(isFinal("paid")).toBe(false);
  });
});
