import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul equipment. Daftar endpoint: backend/src/modules/equipment/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const equipmentApi = {
  /** Cari alat terdekat (rekomendasi alat milik Coach lebih dulu) */
  searchEquipment: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/equipment", opts),
  /** Detail alat */
  getEquipment: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/equipment/:id", opts),
  /** Daftarkan alat untuk disewakan */
  listEquipment: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/equipment", opts),
  /** Ubah data alat */
  updateEquipment: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PATCH", "/equipment/:id", opts),
  /** Sewa alat */
  rentEquipment: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/equipment/:id/rent", opts),
};
