import { apiClient } from "@/lib/api-client";
import type { CourtView, SearchVenuesQuery, SlotView, VenueView } from "./types";

// Panggilan API modul venues. Daftar endpoint: backend/src/modules/venues/README.md
export const venuesApi = {
  /** Cari lapangan berdasarkan jarak dan cabang */
  searchVenues: (query: SearchVenuesQuery) =>
    apiClient.request<VenueView[]>("GET", "/venues", { query: { ...query } }),
  /** Lapangan menunggu persetujuan [admin] */
  listPendingVenues: () => apiClient.request<VenueView[]>("GET", "/venues/pending"),
  /** Lapangan milik Owner, semua status [owner] */
  listMine: () => apiClient.request<VenueView[]>("GET", "/venues/mine"),
  /** Detail lapangan */
  getVenue: (id: string) => apiClient.request<VenueView>("GET", "/venues/:id", { params: { id } }),
  /** Daftarkan lapangan baru [owner] */
  createVenue: (body: { name: string; address?: string; lat: number; lng: number }) =>
    apiClient.request<VenueView>("POST", "/venues", { body }),
  /** Tambah court di lapangan [owner] */
  addCourt: (venueId: string, body: { sport: string; name: string; pricePerHour: number }) =>
    apiClient.request<CourtView>("POST", "/venues/:id/courts", { params: { id: venueId }, body }),
  /** Jadwal kosong dan terpakai */
  getAvailability: (courtId: string, range: { from?: string; to?: string } = {}) =>
    apiClient.request<SlotView[]>("GET", "/venues/courts/:courtId/availability", {
      params: { courtId },
      query: range,
    }),
  /** Update ketersediaan [owner] */
  setAvailability: (
    courtId: string,
    slots: { startsAt: string; endsAt: string; status: "free" | "blocked" }[],
  ) =>
    apiClient.request<SlotView[]>("PUT", "/venues/courts/:courtId/availability", {
      params: { courtId },
      body: { slots },
    }),
  /** Atur harga sewa [owner] */
  setPrice: (courtId: string, pricePerHour: number) =>
    apiClient.request<CourtView>("PUT", "/venues/courts/:courtId/price", {
      params: { courtId },
      body: { pricePerHour },
    }),
  /** Setujui lapangan [admin] */
  approveVenue: (id: string) =>
    apiClient.request<VenueView>("POST", "/venues/:id/approve", { params: { id } }),
  /** Tolak lapangan [admin] */
  rejectVenue: (id: string) =>
    apiClient.request<VenueView>("POST", "/venues/:id/reject", { params: { id } }),
};
