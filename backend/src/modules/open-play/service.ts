import type { AppContext } from "../../core/context";
import { AppError, forbidden, notFound } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { createAccountsApi, type AccountsApi } from "../accounts";
import { createPaymentsApi, type PaymentsApi } from "../payments";
import { createVenuesApi, type VenuesApi } from "../venues";
import {
  canChangeStatus,
  coveringBooking,
  quotaAllowed,
  timesOverlap,
  type OpenPlayStatus,
} from "./rules";
import type {
  CreateOpenPlayInput,
  SearchOpenPlayInput,
  UpdateOpenPlayInput,
} from "./schema";

type Sport = "basketball" | "badminton" | "tennis" | "padel" | "futsal";

export interface OpenPlayView {
  id: string;
  coachId: string;
  courtId: string;
  courtName: string;
  venueName: string;
  sport: Sport;
  startsAt: string;
  endsAt: string;
  quota: number;
  /** Peserta terkonfirmasi. */
  confirmed: number;
  price: number;
  status: OpenPlayStatus;
  distanceM?: number;
}

export interface ListNearbyFilters extends SearchOpenPlayInput {}

export interface Dependencies {
  venues?: Pick<VenuesApi, "getCourt" | "search">;
  payments?: Pick<PaymentsApi, "createCheckout" | "onPaid" | "settle">;
  accounts?: Pick<AccountsApi, "getProfileSummaries" | "getPublicProfile">;
}

/** Lama kursi `pending_payment` ditahan. TODO(decision): angka ini asumsi sementara (15 menit). */
export const HOLD_MINUTES = 15;

const isAdmin = (u: AuthUser) => u.roles.includes("admin");
const money = (v: unknown) => Math.round(Number(v));

function mapRpcError(e: unknown): never {
  const msg = (e as { message?: string })?.message ?? "";
  const known: Record<string, [number, string, string]> = {
    OPEN_PLAY_NOT_FOUND: [404, "OPEN_PLAY_NOT_FOUND", "Open play tidak ditemukan"],
    OPEN_PLAY_CLOSED: [409, "OPEN_PLAY_CLOSED", "Open play sudah ditutup"],
    OPEN_PLAY_FULL: [409, "OPEN_PLAY_FULL", "Kuota open play sudah penuh"],
    ALREADY_JOINED: [409, "ALREADY_JOINED", "Kamu sudah join open play ini"],
    IS_COACH: [400, "IS_COACH", "Coach tidak bisa join open play miliknya sendiri"],
    NOT_JOINED: [404, "NOT_JOINED", "Kamu belum join open play ini"],
    CANCEL_NOT_ALLOWED: [
      409,
      "REFUND_POLICY_UNDECIDED",
      "Pembatalan setelah membayar belum didukung (kebijakan refund belum diputuskan)",
    ],
  };
  for (const [key, [status, code, message]] of Object.entries(known)) {
    if (msg.includes(key)) throw new AppError(status, code, message);
  }
  throw e;
}

// handler onPaid cukup didaftarkan sekali per AppContext
const initialized = new WeakSet<AppContext>();

/**
 * Logika bisnis modul open-play. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: open_plays, open_play_participants.
 * Kuota atomik lewat fungsi SQL open_play_join / open_play_leave / open_play_confirm.
 */
