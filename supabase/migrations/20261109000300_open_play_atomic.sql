-- modul: open-play. Kuota dikelola atomik di database (satu baris open_plays dikunci per operasi).

create or replace function open_play_join(p_open_play uuid, p_user uuid, p_hold_minutes int default 15)
returns void language plpgsql as $$
declare v_quota int; v_status text; v_coach uuid; v_active int; v_existing text;
begin
  select quota, status, coach_id into v_quota, v_status, v_coach
    from open_plays where id = p_open_play for update;
  if not found then raise exception 'OPEN_PLAY_NOT_FOUND'; end if;
  if v_status in ('closed', 'finished', 'cancelled') then raise exception 'OPEN_PLAY_CLOSED'; end if;
  if v_coach = p_user then raise exception 'IS_COACH'; end if;

  -- lepas kursi yang tidak dibayar dalam batas waktu tahan
  update open_play_participants set status = 'cancelled'
    where open_play_id = p_open_play and status = 'pending_payment'
      and joined_at < now() - make_interval(mins => p_hold_minutes);

  select status into v_existing from open_play_participants
    where open_play_id = p_open_play and user_id = p_user;
  if v_existing in ('pending_payment', 'confirmed') then raise exception 'ALREADY_JOINED'; end if;

  select count(*) into v_active from open_play_participants
    where open_play_id = p_open_play and status in ('pending_payment', 'confirmed');
  if v_active >= v_quota then raise exception 'OPEN_PLAY_FULL'; end if;

  insert into open_play_participants (open_play_id, user_id, status, joined_at, payment_id)
    values (p_open_play, p_user, 'pending_payment', now(), null)
    on conflict (open_play_id, user_id)
    do update set status = 'pending_payment', joined_at = now(), payment_id = null;

  if v_active + 1 >= v_quota then
    update open_plays set status = 'full' where id = p_open_play and status = 'open';
  end if;
end $$;

-- Batal join. Peserta yang sudah membayar tidak bisa batal sampai kebijakan refund diputuskan.
create or replace function open_play_leave(p_open_play uuid, p_user uuid)
returns void language plpgsql as $$
declare v_status text;
begin
  perform 1 from open_plays where id = p_open_play for update;
  if not found then raise exception 'OPEN_PLAY_NOT_FOUND'; end if;

  select status into v_status from open_play_participants
    where open_play_id = p_open_play and user_id = p_user;
  if v_status is null or v_status = 'cancelled' then raise exception 'NOT_JOINED'; end if;
  if v_status = 'confirmed' then raise exception 'CANCEL_NOT_ALLOWED'; end if;

  update open_play_participants set status = 'cancelled'
    where open_play_id = p_open_play and user_id = p_user;
  update open_plays set status = 'open' where id = p_open_play and status = 'full';
end $$;

-- Dipanggil setelah pembayaran lunas. Mengembalikan 'confirmed' atau 'no_seat'
-- (kursi sudah dilepas dan penuh: pembayaran perlu ditangani, lihat TODO(decision) refund).
create or replace function open_play_confirm(p_open_play uuid, p_user uuid, p_payment uuid)
returns text language plpgsql as $$
declare v_quota int; v_status text; v_active int;
begin
  select quota into v_quota from open_plays where id = p_open_play for update;
  if not found then raise exception 'OPEN_PLAY_NOT_FOUND'; end if;

  select status into v_status from open_play_participants
    where open_play_id = p_open_play and user_id = p_user;
  if v_status = 'confirmed' then return 'confirmed'; end if;

  if v_status is distinct from 'pending_payment' then
    select count(*) into v_active from open_play_participants
      where open_play_id = p_open_play and status in ('pending_payment', 'confirmed');
    if v_active >= v_quota then return 'no_seat'; end if;
  end if;

  insert into open_play_participants (open_play_id, user_id, status, payment_id, joined_at)
    values (p_open_play, p_user, 'confirmed', p_payment, now())
    on conflict (open_play_id, user_id)
    do update set status = 'confirmed', payment_id = excluded.payment_id;

  select count(*) into v_active from open_play_participants
    where open_play_id = p_open_play and status in ('pending_payment', 'confirmed');
  if v_active >= v_quota then
    update open_plays set status = 'full' where id = p_open_play and status = 'open';
  end if;
  return 'confirmed';
end $$;

revoke all on function open_play_join(uuid, uuid, int) from anon, authenticated;
revoke all on function open_play_leave(uuid, uuid) from anon, authenticated;
revoke all on function open_play_confirm(uuid, uuid, uuid) from anon, authenticated;
