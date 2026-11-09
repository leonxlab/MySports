import type { AppContext } from "../../core/context";
import { AppError, forbidden, notFound } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createOpenPlayApi } from "../open-play";
import { generateBracket, BracketError, type Mode, type Sport } from "./algorithm";
import { validateCorrection } from "./correction";
import type { CorrectMatchInput, GenerateBracketInput, RegenerateBracketInput } from "./schema";

export interface BracketMatchView {
  id: string;
  court: number;
  home: string[];
  away: string[];
}
export interface BracketRoundView {
  id: string;
  round: number;
  matches: BracketMatchView[];
  resting: string[];
}
export interface BracketView {
  id: string;
  openPlayId: string;
  sport: Sport;
  mode: Mode;
  courtCount: number;
  matchMinutes: number;
  breakMinutes: number;
  totalMinutes: number;
  version: number;
  rounds: BracketRoundView[];
}

/** Hasil `getBracketMatch` untuk match dan scoring: pemain per sisi. */
export interface BracketMatchDetail {
  id: string;
  bracketId: string;
  openPlayId: string;
  sport: Sport;
  round: number;
  court: number;
  home: string[];
  away: string[];
}

const isAdmin = (user: AuthUser) => user.roles.includes("admin");

function mapError(e: unknown): never {
  if (e instanceof BracketError) {
    const status = e.code === "NOT_ENOUGH_PLAYERS" || e.code === "NO_ROUNDS" ? 409 : 400;
    throw new AppError(status, `BRACKET_${e.code}`, e.message);
  }
  throw e;
}

/**
 * Logika bisnis modul bracket. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: brackets, bracket_rounds, bracket_matches, bracket_resting.
 * Tabel open_plays hanya dibaca; peserta lewat createOpenPlayApi.
 */
