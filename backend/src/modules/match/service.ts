import type { AppContext } from "../../core/context";
import { AppError, forbidden, notFound } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createBracketApi, type BracketApi } from "../bracket";
import {
  applyAction,
  DEFAULT_SETTINGS,
  elapsedAt,
  initialRuntime,
  MatchRuleError,
  mergeSettings,
  patchSettings,
  type MatchAction,
  type MatchSettings,
  type MatchState,
  type MatchStatus,
  type PauseReason,
  type Sport,
} from "./rules";
import type { CreateMatchInput, UpdateSettingsInput } from "./schema";

export interface MatchView {
  id: string;
  sport: Sport;
  bracketMatchId: string | null;
  createdBy: string;
  status: MatchStatus;
  settings: MatchSettings;
  /** Detik berjalan pada `serverTime`. Klien menambah selisih waktunya sendiri saat status running. */
  elapsedSeconds: number;
  serverTime: string;
  pauseReason: PauseReason | null;
  timeoutsLeft: number;
  hydrationLeft: number;
  startedAt: string | null;
  finishedAt: string | null;
}

/** Dipakai modul scoring: pemegang match dan setting-nya. */
export interface MatchSummary {
  id: string;
  sport: Sport;
  bracketMatchId: string | null;
  createdBy: string;
  status: MatchStatus;
  settings: MatchSettings;
}

export interface Dependencies {
  bracket: Pick<BracketApi, "getBracketMatch">;
}

interface Row {
  id: string;
  bracket_match_id: string | null;
  created_by: string;
  sport: Sport;
  settings: Partial<MatchSettings> | null;
  runtime: Partial<MatchState["runtime"]> | null;
  status: MatchStatus;
  elapsed_seconds: number;
  started_at: string | null;
  finished_at: string | null;
}

const COLUMNS =
  "id, bracket_match_id, created_by, sport, settings, runtime, status, elapsed_seconds, started_at, finished_at";

const isAdmin = (user: AuthUser) => user.roles.includes("admin");

/**
 * Logika bisnis modul match. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: matches.
 * Tabel open_plays hanya dibaca (untuk memeriksa pemilik open play dari bracket match).
 */
