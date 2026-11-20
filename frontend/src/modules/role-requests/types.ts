import type { ProfileSummary } from "@/modules/accounts/types";

export type RequestStatus = "pending" | "approved" | "rejected";
export type RequestedRole = "coach" | "owner";
export type EvidenceType = "text" | "image" | "video" | "url";

export interface RequestEvidence {
  type: EvidenceType;
  value: string;
}

export interface RoleRequest {
  id: string;
  user_id: string;
  requested_role: RequestedRole;
  status: RequestStatus;
  evidence: RequestEvidence[];
  note: string | null;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  applicant?: ProfileSummary | null;
}

export interface RequestPage {
  items: RoleRequest[];
  next_cursor: string | null;
}
