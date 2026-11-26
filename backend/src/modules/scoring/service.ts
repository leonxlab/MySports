import type { AppContext } from "../../core/context";
import { AppError, forbidden, notFound } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createAccountsApi, type AccountsApi } from "../accounts";
import { createBracketApi, type BracketApi } from "../bracket";
import { createMatchApi, type MatchApi } from "../match";
import {
  mergeRuleSettings,
  otherTeam,
  replay,
  rulesBySport,
  ScoreRuleError,
  type ScoreEvent,
  type ScoreEventKind,
  type ScoreState,
  type ScoringSport,
  type Team,
} from "./rules";
import type { AddEventInput, FoulInput, PlayerPointsInput, ReviewEventInput } from "./schema";

type Status = "suggested" | "confirmed" | "corrected" | "voided";
const COUNTED: Status[] = ["confirmed", "corrected"];

interface EventDetail {
  kind?: ScoreEventKind;
  action?: string;
  /** Usulan basket dari AI: poin 2 atau 3 belum dipilih Coach. */
  points_unconfirmed?: boolean;
  ai?: { type: string; confidence: number; camera: string; payload: Record<string, unknown> };
}

interface EventRow {
  id: string;
  match_id: string;
  team: Team | null;
  points: number;
  scorer_id: string | null;
  source: "ai" | "manual";
  status: Status;
  detail: EventDetail | null;
  event_key: string | null;
  occurred_at_ms: number | null;
  confirmed_by: string | null;
  created_at: string;
}

const EVENT_COLUMNS =
  "id, match_id, team, points, scorer_id, source, status, detail, event_key, occurred_at_ms, confirmed_by, created_at";

export interface ScoreEventView {
  id: string;
  matchId: string;
  kind: ScoreEventKind;
  team: Team | null;
  points: number;
  pointsConfirmed: boolean;
  scorerId: string | null;
  source: "ai" | "manual";
  status: Status;
  action: string | null;
  confidence: number | null;
  occurredAtMs: number | null;
  createdAt: string;
}

export interface Scoreboard {
  matchId: string;
  sport: ScoringSport;
  matchStatus: string;
  score: ScoreState;
  finished: boolean;
  /** Setting aturan skor yang berlaku (bawaan ditimpa setting match). */
  settings: object;
  /** Kejadian terhitung yang tidak diterapkan karena skor sudah final (misal setting diubah). */
  ignoredEventIds: string[];
  suggestions: ScoreEventView[];
}

type Shots = { one: number; two: number; three: number };

export interface PlayerStats {
  userId: string;
  displayName: string | null;
  points: number;
  /** true bila poin diisi atau dikoreksi Coach lewat PUT .../players/:playerId/points */
  pointsOverridden: boolean;
  shots: Shots;
  actions: Record<string, number>;
  fouls: number;
}

export interface MatchStats {
  matchId: string;
  sport: ScoringSport;
  players: PlayerStats[];
}

export interface UserSportStats {
  sport: ScoringSport;
  matches: number;
  points: number;
  shots: Shots;
  actions: Record<string, number>;
  fouls: number;
}

/** Bentuk event yang dipakai: cocok dengan contracts/detection-event.schema.json (dikirim modul devices). */
export interface SuggestedEvent {
  event_id: string;
  match_id: string | null;
  camera: "home" | "away";
  sport: string;
  timestamp_ms: number;
  confidence: number;
  type: string;
  payload: Record<string, unknown>;
}

export type IngestResult =
  | { eventId: string; status: "stored"; scoreEventId: string }
  | { eventId: string; status: "duplicate" }
  | { eventId: string; status: "skipped"; reason: "NO_MATCH" | "NOT_SCORING" | "KIND_NOT_ALLOWED" | "MATCH_NOT_FOUND" };

export interface Dependencies {
  match: Pick<MatchApi, "getMatchSettings">;
  bracket: Pick<BracketApi, "getBracketMatch">;
  accounts: Pick<AccountsApi, "getProfileSummaries">;
}

type MatchSummary = Awaited<ReturnType<MatchApi["getMatchSettings"]>>;

interface Tally {
  points: number;
  shots: Shots;
  actions: Record<string, number>;
  fouls: number;
}

