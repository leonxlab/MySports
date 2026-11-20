import { describe, expect, it } from "vitest";
import { evaluateAccess } from "../src/core/roles";

describe("evaluateAccess", () => {
  it("endpoint login: semua yang login boleh, tidak diaudit", () => {
    expect(evaluateAccess(["user"], ["user"])).toEqual({ allowed: true, audit: false });
    expect(evaluateAccess(["user"], [])).toEqual({ allowed: true, audit: false });
  });

  it("endpoint coach: user biasa ditolak", () => {
    expect(evaluateAccess(["user"], ["coach"])).toEqual({ allowed: false, audit: false });
  });

  it("endpoint coach: coach boleh, tidak diaudit", () => {
    expect(evaluateAccess(["user", "coach"], ["coach"])).toEqual({ allowed: true, audit: false });
  });

  it("endpoint coach: admin lolos lewat bypass dan diaudit", () => {
    expect(evaluateAccess(["user", "admin"], ["coach"])).toEqual({ allowed: true, audit: true });
  });

  it("endpoint khusus admin: admin boleh dan diaudit, user biasa ditolak", () => {
    expect(evaluateAccess(["user", "admin"], ["admin"])).toEqual({ allowed: true, audit: true });
    expect(evaluateAccess(["user"], ["admin"])).toEqual({ allowed: false, audit: false });
  });

  it("admin memakai endpoint login biasa: tidak diaudit", () => {
    expect(evaluateAccess(["user", "admin"], ["user"])).toEqual({ allowed: true, audit: false });
  });
});
