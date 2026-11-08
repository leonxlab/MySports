import { badmintonRules } from "./badminton";
import { basketballRules } from "./basketball";
import { futsalRules } from "./futsal";
import { padelRules } from "./padel";
import { tennisRules } from "./tennis";
import type { ScoreRules } from "./types";

export const rulesBySport: Record<string, ScoreRules> = {
  basketball: basketballRules,
  futsal: futsalRules,
  badminton: badmintonRules,
  tennis: tennisRules,
  padel: padelRules,
};
