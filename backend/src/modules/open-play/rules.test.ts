import { describe, expect, it } from "vitest";
import { canChangeStatus, coveringBooking, quotaAllowed, timesOverlap } from "./rules";

const at = (h: number) => `2026-11-10T${String(h).padStart(2, "0")}:00:00Z`;

describe("coveringBooking", () => {
  const bookings = [
    { id: "a", startsAt: at(8), endsAt: at(10) },
    { id: "b", startsAt: at(12), endsAt: at(14) },
  ];
  it("menemukan booking yang menutup seluruh jam", () => {
    expect(coveringBooking(bookings, at(8), at(10))?.id).toBe("a");
    expect(coveringBooking(bookings, at(9), at(10))?.id).toBe("a");
  });
  it("null bila keluar dari booking atau melintasi dua booking", () => {
    expect(coveringBooking(bookings, at(9), at(11))).toBeNull();
    expect(coveringBooking(bookings, at(7), at(9))).toBeNull();
    expect(coveringBooking(bookings, at(9), at(13))).toBeNull();
    expect(coveringBooking([], at(8), at(9))).toBeNull();
  });
});

describe("canChangeStatus", () => {
  it("transisi yang sah", () => {
    expect(canChangeStatus("open", "closed")).toBe(true);
    expect(canChangeStatus("closed", "open")).toBe(true);
    expect(canChangeStatus("full", "finished")).toBe(true);
    expect(canChangeStatus("open", "cancelled")).toBe(true);
  });
  it("status akhir tidak bisa diubah", () => {
    expect(canChangeStatus("finished", "open")).toBe(false);
    expect(canChangeStatus("cancelled", "open")).toBe(false);
  });
  it("full tidak bisa diset manual", () => {
    expect(canChangeStatus("open", "full")).toBe(false);
  });
});

describe("quotaAllowed", () => {
  it("tidak boleh di bawah peserta aktif", () => {
    expect(quotaAllowed(10, 10)).toBe(true);
    expect(quotaAllowed(9, 10)).toBe(false);
    expect(quotaAllowed(0, 0)).toBe(false);
    expect(quotaAllowed(2.5, 1)).toBe(false);
  });
});

describe("timesOverlap", () => {
  it("batas sentuh tidak bertabrakan", () => {
    expect(timesOverlap(at(8), at(10), at(10), at(12))).toBe(false);
    expect(timesOverlap(at(8), at(11), at(10), at(12))).toBe(true);
  });
});
