import { describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../core/context";
import { AppError } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createFakeSupabase } from "../../../tests/fakeSupabase";
import { createScoringService, teamFromSuggestion, type SuggestedEvent } from "./service";

const coach: AuthUser = { id: "coach", roles: ["user", "coach"] };
const otherCoach: AuthUser = { id: "other", roles: ["user", "coach"] };

const MATCH = "11111111-1111-4111-8111-111111111111";

function setup(sport: string, rules: Record<string, unknown> = {}) {
  const fake = createFakeSupabase(
    { score_events: [], fouls: [], player_match_stats: [], matches: [{ id: MATCH, sport }] },
    {},
    { score_events: { detail: {}, scorer_id: null, event_key: null, occurred_at_ms: null } },
  );
  const publish = vi.fn();
  const ctx = { supabase: fake.db, realtime: { publish, subscribe: vi.fn() } } as unknown as AppContext;
  const match = {
    getMatchSettings: vi.fn(async (id: string) => {
      if (id !== MATCH) throw new AppError(404, "MATCH_NOT_FOUND", "x");
      return { id, sport, bracketMatchId: "bm1", createdBy: "coach", status: "running", settings: { rules } } as never;
    }),
  };
  const bracket = {
    getBracketMatch: vi.fn(async () => ({ home: ["p-home"], away: ["p-away"] }) as never),
  };
  const accounts = {
    getProfileSummaries: vi.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, display_name: `Nama ${id}`, photo_path: null, level: 0 })),
    ),
  };
  const svc = createScoringService(ctx, { match, bracket, accounts });
  return { svc, fake, publish };
}

const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: AppError) => e.code ?? e.message,
  );

const aiEvent = (id: string, type: string, payload: Record<string, unknown>): SuggestedEvent => ({
  event_id: id,
  match_id: MATCH,
  camera: "home",
  sport: "basketball",
  timestamp_ms: 1000,
  confidence: 0.9,
  type,
  payload,
});

describe("input manual", () => {
  it("basket: 2 dan 3 poin menambah tim yang benar", async () => {
    const { svc, publish } = setup("basketball");
    await svc.addScoreEvent(coach, MATCH, { kind: "basket_made", team: "home", points: 2, scorerId: "p-home" });
    const board = await svc.addScoreEvent(coach, MATCH, { kind: "basket_made", team: "away", points: 3 });
    expect([board.score.home, board.score.away]).toEqual([2, 3]);
    expect(publish).toHaveBeenCalledWith(`match:${MATCH}`, expect.objectContaining({ type: "score" }));
  });

  it("hanya Coach pembuat match yang boleh menulis", async () => {
    const { svc } = setup("futsal");
    expect(await code(svc.addScoreEvent(otherCoach, MATCH, { kind: "goal", team: "home" }))).toBe("FORBIDDEN");
  });

  it("kejadian yang tidak berlaku dan pencetak di luar tim ditolak", async () => {
    const { svc } = setup("futsal");
    expect(await code(svc.addScoreEvent(coach, MATCH, { kind: "point", team: "home" }))).toBe("EVENT_NOT_ALLOWED");
    expect(await code(svc.addScoreEvent(coach, MATCH, { kind: "goal", team: "home", scorerId: "p-away" }))).toBe(
      "SCORER_NOT_IN_TEAM",
    );
  });

  it("setting Coach menimpa bawaan: skor final menolak kejadian tambahan", async () => {
    const { svc } = setup("futsal", { targetGoals: 1 });
    const board = await svc.addScoreEvent(coach, MATCH, { kind: "goal", team: "home" });
    expect(board.finished).toBe(true);
    expect(await code(svc.addScoreEvent(coach, MATCH, { kind: "goal", team: "away" }))).toBe("MATCH_FINISHED");
  });
});