const isAdmin = (user: AuthUser) => user.roles.includes("admin");
const emptyTally = (): Tally => ({ points: 0, shots: { one: 0, two: 0, three: 0 }, actions: {}, fouls: 0 });
const shotKey = (points: number): keyof Shots => (points === 1 ? "one" : points === 2 ? "two" : "three");

function addEventToTally(t: Tally, row: EventRow) {
  t.points += row.points;
  if (row.detail?.kind === "basket_made") t.shots[shotKey(row.points)] += 1;
  const action = row.detail?.action;
  if (action) t.actions[action] = (t.actions[action] ?? 0) + 1;
}

function view(row: EventRow): ScoreEventView {
  const d = row.detail ?? {};
  return {
    id: row.id,
    matchId: row.match_id,
    kind: d.kind ?? "point",
    team: row.team,
    points: row.points,
    pointsConfirmed: !d.points_unconfirmed,
    scorerId: row.scorer_id,
    source: row.source,
    status: row.status,
    action: d.action ?? null,
    confidence: d.ai?.confidence ?? null,
    occurredAtMs: row.occurred_at_ms,
    createdAt: row.created_at,
  };
}

function toScoreEvent(kind: ScoreEventKind, team: Team, points: number): ScoreEvent {
  if (kind === "basket_made") return { kind, team, points: points as 1 | 2 | 3 };
  return { kind, team };
}

function rowToScoreEvent(row: EventRow): ScoreEvent {
  if (!row.team) throw new AppError(500, "SCORE_EVENT_WITHOUT_TEAM", "Kejadian terhitung tanpa tim");
  return toScoreEvent(row.detail?.kind ?? "point", row.team, row.points);
}

function ruleError(e: unknown): never {
  if (e instanceof ScoreRuleError) {
    throw new AppError(e.code === "MATCH_FINISHED" ? 409 : 400, e.code, e.message);
  }
  throw e;
}

/**
 * Tim dari usulan AI. TODO(decision): pemetaan warna baju ke home/away belum ada di setting match.
 * Sementara dibaca dari `settings.rules.teamColors = { home: "blue", away: "red" }` bila diisi Coach.
 * Untuk `ball_landed`: jatuh di DALAM sisi S = poin untuk lawan S; jatuh di LUAR dekat sisi S = poin untuk S.
 * Tanpa sisi atau warna, tim dibiarkan kosong dan Coach memilih saat konfirmasi.
 */
export function teamFromSuggestion(event: SuggestedEvent, rules: Record<string, unknown> | undefined): Team | null {
  if (event.type === "ball_landed") {
    const side = event.payload.side;
    if (side !== "home" && side !== "away") return null;
    return event.payload.in_bounds === true ? otherTeam(side) : side;
  }
  const color = typeof event.payload.team_color === "string" ? event.payload.team_color.toLowerCase() : null;
  const colors = rules?.teamColors as Partial<Record<Team, string>> | undefined;
  if (!color || !colors) return null;
  if (colors.home?.toLowerCase() === color) return "home";
  if (colors.away?.toLowerCase() === color) return "away";
  return null;
}

const KIND_OF_AI_TYPE: Record<string, ScoreEventKind | undefined> = {
  basket_made: "basket_made",
  goal: "goal",
  ball_landed: "point",
};

/**
 * Logika bisnis modul scoring. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: score_events, fouls, player_match_stats.
 * Tabel matches hanya dibaca (cabang per match untuk statistik user).
 *
 * TODO(decision): memadukan skor manual dengan hasil AI yang menyusul (pertanyaan #4). Sekarang
 * kejadian dihitung menurut urutan masuk (`created_at`); `source`, `status`, dan `occurred_at_ms`
 * tersimpan supaya kebijakan lain bisa ditambahkan tanpa mengubah data.
 */
