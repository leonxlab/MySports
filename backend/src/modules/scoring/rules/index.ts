import { badmintonRules } from "./badminton";
import { basketballRules } from "./basketball";
import { futsalRules } from "./futsal";
import { padelRules } from "./padel";
import { tennisRules } from "./tennis";
import type { ScoreRules } from "./types";

export type ScoringSport = "basketball" | "futsal" | "badminton" | "tennis" | "padel";

export const rulesBySport: Record<ScoringSport, ScoreRules<object>> = {
  basketball: basketballRules,
  futsal: futsalRules,
  badminton: badmintonRules,
  tennis: tennisRules,
  padel: padelRules,
};

export * from "./types";
