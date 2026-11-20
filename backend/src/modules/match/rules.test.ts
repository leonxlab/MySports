import { describe, expect, it } from "vitest";
import {
  applyAction,
  DEFAULT_SETTINGS,
  elapsedAt,
  initialRuntime,
  MatchRuleError,
  mergeSettings,
  type MatchState,
} from "./rules";

const t = (s: number) => new Date(Date.UTC(2026, 10, 10, 8, 0, s));
const fresh = (): MatchState => ({
  status: "scheduled",
  elapsedSeconds: 0,
  startedAt: null,
  finishedAt: null,
  runtime: initialRuntime(),
});
const settings = DEFAULT_SETTINGS.basketball; // timeout 2, hydration 1

describe("timer", () => {
  it("menghitung dari waktu mulai server, berhenti saat pause, lanjut saat resume", () => {
    let s = applyAction(fresh(), "start", settings, t(0));
    expect(elapsedAt(s, t(30))).toBe(30);

    s = applyAction(s, "pause", settings, t(30));
    expect(s.status).toBe("paused");
    expect(elapsedAt(s, t(500))).toBe(30); // tidak bertambah saat pause

    s = applyAction(s, "resume", settings, t(100));
    expect(elapsedAt(s, t(160))).toBe(90); // 30 + 60
  });

  it("selesai membekukan waktu", () => {
    let s = applyAction(fresh(), "start", settings, t(0));
    s = applyAction(s, "finish", settings, t(45));
    expect(s.status).toBe("finished");
    expect(s.elapsedSeconds).toBe(45);
    expect(s.finishedAt).not.toBeNull();
    expect(elapsedAt(s, t(999))).toBe(45);
  });

  it("jam server mundur tidak menghasilkan waktu negatif", () => {
    const s = applyAction(fresh(), "start", settings, t(100));
    expect(elapsedAt(s, t(50))).toBe(0);
  });
});

describe("state machine", () => {
  it("transisi sah", () => {
    let s = applyAction(fresh(), "start", settings, t(0));
    s = applyAction(s, "pause", settings, t(1));
    s = applyAction(s, "resume", settings, t(2));
    s = applyAction(s, "finish", settings, t(3));
    expect(s.status).toBe("finished");
  });

  it.each([
    ["scheduled", "pause"],
    ["scheduled", "resume"],
    ["scheduled", "finish"],
    ["running", "start"],
    ["running", "resume"],
    ["paused", "pause"],
    ["paused", "timeout"],
    ["finished", "start"],
    ["finished", "cancel"],
    ["cancelled", "resume"],
  ] as const)("%s tidak bisa %s", (status, action) => {
    const s = { ...fresh(), status };
    expect(() => applyAction(s, action, settings, t(0))).toThrow(MatchRuleError);
  });

  it("tidak mengubah state lama (immutable)", () => {
    const s = fresh();
    applyAction(s, "start", settings, t(0));
    expect(s.status).toBe("scheduled");
    expect(s.runtime.resumedAt).toBeNull();
  });
});

describe("time out dan hydration break", () => {
  const running = () => applyAction(fresh(), "start", settings, t(0));

  it("memakai jatah dan menjeda match", () => {
    const s = applyAction(running(), "timeout", settings, t(10));
    expect(s).toMatchObject({ status: "paused" });
    expect(s.runtime).toMatchObject({ timeoutsUsed: 1, pauseReason: "timeout" });
    expect(s.elapsedSeconds).toBe(10);
  });

  it("jatah time out habis ditolak", () => {
    let s = running();
    for (let i = 0; i < settings.timeout.count; i++) {
      s = applyAction(applyAction(s, "timeout", settings, t(10 + i)), "resume", settings, t(20 + i));
    }
    expect(() => applyAction(s, "timeout", settings, t(99))).toThrow(/Jatah time out/);
  });

  it("jatah hydration habis ditolak", () => {
    let s = applyAction(running(), "hydration", settings, t(5));
    s = applyAction(s, "resume", settings, t(6));
    expect(() => applyAction(s, "hydration", settings, t(7))).toThrow(/hydration/);
  });

  it("cabang tanpa time out menolak langsung", () => {
    const s = applyAction(fresh(), "start", DEFAULT_SETTINGS.badminton, t(0));
    expect(() => applyAction(s, "timeout", DEFAULT_SETTINGS.badminton, t(1))).toThrow(MatchRuleError);
  });
});

describe("mergeSettings", () => {
  it("memakai nilai bawaan cabang bila tidak ada penimpa", () => {
    expect(mergeSettings("futsal")).toEqual(DEFAULT_SETTINGS.futsal);
  });
  it("penimpa sebagian digabung, bukan mengganti seluruh blok", () => {
    const m = mergeSettings("basketball", { durationMinutes: 30, timeout: { count: 5, seconds: 45 } });
    expect(m.durationMinutes).toBe(30);
    expect(m.timeout).toEqual({ count: 5, seconds: 45 });
    expect(m.hydration).toEqual(DEFAULT_SETTINGS.basketball.hydration);
    expect(m.playersPerSide).toBe(5);
  });
  it("setiap cabang punya nilai bawaan", () => {
    for (const sport of ["basketball", "badminton", "tennis", "padel", "futsal"] as const) {
      expect(DEFAULT_SETTINGS[sport].durationMinutes).toBeGreaterThan(0);
    }
  });
});
