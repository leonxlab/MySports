import { apiClient } from "@/lib/api-client";
import type { AdminAuditPage, AdminOverview } from "./types";

export const adminApi = {
  getOverview: () => apiClient.request<AdminOverview>("GET", "/admin/overview"),
  listAuditLog: (
    options: {
      admin_id?: string;
      from?: string;
      to?: string;
      limit?: number;
      cursor?: string;
    } = {},
  ) => apiClient.request<AdminAuditPage>("GET", "/admin/audit-log", { query: options }),
};
