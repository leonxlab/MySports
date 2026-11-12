-- modul: devices
-- Persetujuan pemain sebelum direkam (rules.md bagian 9) dan cabang untuk sesi tanpa match.
alter table device_sessions add column consent_at timestamptz;
alter table device_sessions add column sport text
  check (sport in ('basketball', 'badminton', 'tennis', 'padel', 'futsal'));

-- Offset waktu segmen supaya yolo-service bisa menghitung timestamp_ms event di dalam match.
-- Nama `start_offset_ms` mengikuti yang sudah dibaca worker jobs (event_context_offset, Leon).
-- `mime_type` karena potongan MediaRecorder bisa WebM atau MP4 (docs/decisions/video-segment-format.md).
alter table video_segments add column start_offset_ms bigint check (start_offset_ms >= 0);
alter table video_segments add column duration_ms int check (duration_ms > 0);
alter table video_segments add column mime_type text;

-- requeue_stale_segments sudah ada di 20261109160000_devices_worker_recovery_and_order.sql (jobs),
-- dipakai apa adanya.
