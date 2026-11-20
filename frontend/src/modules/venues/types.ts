// Tipe data modul venues (bentuk respons API). Ditulis ulang dari backend/src/modules/venues/service.ts.
export type Sport = "basketball" | "badminton" | "tennis" | "padel" | "futsal";
export const SPORTS: Sport[] = ["basketball", "badminton", "tennis", "padel", "futsal"];

export type VenueStatus = "pending" | "approved" | "rejected";

export interface CourtView {
  id: string;
  venueId: string;
  sport: Sport;
  name: string;
  /** Rupiah bulat per jam. */
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

export interface SlotView {
  id: string;
  startsAt: string;
  endsAt: string;
  status: "free" | "booked" | "blocked";
}

export interface SearchVenuesQuery {
  lat: number;
  lng: number;
  radiusKm?: number;
  sport?: Sport;
}
