import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CALIBRATION_LAYOUTS, CALIBRATION_SPORTS, calibrationSchema, LAYOUTS_BY_SPORT } from "./schema";

const contract = JSON.parse(
  readFileSync(join(__dirname, "../../../../contracts/calibration.schema.json"), "utf8"),
);

const camera = {
  frame: { width: 1920, height: 1080 },
  court_corners: [
    { x: 100, y: 1000 },
    { x: 1800, y: 1000 },
    { x: 1500, y: 300 },
    { x: 400, y: 300 },
  ],
  targets: [{ kind: "hoop", points: [{ x: 940, y: 200 }, { x: 980, y: 200 }] }],
  marked_at: "2026-11-12T08:00:00+07:00",
};
const valid = { version: 1, sport: "basketball", layout: "full_court", cameras: { home: camera } };

describe("calibrationSchema", () => {
  it("menerima kalibrasi lengkap", () => {
    expect(calibrationSchema.safeParse(valid).success).toBe(true);
  });

  it("menolak sudut lapangan yang kurang dari 4", () => {
    const bad = { ...valid, cameras: { home: { ...camera, court_corners: camera.court_corners.slice(0, 3) } } };
    expect(calibrationSchema.safeParse(bad).success).toBe(false);
  });

  it("menolak gawang yang titiknya kurang", () => {
    const goal = { kind: "goal", points: camera.court_corners.slice(0, 3) };
    const bad = { ...valid, sport: "futsal", layout: "standard", cameras: { home: { ...camera, targets: [goal] } } };
    expect(calibrationSchema.safeParse(bad).success).toBe(false);
  });

  it("menolak titik di luar frame acuan", () => {
    const bad = { ...valid, cameras: { home: { ...camera, frame: { width: 1280, height: 720 } } } };
    expect(calibrationSchema.safeParse(bad).success).toBe(false);
  });

  it("menolak tanpa kamera dan layout yang tidak cocok dengan cabang", () => {
    expect(calibrationSchema.safeParse({ ...valid, cameras: {} }).success).toBe(false);
    expect(calibrationSchema.safeParse({ ...valid, layout: "doubles" }).success).toBe(false);
  });
});

describe("cocok dengan contracts/calibration.schema.json", () => {
  it("daftar cabang dan layout sama", () => {
    expect([...CALIBRATION_SPORTS].sort()).toEqual([...contract.properties.sport.enum].sort());
    expect([...CALIBRATION_LAYOUTS].sort()).toEqual([...contract.properties.layout.enum].sort());
  });

  it("aturan layout per cabang sama", () => {
    for (const rule of contract.allOf) {
      const cond = rule.if.properties.sport;
      const sports: string[] = cond.const ? [cond.const] : cond.enum;
      const then = rule.then.properties.layout;
      const layouts: string[] = then.const ? [then.const] : then.enum;
      for (const s of sports) {
        expect([...LAYOUTS_BY_SPORT[s as keyof typeof LAYOUTS_BY_SPORT]].sort()).toEqual([...layouts].sort());
      }
    }
  });

  it("jenis target dan jumlah titiknya sama", () => {
    const fromContract = Object.fromEntries(
      contract.$defs.target.oneOf.map((b: { properties: { kind: { const: string }; points: { minItems: number } } }) => [
        b.properties.kind.const,
        b.properties.points.minItems,
      ]),
    );
    expect(fromContract).toEqual({ hoop: 2, goal: 4 });
  });
});
