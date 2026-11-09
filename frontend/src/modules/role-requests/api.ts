import { apiClient } from "@/lib/api-client";
import type { RequestEvidence, RequestPage, RequestStatus, RoleRequest } from "./types";

export const roleRequestsApi = {
  submitCoachRequest: (evidence: RequestEvidence[], note?: string) =>
    apiClient.request<RoleRequest>("POST", "/role-requests/coach", {
      body: { evidence, note },
    }),
  submitOwnerRequest: (note?: string) =>
    apiClient.request<RoleRequest>("POST", "/role-requests/owner", {
      body: { note },
    }),
  listMyRequests: () => apiClient.request<RoleRequest[]>("GET", "/role-requests/mine"),
  listRequests: (
    query: {
      status?: RequestStatus;
      limit?: number;
      cursor?: string;
    } = {},
  ) =>
    apiClient.request<RequestPage>("GET", "/role-requests", {
      query: {
        status: query.status,
        limit: query.limit,
        cursor: query.cursor,
      },
    }),
  approveRequest: (id: string) =>
    apiClient.request<RoleRequest>("POST", "/role-requests/:id/approve", {
      params: { id },
    }),
  rejectRequest: (id: string, reason: string) =>
    apiClient.request<RoleRequest>("POST", "/role-requests/:id/reject", {
      params: { id },
      body: { reason },
    }),
};
