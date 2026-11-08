import { describe, expect, it } from "vitest";
import { ingestEventsBody } from "../src/modules/devices/schema";

const base = {
  event_id: "11111111-1111-4111-8111-111111111111",
  session_id: "22222222-2222-4222-8222-222222222222",
  match_id: null,
  segment_id: "33333333-3333-4333-8333-333333333333",
  camera: "home",
  sport: "basketball",
  timestamp_ms: 312000,
  confidence: 0.91,
};

describe("kontrak event deteksi", () => {
  it("menerima basket_made", () => {
    const r = ingestEventsBody.safeParse({
      events: [{ ...base, type: "basket_made", payload: { team_color: "red" } }],
    });
    expect(r.success).toBe(true);
  });

  it("menolak tipe yang tidak dikenal", () => {
    const r = ingestEventsBody.safeParse({ events: [{ ...base, type: "dunk", payload: {} }] });
    expect(r.success).toBe(false);
  });

  it("menolak payload yang tidak cocok dengan tipe", () => {
    const r = ingestEventsBody.safeParse({
      events: [{ ...base, type: "ball_landed", payload: {} }],
    });
    expect(r.success).toBe(false);
  });
});
