// Tipe data modul open-play (bentuk respons API). Ditulis ulang dari backend/src/modules/open-play/service.ts.
import type { CheckoutResult } from "@/modules/payments";
import type { Sport } from "@/modules/venues";

export type OpenPlayStatus = "open" | "closed" | "cancelled" | "finished";

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
  /** Rupiah bulat. 0 = gratis. */
  price: number;
  status: OpenPlayStatus;
  distanceM?: number;
}

export interface SearchOpenPlayQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sport?: Sport;
  /** YYYY-MM-DD (UTC) */
  date?: string;
}

export interface CreateOpenPlayBody {
  courtId: string;
  startsAt: string;
  endsAt: string;
  quota: number;
  price: number;
}

export interface UpdateOpenPlayBody {
  startsAt?: string;
  endsAt?: string;
  quota?: number;
  price?: number;
  status?: OpenPlayStatus;
}

export type JoinResult =
  | { status: "confirmed"; checkout: null }
  | { status: "pending_payment"; checkout: CheckoutResult };

export interface MemberSummary {
  id: string;
  displayName: string;
  age?: number | null;
  photoPath?: string | null;
  level?: number;
}