export function createScoringService(ctx: AppContext, deps?: Partial<Dependencies>) {
  const db = ctx.supabase;
  const match = deps?.match ?? createMatchApi(ctx);
  const bracket = deps?.bracket ?? createBracketApi(ctx);
  const accounts = deps?.accounts ?? createAccountsApi(ctx);

  function rulesFor(summary: MatchSummary) {
    const sport = summary.sport as ScoringSport;
    const rules = rulesBySport[sport];
    const settings = mergeRuleSettings(rules.defaults, summary.settings.rules);
    return { sport, rules, settings };
  }

  function assertCoach(user: AuthUser, summary: MatchSummary) {
    if (summary.createdBy !== user.id && !isAdmin(user)) {
      throw forbidden("Hanya Coach match ini yang boleh mengubah skor");
    }
  }

  async function loadEvents(matchId: string): Promise<EventRow[]> {
    const { data, error } = await db.from("score_events").select(EVENT_COLUMNS).eq("match_id", matchId);
    if (error) throw error;
    // Urutan stabil menurut waktu masuk; baris dengan waktu sama mempertahankan urutan asal.
    return ((data ?? []) as EventRow[]).sort((a, b) =>
      a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
    );
  }

  async function loadEvent(eventId: string): Promise<EventRow> {
    const { data, error } = await db.from("score_events").select(EVENT_COLUMNS).eq("id", eventId).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("SCORE_EVENT_NOT_FOUND", "Kejadian skor tidak ditemukan");
    return data as EventRow;
  }

  /** Hitung papan skor dengan toleran: kejadian setelah skor final dilewati dan dilaporkan. */
  function compute(summary: MatchSummary, rows: EventRow[]): Scoreboard {
    const { sport, rules, settings } = rulesFor(summary);
    let state = rules.initial(settings);
    const ignoredEventIds: string[] = [];
    for (const row of rows) {
      if (!COUNTED.includes(row.status)) continue;
      if (rules.isFinished(state, settings)) {
        ignoredEventIds.push(row.id);
        continue;
      }
      try {
        state = rules.apply(state, rowToScoreEvent(row), settings);
      } catch (e) {
        if (!(e instanceof ScoreRuleError)) throw e;
        ignoredEventIds.push(row.id);
      }
    }
    return {
      matchId: summary.id,
      sport,
      matchStatus: summary.status,
      score: state,
      finished: rules.isFinished(state, settings),
      settings,
      ignoredEventIds,
      suggestions: rows.filter((r) => r.status === "suggested").map(view),
    };
  }

  /** Cek ketat sebelum menulis: semua kejadian terhitung (setelah perubahan) harus sah. */
  function validate(summary: MatchSummary, counted: ScoreEvent[]) {
    const { rules, settings } = rulesFor(summary);
    try {
      replay(rules, counted, settings);
    } catch (e) {
      ruleError(e);
    }
  }

  async function assertScorerInTeam(summary: MatchSummary, team: Team, scorerId: string | null | undefined) {
    if (!scorerId || !summary.bracketMatchId) return;
    // Daftar pemain per sisi diambil dari jadwal bracket (proposal: Aturan per cabang, basket).
    const bm = await bracket.getBracketMatch(summary.bracketMatchId);
    if (!bm[team].includes(scorerId)) {
      throw new AppError(400, "SCORER_NOT_IN_TEAM", "Pemain pencetak bukan anggota tim ini");
    }
  }

  async function getScoreboard(matchId: string): Promise<Scoreboard> {
    const summary = await match.getMatchSettings(matchId);
    return compute(summary, await loadEvents(matchId));
  }

  async function broadcast(matchId: string): Promise<Scoreboard> {
    const board = await getScoreboard(matchId);
    ctx.realtime.publish(`match:${matchId}`, { type: "score", scoreboard: board });
    return board;
  }

  /** Statistik per pemain dari kejadian confirmed/corrected, ditimpa koreksi Coach bila ada. */
  async function getMatchStats(matchId: string): Promise<MatchStats> {
    const summary = await match.getMatchSettings(matchId);
    const rows = await loadEvents(matchId);
    const tallies = new Map<string, Tally>();
    const tally = (id: string) => {
      if (!tallies.has(id)) tallies.set(id, emptyTally());
      return tallies.get(id)!;
    };
    for (const row of rows) {
      if (COUNTED.includes(row.status) && row.scorer_id) addEventToTally(tally(row.scorer_id), row);
    }

    const { data: fouls, error: foulError } = await db.from("fouls").select("player_id").eq("match_id", matchId);
    if (foulError) throw foulError;
    for (const f of (fouls ?? []) as { player_id: string }[]) tally(f.player_id).fouls += 1;

    const { data: overrides, error } = await db
      .from("player_match_stats")
      .select("user_id, points, stats")
      .eq("match_id", matchId);
    if (error) throw error;
    const overridden = new Set<string>();
    for (const o of (overrides ?? []) as { user_id: string; points: number; stats: Record<string, number> | null }[]) {
      const t = tally(o.user_id);
      t.points = o.points;
      t.actions = { ...t.actions, ...(o.stats ?? {}) };
      overridden.add(o.user_id);
    }

    const ids = [...tallies.keys()];
    const names = new Map((await accounts.getProfileSummaries(ids)).map((p) => [p.id, p.display_name]));
    return {
      matchId,
      sport: summary.sport as ScoringSport,
      players: ids.map((userId) => ({
        userId,
        displayName: names.get(userId) ?? null,
        pointsOverridden: overridden.has(userId),
        ...tallies.get(userId)!,
      })),
    };
  }

  return {
    /** Papan skor: skor dihitung ulang dari kejadian terhitung, plus antrean usulan AI. */
    getScoreboard,

    /** Untuk modul match dan devices. */
    getScoreSnapshot: getScoreboard,

    getMatchStats,

    async addScoreEvent(user: AuthUser, matchId: string, input: AddEventInput): Promise<Scoreboard> {
      const summary = await match.getMatchSettings(matchId);
      assertCoach(user, summary);
      const points = input.kind === "basket_made" ? input.points! : 1;
      const event = toScoreEvent(input.kind, input.team, points);
      const rows = await loadEvents(matchId);
      validate(summary, [...rows.filter((r) => COUNTED.includes(r.status)).map(rowToScoreEvent), event]);
      await assertScorerInTeam(summary, input.team, input.scorerId);

      const { error } = await db.from("score_events").insert({
        match_id: matchId,
        team: input.team,
        points,
        scorer_id: input.scorerId ?? null,
        source: "manual",
        status: "confirmed",
        detail: { kind: input.kind, ...(input.action ? { action: input.action } : {}) },
        occurred_at_ms: input.occurredAtMs ?? null,
        confirmed_by: user.id,
      });
      if (error) throw error;
      return broadcast(matchId);
    },

    /** Konfirmasi atau koreksi kejadian. Usulan basket dari AI wajib dipilih poinnya (2 atau 3). */
    async reviewScoreEvent(user: AuthUser, eventId: string, input: ReviewEventInput): Promise<Scoreboard> {
      const row = await loadEvent(eventId);
      const summary = await match.getMatchSettings(row.match_id);
      assertCoach(user, summary);
      if (row.status === "voided") throw new AppError(409, "EVENT_VOIDED", "Kejadian sudah dibatalkan");
      if (input.action === "confirm" && row.status !== "suggested") {
        throw new AppError(409, "EVENT_NOT_SUGGESTED", "Hanya usulan AI yang bisa dikonfirmasi");
      }

      const kind = row.detail?.kind ?? "point";
      const team = input.team ?? row.team;
      if (!team) throw new AppError(400, "TEAM_REQUIRED", "Pilih tim pencetak");
      if (kind === "basket_made" && row.detail?.points_unconfirmed && input.points === undefined) {
        throw new AppError(400, "POINTS_REQUIRED", "Pilih 2 atau 3 poin untuk tembakan ini");
      }
      if (kind !== "basket_made" && input.points !== undefined && input.points !== 1) {
        throw new AppError(400, "POINTS_NOT_ALLOWED", "Poin hanya bisa dipilih untuk basket");
      }
      const points = kind === "basket_made" ? (input.points ?? row.points) : 1;
      const scorerId = input.scorerId === undefined ? row.scorer_id : input.scorerId;
      // Memilih tim atau 2/3 poin adalah bagian normal dari konfirmasi usulan AI, jadi tetap "confirmed".
      // "corrected" = Coach sengaja mengoreksi lewat action "correct".
      const status: Status = input.action === "correct" ? "corrected" : "confirmed";

      const rows = await loadEvents(row.match_id);
      const counted = rows
        .filter((r) => r.id === row.id || COUNTED.includes(r.status))
        .map((r) => (r.id === row.id ? toScoreEvent(kind, team, points) : rowToScoreEvent(r)));
      validate(summary, counted);
      await assertScorerInTeam(summary, team, scorerId);

      const detail: EventDetail = { ...(row.detail ?? {}) };
      delete detail.points_unconfirmed;
      const { error } = await db
        .from("score_events")
        .update({ team, points, scorer_id: scorerId, status, detail, confirmed_by: user.id })
        .eq("id", row.id);
      if (error) throw error;
      return broadcast(row.match_id);
    },

    async voidScoreEvent(user: AuthUser, eventId: string): Promise<Scoreboard> {
      const row = await loadEvent(eventId);
      const summary = await match.getMatchSettings(row.match_id);
      assertCoach(user, summary);
      if (row.status === "voided") throw new AppError(409, "EVENT_VOIDED", "Kejadian sudah dibatalkan");
      const { error } = await db.from("score_events").update({ status: "voided", confirmed_by: user.id }).eq("id", row.id);
      if (error) throw error;
      return broadcast(row.match_id);
    },

    /** Isi atau koreksi poin peserta secara langsung (bila AI tidak menangkap). Menimpa jumlah dari kejadian. */
    async setPlayerPoints(user: AuthUser, matchId: string, playerId: string, input: PlayerPointsInput): Promise<MatchStats> {
      const summary = await match.getMatchSettings(matchId);
      assertCoach(user, summary);
      const { error } = await db
        .from("player_match_stats")
        .upsert(
          { match_id: matchId, user_id: playerId, points: input.points, stats: input.stats ?? {} },
          { onConflict: "match_id,user_id" },
        );
      if (error) throw error;
      const stats = await getMatchStats(matchId);
      ctx.realtime.publish(`match:${matchId}`, { type: "stats", stats });
      return stats;
    },

    async addFoul(user: AuthUser, matchId: string, input: FoulInput) {
      const summary = await match.getMatchSettings(matchId);
      assertCoach(user, summary);
      const { data, error } = await db
        .from("fouls")
        .insert({ match_id: matchId, player_id: input.playerId, kind: input.kind ?? null })
        .select("id, match_id, player_id, kind, created_at")
        .single();
      if (error) throw error;
      const foul = data as { id: string; match_id: string; player_id: string; kind: string | null; created_at: string };
      ctx.realtime.publish(`match:${matchId}`, { type: "foul", foul });
      return foul;
    },

    /** Statistik pemain per cabang dari semua match yang ia ikuti. */
    async getUserStats(userId: string): Promise<UserSportStats[]> {
      const { data: events, error } = await db
        .from("score_events")
        .select(EVENT_COLUMNS)
        .eq("scorer_id", userId)
        .in("status", COUNTED);
      if (error) throw error;
      const { data: fouls, error: foulError } = await db.from("fouls").select("match_id").eq("player_id", userId);
      if (foulError) throw foulError;
      const { data: overrides, error: ovError } = await db
        .from("player_match_stats")
        .select("match_id, points, stats")
        .eq("user_id", userId);
      if (ovError) throw ovError;

      const rows = (events ?? []) as EventRow[];
      const foulRows = (fouls ?? []) as { match_id: string }[];
      const ovRows = (overrides ?? []) as { match_id: string; points: number; stats: Record<string, number> | null }[];

      const perMatch = new Map<string, Tally>();
      const tally = (id: string) => {
        if (!perMatch.has(id)) perMatch.set(id, emptyTally());
        return perMatch.get(id)!;
      };
      for (const row of rows) addEventToTally(tally(row.match_id), row);
      for (const f of foulRows) tally(f.match_id).fouls += 1;
      for (const o of ovRows) {
        const t = tally(o.match_id);
        t.points = o.points;
        t.actions = { ...t.actions, ...(o.stats ?? {}) };
      }
      if (perMatch.size === 0) return [];

      // Baca read-only tabel matches (milik modul match) untuk cabang tiap match.
      const { data: matches, error: mError } = await db.from("matches").select("id, sport").in("id", [...perMatch.keys()]);
      if (mError) throw mError;
      const sportOf = new Map(((matches ?? []) as { id: string; sport: ScoringSport }[]).map((m) => [m.id, m.sport]));

      const bySport = new Map<ScoringSport, UserSportStats>();
      for (const [matchId, t] of perMatch) {
        const sport = sportOf.get(matchId);
        if (!sport) continue;
        const acc = bySport.get(sport) ?? { sport, matches: 0, ...emptyTally() };
        acc.matches += 1;
        acc.points += t.points;
        acc.fouls += t.fouls;
        acc.shots = { one: acc.shots.one + t.shots.one, two: acc.shots.two + t.shots.two, three: acc.shots.three + t.shots.three };
        for (const [k, v] of Object.entries(t.actions)) acc.actions[k] = (acc.actions[k] ?? 0) + v;
        bySport.set(sport, acc);
      }
      return [...bySport.values()];
    },

    /**
     * Untuk modul devices: simpan usulan AI sebagai `suggested`. Idempoten lewat `event_key`
     * (= event_id dari yolo-service). Hasil per event; satu event gagal tidak menggagalkan yang lain.
     */
    async ingestSuggestedEvents(events: SuggestedEvent[]): Promise<IngestResult[]> {
      const summaries = new Map<string, MatchSummary | null>();
      const touched = new Set<string>();
      const results: IngestResult[] = [];

      for (const ev of events) {
        const kind = KIND_OF_AI_TYPE[ev.type];
        if (!kind) {
          results.push({ eventId: ev.event_id, status: "skipped", reason: "NOT_SCORING" });
          continue;
        }
        if (!ev.match_id) {
          results.push({ eventId: ev.event_id, status: "skipped", reason: "NO_MATCH" });
          continue;
        }
        if (!summaries.has(ev.match_id)) {
          const summary = await match.getMatchSettings(ev.match_id).catch((e: unknown) => {
            if (e instanceof AppError && e.status === 404) return null;
            throw e;
          });
          summaries.set(ev.match_id, summary);
        }
        const summary = summaries.get(ev.match_id);
        if (!summary) {
          results.push({ eventId: ev.event_id, status: "skipped", reason: "MATCH_NOT_FOUND" });
          continue;
        }
        if (!rulesFor(summary).rules.kinds.includes(kind)) {
          results.push({ eventId: ev.event_id, status: "skipped", reason: "KIND_NOT_ALLOWED" });
          continue;
        }

        const { data: existing, error: findError } = await db
          .from("score_events")
          .select("id")
          .eq("event_key", ev.event_id)
          .maybeSingle();
        if (findError) throw findError;
        if (existing) {
          results.push({ eventId: ev.event_id, status: "duplicate" });
          continue;
        }

        const { data, error } = await db
          .from("score_events")
          .insert({
            match_id: ev.match_id,
            team: teamFromSuggestion(ev, summary.settings.rules),
            // Basket: AI tidak tahu 2 atau 3 (pertanyaan #10). Simpan 2 sementara, Coach wajib memilih.
            points: kind === "basket_made" ? 2 : 1,
            source: "ai",
            status: "suggested",
            event_key: ev.event_id,
            occurred_at_ms: ev.timestamp_ms,
            detail: {
              kind,
              ...(kind === "basket_made" ? { points_unconfirmed: true } : {}),
              ai: { type: ev.type, confidence: ev.confidence, camera: ev.camera, payload: ev.payload },
            },
          })
          .select("id")
          .single();
        if (error) {
          // Dua kiriman bersamaan dengan event_key sama: yang kalah ditolak unique index.
          if ((error as { code?: string }).code === "23505") {
            results.push({ eventId: ev.event_id, status: "duplicate" });
            continue;
          }
          throw error;
        }
        results.push({ eventId: ev.event_id, status: "stored", scoreEventId: (data as { id: string }).id });
        touched.add(ev.match_id);
      }

      for (const matchId of touched) {
        const board = await getScoreboard(matchId);
        ctx.realtime.publish(`match:${matchId}`, { type: "suggestions", suggestions: board.suggestions });
      }
      return results;
    },
  };
}

export type ScoringService = ReturnType<typeof createScoringService>;
