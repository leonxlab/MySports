-- modul: payments. Operasi saldo atomik. Dipanggil backend lewat rpc dengan service role.

-- Teruskan dana pembayaran yang sudah `paid` ke saldo penerima, sekali saja.
create or replace function payments_settle(p_payment_id uuid, p_payee uuid, p_credit numeric)
returns void language plpgsql as $$
declare v_status text;
begin
  select status into v_status from payments where id = p_payment_id for update;
  if v_status is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_status <> 'paid' then raise exception 'PAYMENT_NOT_PAID'; end if;

  update payments set status = 'settled' where id = p_payment_id;
  insert into wallets (user_id, balance) values (p_payee, p_credit)
    on conflict (user_id) do update set balance = wallets.balance + excluded.balance;
  insert into wallet_entries (user_id, payment_id, kind, amount)
    values (p_payee, p_payment_id, 'credit', p_credit);
end $$;

-- Tarik saldo: kurangi saldo, catat penarikan dan buku besar dalam satu transaksi.
create or replace function wallet_withdraw(p_user uuid, p_amount numeric, p_fee numeric)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_amount <= 0 or p_fee < 0 or p_fee > p_amount then raise exception 'INVALID_AMOUNT'; end if;

  update wallets set balance = balance - p_amount where user_id = p_user and balance >= p_amount;
  if not found then raise exception 'INSUFFICIENT_BALANCE'; end if;

  insert into withdrawals (user_id, amount, fee_amount) values (p_user, p_amount, p_fee) returning id into v_id;
  insert into wallet_entries (user_id, kind, amount) values (p_user, 'withdraw', -p_amount);
  return v_id;
end $$;

revoke all on function payments_settle(uuid, uuid, numeric) from anon, authenticated;
revoke all on function wallet_withdraw(uuid, numeric, numeric) from anon, authenticated;
