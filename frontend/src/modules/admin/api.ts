import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul admin. Daftar endpoint: backend/src/modules/admin/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const adminApi = {
  /** Jumlah pengajuan, lapangan, dan laporan yang menunggu */
  getOverview: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/admin/overview", opts),
  /** Log tindakan admin */
  listAuditLog: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/admin/audit-log", opts),
};
