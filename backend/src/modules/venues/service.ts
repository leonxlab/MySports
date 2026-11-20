import type { AppContext } from "../../core/context";
import { AppError, forbidden, notFound } from "../../core/errors";
import type { AuthUser } from "../../core/roles";
import { findOverlap, slotsCovering, type SlotLike } from "./slots";
import type {
  AddCourtInput,
  CreateVenueInput,
  SearchVenuesInput,
  SetAvailabilityInput,
  UpdateVenueInput,
} from "./schema";

export type Sport = "basketball" | "badminton" | "tennis" | "padel" | "futsal";
type VenueStatus = "pending" | "approved" | "rejected";

export interface CourtView {
  id: string;
  venueId: string;
  sport: Sport;
  name: string;
  pricePerHour: number;
  active: boolean;
}
export interface VenueView {
  id: string;
  ownerId: string;
  name: string;
  address: string | null;
  status: VenueStatus;
  lat: number;
  lng: number;
  distanceM?: number;
  courts: CourtView[];
}
/** Hasil `getCourt` untuk modul lain: memuat lokasi venue. */
export interface CourtDetail extends CourtView {
  venue: { id: string; ownerId: string; name: string; status: VenueStatus; lat: number; lng: number };
}

const isAdmin = (u: AuthUser) => u.roles.includes("admin");
const point = (lat: number, lng: number) => `SRID=4326;POINT(${lng} ${lat})`;

/**
 * Logika bisnis modul venues. Aturan ditulis di sini, bukan di routes.ts.
 * Tabel milik modul ini: venues, courts, court_slots.
 * Satu sumber ketersediaan lapangan = court_slots (README, "Keputusan desain").
 */
