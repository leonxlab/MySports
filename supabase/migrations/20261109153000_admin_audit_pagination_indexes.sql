create index admin_audit_log_page_idx
  on admin_audit_log (created_at desc, id desc);

create index admin_audit_log_admin_page_idx
  on admin_audit_log (admin_id, created_at desc, id desc);
