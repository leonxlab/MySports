// Tipe data modul bracket (bentuk respons API). Ditulis ulang dari backend/src/modules/bracket/service.ts.
import type { Sport } from "@/modules/venues";

export type BracketMode = "singles" | "doubles" | "team";

export interface BracketMatchView {
  id: string;
  court: number;
  /** ID pemain per sisi. */
  home: string[];
  away: string[];
}
export interface BracketRoundView {
  id: string;
  round: number;
  matches: BracketMatchView[];
  /** ID pemain yang istirahat di ronde ini. */
  resting: string[];
}
export interface BracketView {
  id: string;
  openPlayId: string;
  sport: Sport;
  mode: BracketMode;
  courtCount: number;
  matchMinutes: number;
  breakMinutes: number;
  totalMinutes: number;
  version: number;
  rounds: BracketRoundView[];
}

export interface GenerateBracketBody {
  openPlayId: string;
  mode: BracketMode;
  courtCount: number;
  matchMinutes: number;
  breakMinutes?: number;
  totalMinutes?: number;
  playersPerSide?: number;
}
export type RegenerateBracketBody = Partial<Omit<GenerateBracketBody, "openPlayId">>;
