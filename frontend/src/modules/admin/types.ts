export interface AdminOverview {
  pending_role_requests: number;
  pending_venues: number;
  open_content_reports: number;
  open_anti_cheat_flags: number;
}

export interface AdminAuditEntry {
  id: string | number;
  admin_id: string;
  method: string;
  path: string;
  target: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminAuditPage {
  items: AdminAuditEntry[];
  next_cursor: string | null;
}