export function createOpenPlayService(ctx: AppContext, deps: Dependencies = {}) {
  const db = ctx.supabase;
  const venues = deps.venues ?? createVenuesApi(ctx);
  const payments = deps.payments ?? createPaymentsApi(ctx);
  const accounts = deps.accounts ?? createAccountsApi(ctx);

  async function loadRow(id: string) {
    const { data, error } = await db.from("open_plays").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("OPEN_PLAY_NOT_FOUND", "Open play tidak ditemukan");
    return data as Record<string, unknown>;
  }

  async function assertOwner(id: string, user: AuthUser) {
    const row = await loadRow(id);
    if (row.coach_id !== user.id && !isAdmin(user)) throw forbidden("Bukan open play milikmu");
    return row;
  }

  async function activeCount(id: string, statuses = ["pending_payment", "confirmed"]) {
    const { data, error } = await db
      .from("open_play_participants")
      .select("user_id")
      .eq("open_play_id", id)
      .in("status", statuses);
    if (error) throw error;
    return (data ?? []).length;
  }

  async function confirmedParticipants(id: string): Promise<string[]> {
    const { data, error } = await db
      .from("open_play_participants")
      .select("user_id, joined_at")
      .eq("open_play_id", id)
      .eq("status", "confirmed")
      .order("joined_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => r.user_id as string);
  }

  async function toViews(rows: Record<string, unknown>[], distances = new Map<string, number>()) {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id as string);
    const { data, error } = await db
      .from("open_play_participants")
      .select("open_play_id")
      .in("open_play_id", ids)
      .eq("status", "confirmed");
    if (error) throw error;
    const counts = new Map<string, number>();
    for (const p of data ?? []) counts.set(p.open_play_id as string, (counts.get(p.open_play_id as string) ?? 0) + 1);

    const courts = new Map<string, Awaited<ReturnType<VenuesApi["getCourt"]>>>();
    for (const courtId of new Set(rows.map((r) => r.court_id as string))) {
      courts.set(courtId, await venues.getCourt(courtId));
    }
    return rows.map(
      (r): OpenPlayView => {
        const court = courts.get(r.court_id as string)!;
        return {
          id: r.id as string,
          coachId: r.coach_id as string,
          courtId: r.court_id as string,
          courtName: court.name,
          venueName: court.venue.name,
          sport: r.sport as Sport,
          startsAt: r.starts_at as string,
          endsAt: r.ends_at as string,
          quota: r.quota as number,
          confirmed: counts.get(r.id as string) ?? 0,
          price: money(r.price),
          status: r.status as OpenPlayStatus,
          distanceM: distances.get(r.court_id as string),
        };
      },
    );
  }

  async function assertBooked(coachId: string, courtId: string, startsAt: string, endsAt: string) {
    const { data, error } = await db
      .from("court_bookings")
      .select("starts_at, ends_at")
      .eq("court_id", courtId)
      .eq("booked_by", coachId)
      .eq("status", "confirmed");
    if (error) throw error;
    const windows = (data ?? []).map((b) => ({ startsAt: b.starts_at as string, endsAt: b.ends_at as string }));
    if (!coveringBooking(windows, startsAt, endsAt)) {
      throw new AppError(
        409,
        "COURT_NOT_BOOKED",
        "Sewa lapangan untuk jam ini dulu (booking terkonfirmasi) sebelum membuat open play",
      );
    }
  }

  async function assertNoOverlap(courtId: string, startsAt: string, endsAt: string, exceptId?: string) {
    const { data, error } = await db
      .from("open_plays")
      .select("id, starts_at, ends_at, status")
      .eq("court_id", courtId)
      .in("status", ["open", "full", "closed"]);
    if (error) throw error;
    const clash = (data ?? []).find(
      (o) => o.id !== exceptId && timesOverlap(startsAt, endsAt, o.starts_at as string, o.ends_at as string),
    );
    if (clash) throw new AppError(409, "OPEN_PLAY_OVERLAP", "Sudah ada open play di court dan jam itu");
  }

  const service = {
    async create(user: AuthUser, input: CreateOpenPlayInput): Promise<OpenPlayView> {
      const court = await venues.getCourt(input.courtId);
      if (!court.active || court.venue.status !== "approved") {
        throw new AppError(409, "COURT_UNAVAILABLE", "Court tidak tersedia");
      }
      await assertBooked(user.id, input.courtId, input.startsAt, input.endsAt);
      await assertNoOverlap(input.courtId, input.startsAt, input.endsAt);

      const { data, error } = await db
        .from("open_plays")
        .insert({
          coach_id: user.id,
          court_id: input.courtId,
          sport: court.sport,
          starts_at: input.startsAt,
          ends_at: input.endsAt,
          quota: input.quota,
          price: input.price,
        })
        .select("*")
        .single();
      if (error) throw error;
      return (await toViews([data as Record<string, unknown>]))[0]!;
    },

    async get(id: string): Promise<OpenPlayView> {
      return (await toViews([await loadRow(id)]))[0]!;
    },

    /** Dipakai feed: open play mendatang, terdekat dulu bila lokasi diberikan. */
    async listNearby(filters: ListNearbyFilters): Promise<OpenPlayView[]> {
      const distances = new Map<string, number>();
      let courtIds: string[] | null = null;
      if (filters.lat !== undefined && filters.lng !== undefined) {
        const found = await venues.search({
          lat: filters.lat,
          lng: filters.lng,
          radiusKm: filters.radiusKm,
          sport: filters.sport,
        });
        courtIds = [];
        for (const v of found) {
          for (const c of v.courts) {
            courtIds.push(c.id);
            distances.set(c.id, v.distanceM ?? 0);
          }
        }
        if (courtIds.length === 0) return [];
      }

      let q = db
        .from("open_plays")
        .select("*")
        .in("status", ["open", "full"])
        .gte("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(100);
      if (filters.sport) q = q.eq("sport", filters.sport);
      if (courtIds) q = q.in("court_id", courtIds);
      if (filters.date) {
        q = q.gte("starts_at", `${filters.date}T00:00:00Z`).lte("starts_at", `${filters.date}T23:59:59Z`);
      }
      const { data, error } = await q;
      if (error) throw error;
      const views = await toViews((data ?? []) as Record<string, unknown>[], distances);
      return distances.size > 0
        ? views.sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0) || a.startsAt.localeCompare(b.startsAt))
        : views;
    },

    async update(user: AuthUser, id: string, input: UpdateOpenPlayInput): Promise<OpenPlayView> {
      const row = await assertOwner(id, user);
      const current = row.status as OpenPlayStatus;
      const patch: Record<string, unknown> = {};

      if (input.quota !== undefined) {
        if (!quotaAllowed(input.quota, await activeCount(id))) {
          throw new AppError(409, "QUOTA_TOO_LOW", "Kuota tidak boleh lebih kecil dari jumlah peserta");
        }
        patch.quota = input.quota;
      }
      if (input.price !== undefined) patch.price = input.price;

      if (input.startsAt !== undefined || input.endsAt !== undefined) {
        const startsAt = input.startsAt ?? (row.starts_at as string);
        const endsAt = input.endsAt ?? (row.ends_at as string);
        if (!(new Date(endsAt) > new Date(startsAt))) {
          throw new AppError(400, "INVALID_TIME", "endsAt harus setelah startsAt");
        }
        await assertBooked(row.coach_id as string, row.court_id as string, startsAt, endsAt);
        await assertNoOverlap(row.court_id as string, startsAt, endsAt, id);
        patch.starts_at = startsAt;
        patch.ends_at = endsAt;
      }

      if (input.status !== undefined && input.status !== current) {
        if (!canChangeStatus(current, input.status)) {
          throw new AppError(409, "INVALID_STATUS", `Status ${current} tidak bisa diubah ke ${input.status}`);
        }
        if (input.status === "cancelled" && (await activeCount(id, ["confirmed"])) > 0) {
          throw new AppError(
            409,
            "REFUND_POLICY_UNDECIDED",
            "Membatalkan open play yang sudah ada peserta berbayar butuh kebijakan refund (belum diputuskan)",
          );
        }
        patch.status = input.status;
      }

      if (Object.keys(patch).length > 0) {
        const { error } = await db.from("open_plays").update(patch).eq("id", id);
        if (error) throw error;
      }
      if (patch.status === "finished") await service.settleOpenPlay(id);
      return service.get(id);
    },

    /**
     * Teruskan dana semua pembayaran lunas ke Coach setelah open play selesai.
     * TODO(decision): kapan dana diteruskan. Asumsi: saat open play berstatus `finished`.
     */
    async settleOpenPlay(id: string): Promise<number> {
      const { data, error } = await db
        .from("payments")
        .select("id")
        .eq("target_type", "open_play")
        .eq("target_id", id)
        .eq("status", "paid");
      if (error) throw error;
      for (const p of data ?? []) await payments.settle(p.id as string);
      return (data ?? []).length;
    },

    async join(userId: string, openPlayId: string) {
      const row = await loadRow(openPlayId);
      const { error } = await db.rpc("open_play_join", {
        p_open_play: openPlayId,
        p_user: userId,
        p_hold_minutes: HOLD_MINUTES,
      });
      if (error) mapRpcError(error);

      if (money(row.price) === 0) {
        const { error: cErr } = await db.rpc("open_play_confirm", {
          p_open_play: openPlayId,
          p_user: userId,
          p_payment: null,
        });
        if (cErr) mapRpcError(cErr);
        return { status: "confirmed" as const, checkout: null };
      }

      try {
        const checkout = await payments.createCheckout({
          payerId: userId,
          targetType: "open_play",
          targetId: openPlayId,
        });
        return { status: "pending_payment" as const, checkout };
      } catch (e) {
        // jangan menahan kursi bila tagihan gagal dibuat
        await db.rpc("open_play_leave", { p_open_play: openPlayId, p_user: userId });
        throw e;
      }
    },

    async leave(userId: string, openPlayId: string): Promise<void> {
      const { error } = await db.rpc("open_play_leave", { p_open_play: openPlayId, p_user: userId });
      if (error) mapRpcError(error);
    },

    async listParticipants(user: AuthUser, openPlayId: string) {
      await assertOwner(openPlayId, user);
      const ids = await confirmedParticipants(openPlayId);
      const summaries = await accounts.getProfileSummaries(ids);
      const byId = new Map(summaries.map((s) => [s.id, s]));
      return ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    },

    async searchMembers(q: string, sport?: Sport) {
      let query = db.from("profiles").select("id, display_name, age, photo_path").ilike("display_name", `%${q}%`).limit(30);
      const { data, error } = await query;
      if (error) throw error;
      let rows = data ?? [];
      if (sport && rows.length > 0) {
        const { data: exp, error: eErr } = await db
          .from("profile_sport_experience")
          .select("user_id")
          .eq("sport", sport)
          .in("user_id", rows.map((r) => r.id as string));
        if (eErr) throw eErr;
        const has = new Set((exp ?? []).map((e) => e.user_id as string));
        rows = rows.filter((r) => has.has(r.id as string));
      }
      return rows.map((r) => ({
        id: r.id as string,
        displayName: r.display_name as string,
        age: (r.age as number | null) ?? null,
        photoPath: (r.photo_path as string | null) ?? null,
        level: 0, // TODO(integration): level.getLevelSummary setelah modul level siap
      }));
    },

    async getMember(userId: string) {
      const profile = await accounts.getPublicProfile(userId);
      const [exp, gallery] = await Promise.all([
        db.from("profile_sport_experience").select("sport, years, notes").eq("user_id", userId),
        db
          .from("profile_gallery")
          .select("id, kind, storage_path, quote_text, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      if (exp.error) throw exp.error;
      if (gallery.error) throw gallery.error;
      return { ...profile, experience: exp.data ?? [], gallery: gallery.data ?? [] };
    },

    // ---- untuk modul lain (INTEGRATION.md) ----
    listConfirmedParticipants: confirmedParticipants,
    getOpenPlay: (id: string) => service.get(id),
    async countPending(): Promise<number> {
      return 0; // TODO(integration): belum ada konsep open play menunggu persetujuan
    },
  };

  if (!initialized.has(ctx)) {
    initialized.add(ctx);
    payments.onPaid("open_play", async (p) => {
      const { data, error } = await db.rpc("open_play_confirm", {
        p_open_play: p.targetId,
        p_user: p.payerId,
        p_payment: p.paymentId,
      });
      if (error) throw error;
      if (data === "no_seat") {
        // TODO(decision): kebijakan refund. Pembayaran tetap `paid` dan tidak diteruskan ke Coach.
        console.warn(`open_play ${p.targetId}: pembayaran ${p.paymentId} lunas tetapi kursi sudah habis`);
      }
    });
  }

  return service;
}

export type OpenPlayService = ReturnType<typeof createOpenPlayService>;
