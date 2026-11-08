import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul level. Daftar endpoint: backend/src/modules/level/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const levelApi = {
  /** Level dan XP sendiri */
  getMyLevel: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/level/me", opts),
  /** Level pemain lain */
  getUserLevel: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/level/users/:userId", opts),
  /** Daftar rekaman yang ditandai anti-cheat */
  listAntiCheatFlags: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/level/flags", opts),
  /** Putuskan hasil review */
  resolveFlag: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/level/flags/:id/resolve", opts),
};