export function createBracketService(ctx: AppContext) {
  const db = ctx.supabase;

  async function loadOpenPlay(openPlayId: string) {
    const { data, error } = await db
      .from("open_plays")
      .select("id, coach_id, sport, starts_at, ends_at")
      .eq("id", openPlayId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("OPEN_PLAY_NOT_FOUND", "Open play tidak ditemukan");
    return data as { id: string; coach_id: string; sport: Sport; starts_at: string; ends_at: string };
  }

  // Peserta terkonfirmasi lewat pintu resmi modul open-play (rules.md bagian 3).
  const confirmedParticipants = (openPlayId: string): Promise<string[]> =>
    createOpenPlayApi(ctx).listConfirmedParticipants(openPlayId);

  async function assertCoachOf(openPlayId: string, user: AuthUser) {
    const op = await loadOpenPlay(openPlayId);
    if (op.coach_id !== user.id && !isAdmin(user)) throw forbidden("Bukan open play milikmu");
    return op;
  }

  async function persist(
    openPlay: { id: string; sport: Sport },
    params: {
      mode: Mode;
      courtCount: number;
      matchMinutes: number;
      breakMinutes: number;
      totalMinutes: number;
      playersPerSide?: number;
    },
    participants: string[],
    version: number,
  ): Promise<string> {
    const rounds = (() => {
      try {
        return generateBracket({
          sport: openPlay.sport,
          mode: params.mode,
          playerIds: participants,
          courtCount: params.courtCount,
          totalMinutes: params.totalMinutes,
          matchMinutes: params.matchMinutes,
          breakMinutes: params.breakMinutes,
          playersPerSide: params.playersPerSide,
          seed: version,
        });
      } catch (e) {
        return mapError(e);
      }
    })();

    const { data: bracket, error } = await db
      .from("brackets")
      .insert({
        open_play_id: openPlay.id,
        sport: openPlay.sport,
        mode: params.mode,
        court_count: params.courtCount,
        match_minutes: params.matchMinutes,
        break_minutes: params.breakMinutes,
        total_minutes: params.totalMinutes,
        version,
      })
      .select("id")
      .single();
    if (error) throw error;
    const bracketId = bracket.id as string;

    try {
      const { data: roundRows, error: roundErr } = await db
        .from("bracket_rounds")
        .insert(rounds.map((r) => ({ bracket_id: bracketId, round_no: r.round })))
        .select("id, round_no");
      if (roundErr) throw roundErr;
      const roundId = new Map((roundRows ?? []).map((r) => [r.round_no as number, r.id as string]));

      const matchRows = rounds.flatMap((r) =>
        r.matches.map((m) => ({
          round_id: roundId.get(r.round)!,
          court_no: m.court,
          home_players: m.home,
          away_players: m.away,
        })),
      );
      const { error: matchErr } = await db.from("bracket_matches").insert(matchRows);
      if (matchErr) throw matchErr;

      const restRows = rounds.flatMap((r) =>
        r.resting.map((userId) => ({ round_id: roundId.get(r.round)!, user_id: userId })),
      );
      if (restRows.length > 0) {
        const { error: restErr } = await db.from("bracket_resting").insert(restRows);
        if (restErr) throw restErr;
      }
    } catch (e) {
      // tanpa transaksi multi-langkah: bersihkan bracket setengah jadi (cascade)
      await db.from("brackets").delete().eq("id", bracketId);
      throw e;
    }
    return bracketId;
  }

  async function getBracket(id: string): Promise<BracketView> {
    const { data: b, error } = await db.from("brackets").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!b) throw notFound("BRACKET_NOT_FOUND", "Bracket tidak ditemukan");

    const { data: roundRows, error: rErr } = await db
      .from("bracket_rounds")
      .select("id, round_no")
      .eq("bracket_id", id)
      .order("round_no", { ascending: true });
    if (rErr) throw rErr;
    const roundIds = (roundRows ?? []).map((r) => r.id as string);

    const { data: matchRows, error: mErr } = await db
      .from("bracket_matches")
      .select("id, round_id, court_no, home_players, away_players")
      .in("round_id", roundIds)
      .order("court_no", { ascending: true });
    if (mErr) throw mErr;
    const { data: restRows, error: sErr } = await db
      .from("bracket_resting")
      .select("round_id, user_id")
      .in("round_id", roundIds);
    if (sErr) throw sErr;

    return {
      id: b.id,
      openPlayId: b.open_play_id,
      sport: b.sport,
      mode: b.mode,
      courtCount: b.court_count,
      matchMinutes: b.match_minutes,
      breakMinutes: b.break_minutes,
      totalMinutes: b.total_minutes,
      version: b.version,
      rounds: (roundRows ?? []).map((r) => ({
        id: r.id as string,
        round: r.round_no as number,
        matches: (matchRows ?? [])
          .filter((m) => m.round_id === r.id)
          .map((m) => ({
            id: m.id as string,
            court: m.court_no as number,
            home: m.home_players as string[],
            away: m.away_players as string[],
          })),
        resting: (restRows ?? []).filter((x) => x.round_id === r.id).map((x) => x.user_id as string),
      })),
    };
  }

  async function latestBracketId(openPlayId: string): Promise<string | null> {
    const { data, error } = await db
      .from("brackets")
      .select("id")
      .eq("open_play_id", openPlayId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data?.id as string | undefined) ?? null;
  }

  return {
    async generate(user: AuthUser, input: GenerateBracketInput): Promise<BracketView> {
      const op = await assertCoachOf(input.openPlayId, user);
      if (await latestBracketId(op.id)) {
        throw new AppError(409, "BRACKET_EXISTS", "Bracket sudah ada, pakai regenerate");
      }
      const totalMinutes =
        input.totalMinutes ??
        Math.floor((new Date(op.ends_at).getTime() - new Date(op.starts_at).getTime()) / 60000);
      const participants = await confirmedParticipants(op.id);
      const id = await persist(op, { ...input, totalMinutes }, participants, 1);
      return getBracket(id);
    },

    async getByOpenPlay(openPlayId: string): Promise<BracketView> {
      const id = await latestBracketId(openPlayId);
      if (!id) throw notFound("BRACKET_NOT_FOUND", "Belum ada bracket untuk open play ini");
      return getBracket(id);
    },

    getBracket,

    async regenerate(user: AuthUser, bracketId: string, input: RegenerateBracketInput) {
      const old = await getBracket(bracketId);
      const op = await assertCoachOf(old.openPlayId, user);

      // bracket yang sudah punya match berjalan tidak boleh dibuat ulang
      const matchIds = old.rounds.flatMap((r) => r.matches.map((m) => m.id));
      const { data: started, error } = await db
        .from("matches")
        .select("id")
        .in("bracket_match_id", matchIds)
        .neq("status", "scheduled")
        .limit(1);
      if (error) throw error;
      if ((started ?? []).length > 0) {
        throw new AppError(409, "BRACKET_STARTED", "Ada match yang sudah berjalan");
      }

      const participants = await confirmedParticipants(op.id);
      const { error: delErr } = await db.from("brackets").delete().eq("id", bracketId);
      if (delErr) throw delErr;
      const id = await persist(
        op,
        {
          mode: input.mode ?? old.mode,
          courtCount: input.courtCount ?? old.courtCount,
          matchMinutes: input.matchMinutes ?? old.matchMinutes,
          breakMinutes: input.breakMinutes ?? old.breakMinutes,
          totalMinutes: input.totalMinutes ?? old.totalMinutes,
          playersPerSide: input.playersPerSide,
        },
        participants,
        old.version + 1,
      );
      return getBracket(id);
    },

    async correctMatch(
      user: AuthUser,
      bracketId: string,
      matchId: string,
      input: CorrectMatchInput,
    ): Promise<BracketView> {
      const bracket = await getBracket(bracketId);
      await assertCoachOf(bracket.openPlayId, user);
      const round = bracket.rounds.find((r) => r.matches.some((m) => m.id === matchId));
      if (!round) throw notFound("BRACKET_MATCH_NOT_FOUND", "Match tidak ada di bracket ini");
      const current = round.matches.find((m) => m.id === matchId)!;

      const { data: running, error } = await db
        .from("matches")
        .select("id")
        .eq("bracket_match_id", matchId)
        .neq("status", "scheduled")
        .limit(1);
      if (error) throw error;
      if ((running ?? []).length > 0) {
        throw new AppError(409, "MATCH_STARTED", "Match sudah berjalan, susunan tidak bisa diubah");
      }

      const problems = validateCorrection(input.home, input.away, {
        participants: await confirmedParticipants(bracket.openPlayId),
        otherPlayersInRound: round.matches
          .filter((m) => m.id !== matchId)
          .flatMap((m) => [...m.home, ...m.away]),
        perSide: current.home.length,
      });
      if (problems.length > 0) {
        throw new AppError(422, "INVALID_CORRECTION", `Koreksi tidak sah: ${problems.join(", ")}`);
      }

      const { error: upErr } = await db
        .from("bracket_matches")
        .update({ home_players: input.home, away_players: input.away })
        .eq("id", matchId);
      if (upErr) throw upErr;

      // pemain yang tidak lagi tampil di ronde ini otomatis istirahat
      const inRound = new Set(
        round.matches.flatMap((m) =>
          m.id === matchId ? [...input.home, ...input.away] : [...m.home, ...m.away],
        ),
      );
      const all = await confirmedParticipants(bracket.openPlayId);
      const resting = all.filter((id) => !inRound.has(id));
      const { error: delErr } = await db.from("bracket_resting").delete().eq("round_id", round.id);
      if (delErr) throw delErr;
      if (resting.length > 0) {
        const { error: insErr } = await db
          .from("bracket_resting")
          .insert(resting.map((user_id) => ({ round_id: round.id, user_id })));
        if (insErr) throw insErr;
      }
      return getBracket(bracketId);
    },

    /** Untuk match dan scoring: pemain per sisi dari satu bracket match. */
    async getBracketMatch(id: string): Promise<BracketMatchDetail> {
      const { data: m, error } = await db
        .from("bracket_matches")
        .select("id, round_id, court_no, home_players, away_players")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!m) throw notFound("BRACKET_MATCH_NOT_FOUND", "Match bracket tidak ditemukan");
      const { data: r, error: rErr } = await db
        .from("bracket_rounds")
        .select("round_no, bracket_id")
        .eq("id", m.round_id)
        .single();
      if (rErr) throw rErr;
      const { data: b, error: bErr } = await db
        .from("brackets")
        .select("id, open_play_id, sport")
        .eq("id", r.bracket_id)
        .single();
      if (bErr) throw bErr;
      return {
        id: m.id,
        bracketId: b.id,
        openPlayId: b.open_play_id,
        sport: b.sport,
        round: r.round_no,
        court: m.court_no,
        home: m.home_players,
        away: m.away_players,
      };
    },
  };
}

export type BracketService = ReturnType<typeof createBracketService>;