describe("usulan AI", () => {
  it("idempoten: event_id sama dua kali tidak menambah usulan atau skor", async () => {
    const { svc, fake } = setup("basketball");
    const ev = aiEvent("e1", "basket_made", {});
    expect(await svc.ingestSuggestedEvents([ev])).toEqual([
      { eventId: "e1", status: "stored", scoreEventId: expect.any(String) },
    ]);
    expect(await svc.ingestSuggestedEvents([ev])).toEqual([{ eventId: "e1", status: "duplicate" }]);
    expect(fake.tables.score_events).toHaveLength(1);
    const board = await svc.getScoreboard(MATCH);
    expect([board.score.home, board.score.away]).toEqual([0, 0]);
    expect(board.suggestions).toHaveLength(1);
  });

  it("event tanpa match, bukan skor, atau tidak berlaku untuk cabang dilewati", async () => {
    const { svc } = setup("basketball");
    const results = await svc.ingestSuggestedEvents([
      { ...aiEvent("a", "basket_made", {}), match_id: null },
      aiEvent("b", "play_activity", { active_seconds: 30, players_detected: 4 }),
      aiEvent("c", "goal", {}),
      { ...aiEvent("d", "goal", {}), match_id: "22222222-2222-4222-8222-222222222222" },
    ]);
    expect(results.map((r) => (r.status === "skipped" ? r.reason : r.status))).toEqual([
      "NO_MATCH",
      "NOT_SCORING",
      "KIND_NOT_ALLOWED",
      "MATCH_NOT_FOUND",
    ]);
  });

  it("konfirmasi basket wajib memilih 2/3 dan tim, lalu dihitung", async () => {
    const { svc, fake } = setup("basketball");
    await svc.ingestSuggestedEvents([aiEvent("e1", "basket_made", { team_color: "blue" })]);
    const id = fake.tables.score_events![0]!.id as string;

    expect(await code(svc.reviewScoreEvent(coach, id, { action: "confirm", points: 3 }))).toBe("TEAM_REQUIRED");
    expect(await code(svc.reviewScoreEvent(coach, id, { action: "confirm", team: "home" }))).toBe("POINTS_REQUIRED");
    const board = await svc.reviewScoreEvent(coach, id, { action: "confirm", team: "home", points: 3 });
    expect([board.score.home, board.score.away]).toEqual([3, 0]);
    expect(board.suggestions).toHaveLength(0);
    expect(fake.tables.score_events![0]).toMatchObject({ status: "confirmed", points: 3, team: "home" });
  });

  it("warna baju dari setting dipakai sebagai tim usulan", async () => {
    const { svc, fake } = setup("basketball", { teamColors: { home: "Blue", away: "red" } });
    await svc.ingestSuggestedEvents([aiEvent("e1", "basket_made", { team_color: "blue" })]);
    expect(fake.tables.score_events![0]!.team).toBe("home");
  });

  it("koreksi dan pembatalan mengubah skor", async () => {
    const { svc, fake } = setup("futsal");
    await svc.addScoreEvent(coach, MATCH, { kind: "goal", team: "home" });
    await svc.addScoreEvent(coach, MATCH, { kind: "goal", team: "home" });
    const [first, second] = fake.tables.score_events!.map((r) => r.id as string);

    let board = await svc.reviewScoreEvent(coach, first!, { action: "correct", team: "away" });
    expect([board.score.home, board.score.away]).toEqual([1, 1]);
    expect(fake.tables.score_events![0]!.status).toBe("corrected");

    board = await svc.voidScoreEvent(coach, second!);
    expect([board.score.home, board.score.away]).toEqual([0, 1]);
    expect(await code(svc.voidScoreEvent(coach, second!))).toBe("EVENT_VOIDED");
    expect(await code(svc.reviewScoreEvent(coach, first!, { action: "confirm" }))).toBe("EVENT_NOT_SUGGESTED");
  });
});

describe("statistik", () => {
  it("hanya menghitung kejadian confirmed/corrected, koreksi Coach menimpa poin", async () => {
    const { svc } = setup("basketball");
    await svc.addScoreEvent(coach, MATCH, {
      kind: "basket_made",
      team: "home",
      points: 3,
      scorerId: "p-home",
      action: "jump shot",
    });
    await svc.addScoreEvent(coach, MATCH, { kind: "basket_made", team: "home", points: 2, scorerId: "p-home" });
    await svc.ingestSuggestedEvents([aiEvent("e9", "basket_made", {})]);
    await svc.addFoul(coach, MATCH, { playerId: "p-away", kind: "blocking" });

    let stats = await svc.getMatchStats(MATCH);
    expect(stats.players.find((p) => p.userId === "p-home")).toMatchObject({
      points: 5,
      shots: { one: 0, two: 1, three: 1 },
      actions: { "jump shot": 1 },
      displayName: "Nama p-home",
    });
    expect(stats.players.find((p) => p.userId === "p-away")).toMatchObject({ points: 0, fouls: 1 });

    stats = await svc.setPlayerPoints(coach, MATCH, "p-away", { points: 4 });
    expect(stats.players.find((p) => p.userId === "p-away")).toMatchObject({ points: 4, pointsOverridden: true });

    expect(await svc.getUserStats("p-home")).toEqual([
      {
        sport: "basketball",
        matches: 1,
        points: 5,
        shots: { one: 0, two: 1, three: 1 },
        actions: { "jump shot": 1 },
        fouls: 0,
      },
    ]);
  });
});

describe("teamFromSuggestion", () => {
  it("kok jatuh di dalam sisi S memberi poin ke lawan S, di luar memberi poin ke S", () => {
    const landed = (in_bounds: boolean, side?: string) => aiEvent("x", "ball_landed", { in_bounds, side });
    expect(teamFromSuggestion(landed(true, "home"), {})).toBe("away");
    expect(teamFromSuggestion(landed(false, "home"), {})).toBe("home");
    expect(teamFromSuggestion(landed(true), {})).toBeNull();
  });
});
