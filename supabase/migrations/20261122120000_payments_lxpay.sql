-- modul: payments. Instruksi bayar QRIS dari gateway LxPay (leonxlab.app).
-- Payload QR dan masa berlaku disimpan supaya halaman status bisa menampilkan
-- ulang QR setelah refresh, tanpa membuat transaksi baru.
alter table payments add column qris_payload text;
alter table payments add column qris_amount_with_code bigint;
alter table payments add column qris_expires_at timestamptz;
