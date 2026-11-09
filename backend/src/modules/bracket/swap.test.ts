import { describe, expect, it } from "vitest";
import type { AppContext } from "../../core/context";
import type { AuthUser } from "../../core/roles";
import { createFakeSupabase } from "../../../tests/fakeSupabase";
import { createBracketService } from "./service";

const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const coach: AuthUser = { id: "coach", roles: ["user", "coach"] };
const ROUND = "11111111-1111-4111-8111-111111111111";

function setup(matchStatus?: string) {
  const fake = createFakeSupabase({
    open_plays: [{ id: "op1", coach_id: "coach", sport: "badminton", starts_at: "x", ends_at: "y" }],
    brackets: [
      { id: "b1", open_play_id: "op1", sport: "badminton", mode: "doubles", court_count: 2, match_minutes: 15, break_minutes: 0, total_minutes: 60, version: 1 },
    ],
    bracket_rounds: [{ id: ROUND, bracket_id: "b1", round_no: 1 }],
    bracket_matches: [
      { id: "m1", round_id: ROUND, court_no: 1, home_players: [U(1), U(2)], away_players: [U(3), U(4)] },
      { id: "m2", round_id: ROUND, court_no: 2, home_players: [U(5), U(6)], away_players: [U(7), U(8)] },
    ],
    bracket_resting: [{ round_id: ROUND, user_id: U(9) }],
    matches: matchStatus ? [{ id: "x", bracket_match_id: "m2", status: matchStatus }] : [],
  });
  const ctx = { supabase: fake.db } as unknown as AppContext;
  return { svc: createBracketService(ctx), fake };
}

const code = (p: Promise<unknown>) => p.then(() => "ok", (e: { code?: string }) => e.code);

describe("bracket swap", () => {
  it("menukar pemain antar match dan menyimpannya", async () => {
    const { svc, fake } = setup();
    const view = await svc.swap(coach, "b1", { roundId: ROUND, a: U(1), b: U(5) });
    const m = view.rounds[0]!.matches;
    expect(m.find((x) => x.id === "m1")!.home).toEqual([U(5), U(2)]);
    expect(m.find((x) => x.id === "m2")!.home).toEqual([U(1), U(6)]);
    expect(fake.tables.bracket_matches!.find((x) => x.id === "m1")!.home_players).toEqual([U(5), U(2)]);
  });

  it("menukar pemain main dengan yang istirahat memperbarui daftar istirahat", async () => {
    const { svc, fake } = setup();
    const view = await svc.swap(coach, "b1", { roundId: ROUND, a: U(1), b: U(9) });
    expect(view.rounds[0]!.resting).toEqual([U(1)]);
    expect(fake.tables.bracket_resting!.map((r) => r.user_id)).toEqual([U(1)]);
  });

  it("hanya coach pemilik open play", async () => {
    const { svc } = setup();
    expect(await code(svc.swap({ id: "other", roles: ["user", "coach"] }, "b1", { roundId: ROUND, a: U(1), b: U(5) }))).toBe("FORBIDDEN");
  });

  it("menolak bila match yang terpengaruh sudah berjalan", async () => {
    const { svc } = setup("running");
    expect(await code(svc.swap(coach, "b1", { roundId: ROUND, a: U(1), b: U(5) }))).toBe("MATCH_STARTED");
  });

  it("menolak pemain yang tidak ada atau sama", async () => {
    const { svc } = setup();
    expect(await code(svc.swap(coach, "b1", { roundId: ROUND, a: U(1), b: U(1) }))).toBe("BRACKET_SAME_PLAYER");
    expect(await code(svc.swap(coach, "b1", { roundId: ROUND, a: U(1), b: "00000000-0000-4000-8000-0000000000ff" }))).toBe("BRACKET_PLAYER_NOT_IN_ROUND");
  });
});
