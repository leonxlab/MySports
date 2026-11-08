import { apiClient, type RequestOptions } from "@/lib/api-client";

// Panggilan API modul role-requests. Daftar endpoint: backend/src/modules/role-requests/README.md
// TODO: ganti tipe opts dan T dengan tipe spesifik di types.ts saat endpoint jadi.
export const roleRequestsApi = {
  /** Ajukan jadi Coach dengan bukti pengalaman dan prestasi */
  submitCoachRequest: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/role-requests/coach", opts),
  /** Ajukan jadi Owner Lapangan */
  submitOwnerRequest: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/role-requests/owner", opts),
  /** Status pengajuan milik sendiri */
  listMyRequests: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/role-requests/mine", opts),
  /** Daftar pengajuan menunggu */
  listRequests: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("GET", "/role-requests", opts),
  /** Setujui pengajuan (memberi role) */
  approveRequest: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/role-requests/:id/approve", opts),
  /** Tolak pengajuan */
  rejectRequest: <T = unknown>(opts?: RequestOptions) => apiClient.request<T>("POST", "/role-requests/:id/reject", opts),
};
