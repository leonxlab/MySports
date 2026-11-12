// Tipe data modul scoring (bentuk respons API). Ditulis ulang dari backend/src/modules/scoring/service.ts.
import type { Sport } from "@/modules/venues";

export type Team = "home" | "away";
export type ScoreEventKind = "basket_made" | "goal" | "point";
export type ScoreEventStatus = "suggested" | "confirmed" | "corrected" | "voided";

export interface ScoreState {
  home: number;
  away: number;
  /** Struktur per cabang: shots (basket), games/gamesWon (badminton), games/sets/pointLabel (tennis, padel). */
  detail: Record<string, unknown>;
}

export interface ScoreEventView {
  id: string;
  matchId: string;
  kind: ScoreEventKind;
  team: Team | null;
  points: number;
  /** false = usulan basket dari AI, Coach wajib memilih 2 atau 3. */
  pointsConfirmed: boolean;
  scorerId: string | null;
  source: "ai" | "manual";
  status: ScoreEventStatus;
  action: string | null;
  confidence: number | null;
  occurredAtMs: number | null;
  createdAt: string;
}

export interface Scoreboard {
  matchId: string;
  sport: Sport;
  matchStatus: string;
  score: ScoreState;
  finished: boolean;
  settings: Record<string, unknown>;
  ignoredEventIds: string[];
  suggestions: ScoreEventView[];
}

export interface Shots {
  one: number;
  two: number;
  three: number;
}

export interface PlayerStats {
  userId: string;
  displayName: string | null;
  points: number;
  pointsOverridden: boolean;
  shots: Shots;
  actions: Record<string, number>;
  fouls: number;
}

export interface MatchStats {
  matchId: string;
  sport: Sport;
  players: PlayerStats[];
}

export interface UserSportStats {
  sport: Sport;
  matches: number;
  points: number;
  shots: Shots;
  actions: Record<string, number>;
  fouls: number;
}

export interface Foul {
  id: string;
  match_id: string;
  player_id: string;
  kind: string | null;
  created_at: string;
}

export interface AddEventBody {
  kind: ScoreEventKind;
  team: Team;
  points?: 1 | 2 | 3;
  scorerId?: string;
  action?: string;
  occurredAtMs?: number;
}

export interface ReviewEventBody {
  action: "confirm" | "correct";
  team?: Team;
  points?: 1 | 2 | 3;
  scorerId?: string | null;
}

export interface PlayerPointsBody {
  points: number;
  stats?: Record<string, number>;
}

/** Pemain untuk ScorerPicker dan FoulPanel. Daftar per sisi diambil halaman pemakai dari jadwal bracket. */
export interface PlayerOption {
  id: string;
  name: string;
}

export type ScoringLiveMessage =
  | { type: "score"; scoreboard: Scoreboard }
  | { type: "suggestions"; suggestions: ScoreEventView[] }
  | { type: "stats"; stats: MatchStats }
  | { type: "foul"; foul: Foul };