export function createMatchService(ctx: AppContext, deps?: Dependencies) {
  const db = ctx.supabase;
  const bracket = deps?.bracket ?? createBracketApi(ctx);

  const settingsOf = (row: Row): MatchSettings => patchSettings(DEFAULT_SETTINGS[row.sport], row.settings ?? {});
  const stateOf = (row: Row): MatchState => ({
    status: row.status,
    elapsedSeconds: row.elapsed_seconds,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    runtime: { ...initialRuntime(), ...row.runtime },
  });

  function view(row: Row, now = new Date()): MatchView {
    const settings = settingsOf(row);
    const state = stateOf(row);
    return {
      id: row.id,
      sport: row.sport,
      bracketMatchId: row.bracket_match_id,
      createdBy: row.created_by,
      status: row.status,
      settings,
      elapsedSeconds: elapsedAt(state, now),
      serverTime: now.toISOString(),
      pauseReason: state.runtime.pauseReason,
      timeoutsLeft: Math.max(0, settings.timeout.count - state.runtime.timeoutsUsed),
      hydrationLeft: Math.max(0, settings.hydration.count - state.runtime.hydrationUsed),
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    };
  }

  async function load(id: string): Promise<Row> {
    const { data, error } = await db.from("matches").select(COLUMNS).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("MATCH_NOT_FOUND", "Match tidak ditemukan");
    return data as Row;
  }

  function assertOwner(user: AuthUser, row: Row) {
    if (row.created_by !== user.id && !isAdmin(user)) throw forbidden("Match ini bukan milikmu");
  }

  const publish = (v: MatchView) => ctx.realtime.publish(`match:${v.id}`, { type: "match", match: v });

  async function control(user: AuthUser, id: string, action: MatchAction): Promise<MatchView> {
    const row = await load(id);
    assertOwner(user, row);
    const now = new Date();
    let next: MatchState;
    try {
      next = applyAction(stateOf(row), action, settingsOf(row), now);
    } catch (e) {
      if (e instanceof MatchRuleError) throw new AppError(409, `MATCH_${e.code}`, e.message);
      throw e;
    }
    // Update bersyarat pada status lama: dua permintaan serentak tidak bisa sama-sama lolos
    // (mis. dua time out sekaligus memakai satu jatah dua kali).
    const { data, error } = await db
      .from("matches")
      .update({
        status: next.status,
        elapsed_seconds: next.elapsedSeconds,
        started_at: next.startedAt,
        finished_at: next.finishedAt,
        runtime: next.runtime,
      })
      .eq("id", id)
      .eq("status", row.status)
      .select(COLUMNS);
    if (error) throw error;
    const updated = (data as Row[] | null)?.[0];
    if (!updated) throw new AppError(409, "MATCH_CONFLICT", "Status match berubah, muat ulang lalu coba lagi");
    const v = view(updated, now);
    publish(v);
    return v;
  }

  return {
    defaults(sport: Sport): MatchSettings {
      return DEFAULT_SETTINGS[sport];
    },

    async create(user: AuthUser, input: CreateMatchInput): Promise<MatchView> {
      let sport = input.sport;
      if (input.bracketMatchId) {
        const bm = await bracket.getBracketMatch(input.bracketMatchId);
        if (input.sport && input.sport !== bm.sport) {
          throw new AppError(400, "MATCH_SPORT_MISMATCH", "Cabang tidak sama dengan cabang bracket");
        }
        sport = bm.sport;
        const { data: op, error: opErr } = await db
          .from("open_plays")
          .select("id, coach_id")
          .eq("id", bm.openPlayId)
          .maybeSingle();
        if (opErr) throw opErr;
        if (!op) throw notFound("OPEN_PLAY_NOT_FOUND", "Open play tidak ditemukan");
        if (op.coach_id !== user.id && !isAdmin(user)) throw forbidden("Open play ini bukan milikmu");
        const { data: existing, error: exErr } = await db
          .from("matches")
          .select("id")
          .eq("bracket_match_id", input.bracketMatchId)
          .maybeSingle();
        if (exErr) throw exErr;
        if (existing) throw new AppError(409, "MATCH_ALREADY_EXISTS", "Match untuk bracket match ini sudah ada");
      }
      const settings = mergeSettings(sport!, input.settings ?? {});
      const { data, error } = await db
        .from("matches")
        .insert({
          bracket_match_id: input.bracketMatchId ?? null,
          created_by: user.id,
          sport,
          settings,
          runtime: initialRuntime(),
        })
        .select(COLUMNS)
        .single();
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          throw new AppError(409, "MATCH_ALREADY_EXISTS", "Match untuk bracket match ini sudah ada");
        }
        throw error;
      }
      return view(data as Row);
    },

    async get(id: string): Promise<MatchView> {
      return view(await load(id));
    },

    /** Edit setting hanya sebelum match dimulai, supaya aturan tidak berubah di tengah permainan. */
    async updateSettings(user: AuthUser, id: string, input: UpdateSettingsInput): Promise<MatchView> {
      const row = await load(id);
      assertOwner(user, row);
      if (row.status !== "scheduled") {
        throw new AppError(409, "MATCH_ALREADY_STARTED", "Setting tidak bisa diubah setelah match dimulai");
      }
      const settings = patchSettings(settingsOf(row), input);
      const { data, error } = await db
        .from("matches")
        .update({ settings })
        .eq("id", id)
        .eq("status", "scheduled")
        .select(COLUMNS);
      if (error) throw error;
      const updated = (data as Row[] | null)?.[0];
      if (!updated) throw new AppError(409, "MATCH_ALREADY_STARTED", "Setting tidak bisa diubah setelah match dimulai");
      const v = view(updated);
      publish(v);
      return v;
    },

    start: (user: AuthUser, id: string) => control(user, id, "start"),
    pause: (user: AuthUser, id: string) => control(user, id, "pause"),
    resume: (user: AuthUser, id: string) => control(user, id, "resume"),
    finish: (user: AuthUser, id: string) => control(user, id, "finish"),
    timeout: (user: AuthUser, id: string) => control(user, id, "timeout"),
    hydration: (user: AuthUser, id: string) => control(user, id, "hydration"),
    cancel: (user: AuthUser, id: string) => control(user, id, "cancel"),

    /** Untuk modul scoring: ringkasan match dan setting aturan skornya. */
    async getMatchSettings(id: string): Promise<MatchSummary> {
      const row = await load(id);
      return {
        id: row.id,
        sport: row.sport,
        bracketMatchId: row.bracket_match_id,
        createdBy: row.created_by,
        status: row.status,
        settings: settingsOf(row),
      };
    },
  };
}

export type MatchService = ReturnType<typeof createMatchService>;
