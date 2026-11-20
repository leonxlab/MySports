// Tipe data modul match (bentuk respons API). Ditulis ulang dari backend/src/modules/match/service.ts.
import type { Sport } from "@/modules/venues";

export type MatchStatus = "scheduled" | "running" | "paused" | "finished" | "cancelled";
export type PauseReason = "manual" | "timeout" | "hydration";

export interface BreakRule {
  count: number;
  seconds: number;
}

export interface MatchSettings {
  mode: "singles" | "doubles" | "team";
  durationMinutes: number;
  playersPerSide: number;
  timeout: BreakRule;
  hydration: BreakRule;
  breakMinutes: number;
  rules?: Record<string, unknown>;
}

export interface MatchView {
  id: string;
  sport: Sport;
  bracketMatchId: string | null;
  createdBy: string;
  status: MatchStatus;
  settings: MatchSettings;
  /** Detik berjalan pada `serverTime`. Saat `running`, klien menambah selisih waktu sejak serverTime. */
  elapsedSeconds: number;
  serverTime: string;
  pauseReason: PauseReason | null;
  timeoutsLeft: number;
  hydrationLeft: number;
  startedAt: string | null;
  finishedAt: string | null;
}

export type MatchSettingsPatch = Partial<Omit<MatchSettings, "timeout" | "hydration">> & {
  timeout?: Partial<BreakRule>;
  hydration?: Partial<BreakRule>;
};

export interface CreateMatchBody {
  sport?: Sport;
  bracketMatchId?: string;
  settings?: MatchSettingsPatch;
}

/** Pesan di WebSocket /match/:id/live */
export type LiveMessage = { type: "subscribed"; channel: string } | { type: "match"; match: MatchView };
