import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul venues. Daftar endpoint: backend/src/modules/venues/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const venuesApi = {
  /** Cari lapangan berdasarkan jarak dan cabang (lat, lng, sport, radius) */
  searchVenues: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/venues", opts),
  /** Lapangan menunggu persetujuan */
  listPendingVenues: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/venues/pending", opts),
  /** Detail lapangan */
  getVenue: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/venues/:id", opts),
  /** Daftarkan lapangan baru */
  createVenue: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/venues", opts),
  /** Ubah data lapangan */
  updateVenue: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PATCH", "/venues/:id", opts),
  /** Tambah court di lapangan */
  addCourt: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/venues/:id/courts", opts),
  /** Jadwal kosong dan terpakai */
  getAvailability: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/venues/courts/:courtId/availability", opts),
  /** Update ketersediaan */
  setAvailability: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PUT", "/venues/courts/:courtId/availability", opts),
  /** Atur harga sewa */
  setPrice: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PUT", "/venues/courts/:courtId/price", opts),
  /** Setujui lapangan */
  approveVenue: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/venues/:id/approve", opts),
  /** Tolak lapangan */
  rejectVenue: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/venues/:id/reject", opts),
};
