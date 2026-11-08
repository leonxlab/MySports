import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul accounts. Daftar endpoint: backend/src/modules/accounts/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const accountsApi = {
  /** Buat profil dan role user setelah signup Supabase Auth */
  bootstrapProfile: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/accounts/bootstrap", opts),
  /** Profil sendiri beserta role dan Level */
  getMe: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/accounts/me", opts),
  /** Ubah nama, usia, bio, foto */
  updateMe: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PATCH", "/accounts/me", opts),
  /** Profil publik pemain lain (admin tampil sebagai user biasa) */
  getProfile: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/accounts/:id", opts),
  /** Isi pengalaman bermain per cabang */
  upsertExperience: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("PUT", "/accounts/me/experience/:sport", opts),
  /** Tambah foto, video, atau quote ke galeri */
  addGalleryItem: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/accounts/me/gallery", opts),
  /** Hapus item galeri */
  removeGalleryItem: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("DELETE", "/accounts/me/gallery/:itemId", opts),
  /** Minta signed URL upload foto profil */
  signPhotoUpload: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/accounts/me/photo/sign", opts),
};
