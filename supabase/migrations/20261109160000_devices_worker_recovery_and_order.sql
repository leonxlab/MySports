create or replace function claim_next_segment(p_worker text)
returns setof video_segments
language sql
as $$
  update video_segments
     set status = 'processing', locked_by = p_worker, locked_at = now(), attempts = attempts + 1
   where id = (
     select segment.id
       from video_segments segment
      where segment.status = 'queued'
        and not exists (
          select 1
            from video_segments earlier
           where earlier.device_id = segment.device_id
             and earlier.seq < segment.seq
             and earlier.status not in ('done', 'failed')
        )
      order by segment.created_at, segment.device_id, segment.seq
      limit 1
      for update skip locked
   )
  returning *;
$$;

create or replace function requeue_stale_segments(p_stale_seconds integer)
returns setof video_segments
language sql
as $$
  update video_segments
     set status = 'queued', locked_by = null, locked_at = null
   where status = 'processing'
     and locked_at < now() - make_interval(secs => p_stale_seconds)
  returning *;
$$;

revoke execute on function claim_next_segment(text) from public, anon, authenticated;
revoke execute on function requeue_stale_segments(integer) from public, anon, authenticated;
grant execute on function claim_next_segment(text) to service_role;
grant execute on function requeue_stale_segments(integer) to service_role;
