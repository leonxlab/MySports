import { describe, expect, it } from "vitest";
import { badmintonRules } from "./badminton";
import { basketballRules } from "./basketball";
import { futsalRules } from "./futsal";
import { detailOf, pointLabels } from "./games-and-sets";
import { mergeRuleSettings, replay, rulesBySport, ScoreRuleError, type ScoreEvent, type Team } from "./index";
import { padelRules } from "./padel";
import { tennisRules } from "./tennis";

const pts = (...teams: Team[]): ScoreEvent[] => teams.map((team) => ({ kind: "point", team }));
const many = (team: Team, n: number): Team[] => Array.from({ length: n }, () => team);

describe("aturan skor", () => {
  it("lima cabang terdaftar", () => {
    expect(Object.keys(rulesBySport).sort()).toEqual(["badminton", "basketball", "futsal", "padel", "tennis"]);
  });

  it("basket: tembakan 2 dan 3 poin menambah skor tim yang benar", () => {
    const s = replay(
      basketballRules,
      [
        { kind: "basket_made", team: "home", points: 2 },
        { kind: "basket_made", team: "away", points: 3 },
        { kind: "basket_made", team: "home", points: 3 },
        { kind: "basket_made", team: "home", points: 1 },
      ],
      basketballRules.defaults,
    );
    expect([s.home, s.away]).toEqual([6, 3]);
    expect(s.detail.shots).toEqual({ home: { one: 1, two: 1, three: 1 }, away: { one: 0, two: 0, three: 1 } });
    expect(basketballRules.isFinished(s, basketballRules.defaults)).toBe(false);
  });

  it("futsal: gol menambah 1 poin", () => {
    const goals: ScoreEvent[] = [
      { kind: "goal", team: "away" },
      { kind: "goal", team: "away" },
      { kind: "goal", team: "home" },
    ];
    const s = replay(futsalRules, goals, futsalRules.defaults);
    expect([s.home, s.away]).toEqual([1, 2]);
  });

  it("kejadian yang tidak berlaku untuk cabang ditolak", () => {
    expect(() => replay(futsalRules, pts("home"), futsalRules.defaults)).toThrow(ScoreRuleError);
    expect(() => replay(badmintonRules, [{ kind: "goal", team: "home" }], badmintonRules.defaults)).toThrow(ScoreRuleError);
  });

  it("badminton: rally 21 selisih 2, dua game memenangkan match", () => {
    const s = replay(badmintonRules, pts(...many("home", 21), ...many("home", 21)), badmintonRules.defaults);
    expect(s.detail.games).toEqual([
      { home: 21, away: 0 },
      { home: 21, away: 0 },
    ]);
    expect(badmintonRules.isFinished(s, badmintonRules.defaults)).toBe(true);
  });

  it("badminton: 20-20 butuh selisih 2, batas 30 menang langsung", () => {
    const deuce = pts(...many("home", 20), ...many("away", 20));
    let s = replay(badmintonRules, [...deuce, ...pts("home")], badmintonRules.defaults);
    expect([s.home, s.away]).toEqual([21, 20]);
    s = replay(badmintonRules, [...deuce, ...pts("home", "home")], badmintonRules.defaults);
    expect(s.detail.games).toEqual([{ home: 22, away: 20 }]);

    const alternating = Array.from({ length: 9 }, () => ["home", "away"] as Team[]).flat();
    s = replay(badmintonRules, [...deuce, ...pts(...alternating, "home")], badmintonRules.defaults);
    expect(s.detail.games).toEqual([{ home: 30, away: 29 }]);
  });

  it("setting match yang diedit Coach menimpa nilai bawaan", () => {
    const settings = mergeRuleSettings(badmintonRules.defaults, { pointsPerGame: 15, gamesToWin: 1, unknown: 9, winBy: "2" });
    expect(settings).toEqual({ pointsPerGame: 15, winBy: 2, cap: 30, gamesToWin: 1 });
    const s = replay(badmintonRules, pts(...many("away", 15)), settings);
    expect(badmintonRules.isFinished(s, settings)).toBe(true);
    expect(() => replay(badmintonRules, pts(...many("away", 16)), settings)).toThrow(/sudah final/);

    const basket = mergeRuleSettings(basketballRules.defaults, { targetPoints: 21 });
    const threes: ScoreEvent[] = Array.from({ length: 7 }, () => ({ kind: "basket_made", team: "home", points: 3 }));
    expect(basketballRules.isFinished(replay(basketballRules, threes, basket), basket)).toBe(true);
  });

  it("tennis: 0-15-30-40, deuce, advantage, dan game", () => {
    expect(pointLabels({ home: 2, away: 1 }, false, false)).toEqual({ home: "30", away: "15" });
    let s = replay(tennisRules, pts("home", "home", "home", "away", "away", "away"), tennisRules.defaults);
    expect(s.detail.pointLabel).toEqual({ home: "40", away: "40" });
    s = replay(tennisRules, pts("home", "home", "home", "away", "away", "away", "away"), tennisRules.defaults);
    expect(s.detail.pointLabel).toEqual({ home: "40", away: "AD" });
    s = replay(tennisRules, pts("home", "home", "home", "away", "away", "away", "away", "away"), tennisRules.defaults);
    expect(detailOf(s).games).toEqual({ home: 0, away: 1 });
  });

  it("tennis: set 6-4, tiebreak di 6-6, dua set memenangkan match", () => {
    const game = (t: Team) => pts(...many(t, 4));
    const setSixFour = [
      ...Array.from({ length: 4 }, () => [...game("home"), ...game("away")]).flat(),
      ...game("home"),
      ...game("home"),
    ];
    let s = replay(tennisRules, setSixFour, tennisRules.defaults);
    expect(detailOf(s).sets).toEqual([{ home: 6, away: 4 }]);

    const toSixAll = Array.from({ length: 6 }, () => [...game("home"), ...game("away")]).flat();
    s = replay(tennisRules, [...setSixFour, ...toSixAll], tennisRules.defaults);
    expect(detailOf(s).tiebreak).toBe(true);
    s = replay(tennisRules, [...setSixFour, ...toSixAll, ...pts(...many("home", 7))], tennisRules.defaults);
    expect(detailOf(s).sets).toEqual([
      { home: 6, away: 4 },
      { home: 7, away: 6 },
    ]);
    expect(tennisRules.isFinished(s, tennisRules.defaults)).toBe(true);
  });

  it("padel: golden point dari setting Coach", () => {
    const golden = mergeRuleSettings(padelRules.defaults, { noAd: true });
    const s = replay(padelRules, pts("home", "home", "home", "away", "away", "away", "away"), golden);
    expect(detailOf(s).games).toEqual({ home: 0, away: 1 });
  });
});