export function createVenuesService(ctx: AppContext) {
  const db = ctx.supabase;

  const toCourt = (c: Record<string, unknown>): CourtView => ({
    id: c.id as string,
    venueId: c.venue_id as string,
    sport: c.sport as Sport,
    name: c.name as string,
    pricePerHour: Number(c.price_per_hour),
    active: c.active as boolean,
  });

  async function loadVenues(ids: string[]): Promise<Map<string, VenueView>> {
    if (ids.length === 0) return new Map();
    const [venues, geo, courts] = await Promise.all([
      db.from("venues").select("id, owner_id, name, address, status").in("id", ids),
      db.from("venues_geo").select("id, lat, lng").in("id", ids),
      db.from("courts").select("*").in("venue_id", ids).eq("active", true),
    ]);
    for (const r of [venues, geo, courts]) if (r.error) throw r.error;
    const coords = new Map((geo.data ?? []).map((g) => [g.id as string, g]));
    const out = new Map<string, VenueView>();
    for (const v of venues.data ?? []) {
      const g = coords.get(v.id as string);
      out.set(v.id as string, {
        id: v.id,
        ownerId: v.owner_id,
        name: v.name,
        address: v.address,
        status: v.status,
        lat: Number(g?.lat ?? 0),
        lng: Number(g?.lng ?? 0),
        courts: (courts.data ?? []).filter((c) => c.venue_id === v.id).map(toCourt),
      });
    }
    return out;
  }

  async function ownVenue(venueId: string, user: AuthUser) {
    const { data, error } = await db.from("venues").select("id, owner_id").eq("id", venueId).maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("VENUE_NOT_FOUND", "Lapangan tidak ditemukan");
    if (data.owner_id !== user.id && !isAdmin(user)) throw forbidden("Bukan lapangan milikmu");
    return data;
  }

  async function assertOwnsCourt(courtId: string, user: AuthUser) {
    const { data, error } = await db
      .from("courts")
      .select("*, venues(owner_id)")
      .eq("id", courtId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound("COURT_NOT_FOUND", "Court tidak ditemukan");
    const ownerId = (data as { venues: { owner_id: string } }).venues.owner_id;
    if (ownerId !== user.id && !isAdmin(user)) throw forbidden("Bukan court milikmu");
  }

  async function setVenueStatus(id: string, status: VenueStatus) {
    const { data, error } = await db
      .from("venues")
      .update({ status })
      .eq("id", id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new AppError(409, "VENUE_NOT_PENDING", "Lapangan tidak ada atau sudah diputuskan");
    return { id, status };
  }

  async function getAvailability(courtId: string, from?: string, to?: string) {
    let q = db
      .from("court_slots")
      .select("id, starts_at, ends_at, status")
      .eq("court_id", courtId)
      .order("starts_at", { ascending: true });
    if (from) q = q.gte("ends_at", from);
    if (to) q = q.lte("starts_at", to);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(
      (s): SlotLike => ({
        id: s.id as string,
        startsAt: s.starts_at as string,
        endsAt: s.ends_at as string,
        status: s.status as SlotLike["status"],
      }),
    );
  }

  return {
    async createVenue(user: AuthUser, input: CreateVenueInput) {
      const { data, error } = await db
        .from("venues")
        .insert({
          owner_id: user.id,
          name: input.name,
          address: input.address ?? null,
          location: point(input.lat, input.lng),
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string, status: "pending" as const };
    },

    async updateVenue(user: AuthUser, id: string, input: UpdateVenueInput) {
      await ownVenue(id, user);
      if ((input.lat === undefined) !== (input.lng === undefined)) {
        throw new AppError(400, "INVALID_LOCATION", "lat dan lng harus diisi bersamaan");
      }
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.address !== undefined) patch.address = input.address;
      if (input.lat !== undefined && input.lng !== undefined) patch.location = point(input.lat, input.lng);
      if (Object.keys(patch).length > 0) {
        const { error } = await db.from("venues").update(patch).eq("id", id);
        if (error) throw error;
      }
      return (await loadVenues([id])).get(id)!;
    },

    async addCourt(user: AuthUser, venueId: string, input: AddCourtInput) {
      await ownVenue(venueId, user);
      const { data, error } = await db
        .from("courts")
        .insert({ venue_id: venueId, sport: input.sport, name: input.name, price_per_hour: input.pricePerHour })
        .select("*")
        .single();
      if (error) throw error;
      return toCourt(data);
    },

    /** Publik hanya melihat lapangan yang disetujui. */
    async getVenue(id: string, viewer?: AuthUser): Promise<VenueView> {
      const venue = (await loadVenues([id])).get(id);
      const mayView =
        venue && (venue.status === "approved" || (viewer && (viewer.id === venue.ownerId || isAdmin(viewer))));
      if (!venue || !mayView) throw notFound("VENUE_NOT_FOUND", "Lapangan tidak ditemukan");
      return venue;
    },

    async search(input: SearchVenuesInput): Promise<VenueView[]> {
      const { data, error } = await db.rpc("venues_nearby", {
        p_lat: input.lat,
        p_lng: input.lng,
        p_radius_m: input.radiusKm * 1000,
        p_sport: input.sport ?? null,
      });
      if (error) throw error;
      const rows = (data ?? []) as { id: string; distance_m: number }[];
      const venues = await loadVenues(rows.map((r) => r.id));
      return rows.flatMap((r) => {
        const v = venues.get(r.id);
        if (!v) return [];
        const courts = input.sport ? v.courts.filter((c) => c.sport === input.sport) : v.courts;
        return [{ ...v, courts, distanceM: Math.round(r.distance_m) }];
      });
    },

    async listPending(): Promise<VenueView[]> {
      const { data, error } = await db.from("venues").select("id").eq("status", "pending").order("created_at");
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.id as string);
      const venues = await loadVenues(ids);
      return ids.flatMap((id) => (venues.has(id) ? [venues.get(id)!] : []));
    },

    /** Lapangan milik Owner (semua status), untuk halaman kelola. */
    async listMine(user: AuthUser): Promise<VenueView[]> {
      const { data, error } = await db
        .from("venues")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.id as string);
      const venues = await loadVenues(ids);
      return ids.flatMap((id) => (venues.has(id) ? [venues.get(id)!] : []));
    },

    approve: (id: string) => setVenueStatus(id, "approved"),
    reject: (id: string) => setVenueStatus(id, "rejected"),

    getAvailability,

    /** Owner menambah/mengubah slot free atau blocked. Slot `booked` tidak pernah diubah dari sini. */
    async setAvailability(user: AuthUser, courtId: string, input: SetAvailabilityInput) {
      await assertOwnsCourt(courtId, user);
      if (findOverlap(input.slots)) {
        throw new AppError(400, "SLOT_OVERLAP", "Slot yang dikirim tumpang tindih atau tidak valid");
      }
      const existing = await getAvailability(courtId);
      for (const s of input.slots) {
        const booked = existing.find(
          (e) => e.status === "booked" && new Date(e.startsAt) < new Date(s.endsAt) && new Date(s.startsAt) < new Date(e.endsAt),
        );
        if (booked) throw new AppError(409, "SLOT_BOOKED", `Slot ${booked.startsAt} sudah dibooking`);
      }
      const { error } = await db.from("court_slots").upsert(
        input.slots.map((s) => ({
          court_id: courtId,
          starts_at: s.startsAt,
          ends_at: s.endsAt,
          status: s.status,
        })),
        { onConflict: "court_id,starts_at" },
      );
      if (error) {
        // exclusion constraint: bertabrakan dengan slot lain yang sudah ada
        if ((error as { code?: string }).code === "23P01") {
          throw new AppError(409, "SLOT_OVERLAP", "Slot bertabrakan dengan slot yang sudah ada");
        }
        throw error;
      }
      return getAvailability(courtId);
    },

    async setPrice(user: AuthUser, courtId: string, pricePerHour: number) {
      await assertOwnsCourt(courtId, user);
      const { data, error } = await db
        .from("courts")
        .update({ price_per_hour: pricePerHour })
        .eq("id", courtId)
        .select("*")
        .single();
      if (error) throw error;
      return toCourt(data);
    },

    // ---- fungsi untuk modul lain (INTEGRATION.md) ----

    async getCourt(courtId: string): Promise<CourtDetail> {
      const { data, error } = await db.from("courts").select("*").eq("id", courtId).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound("COURT_NOT_FOUND", "Court tidak ditemukan");
      const venue = (await loadVenues([data.venue_id as string])).get(data.venue_id as string)!;
      return {
        ...toCourt(data),
        venue: {
          id: venue.id,
          ownerId: venue.ownerId,
          name: venue.name,
          status: venue.status,
          lat: venue.lat,
          lng: venue.lng,
        },
      };
    },

    /** Slot free yang persis menutup rentang, atau null. Dipakai payments sebelum menagih. */
    async findFreeSlots(courtId: string, startsAt: string, endsAt: string) {
      return slotsCovering(await getAvailability(courtId, startsAt, endsAt), startsAt, endsAt);
    },

    /**
     * Tandai slot `booked` secara atomik (UPDATE bersyarat). Semua atau tidak sama sekali:
     * bila ada yang sudah terisi, yang sempat berubah dikembalikan ke free dan 409 dilempar.
     */
    async markSlotBooked(slotIds: string[]): Promise<void> {
      if (slotIds.length === 0) throw new AppError(400, "NO_SLOTS", "slotIds kosong");
      const { data, error } = await db
        .from("court_slots")
        .update({ status: "booked" })
        .in("id", slotIds)
        .eq("status", "free")
        .select("id");
      if (error) throw error;
      const got = (data ?? []).map((r) => r.id as string);
      if (got.length !== new Set(slotIds).size) {
        if (got.length > 0) await db.from("court_slots").update({ status: "free" }).in("id", got);
        throw new AppError(409, "SLOT_TAKEN", "Slot sudah dibooking orang lain");
      }
    },

    async releaseSlot(slotIds: string[]): Promise<void> {
      const { error } = await db
        .from("court_slots")
        .update({ status: "free" })
        .in("id", slotIds)
        .eq("status", "booked");
      if (error) throw error;
    },

    /** Lepas semua slot `booked` yang berada di dalam rentang (dipakai saat booking dibatalkan). */
    async releaseRange(courtId: string, startsAt: string, endsAt: string): Promise<void> {
      const slots = await getAvailability(courtId, startsAt, endsAt);
      const ids = slots
        .filter(
          (s) =>
            s.status === "booked" &&
            new Date(s.startsAt) >= new Date(startsAt) &&
            new Date(s.endsAt) <= new Date(endsAt),
        )
        .map((s) => s.id);
      if (ids.length > 0) await this.releaseSlot(ids);
    },

    async countPending(): Promise<number> {
      const { count, error } = await db
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  };
}

export type VenuesService = ReturnType<typeof createVenuesService>;
