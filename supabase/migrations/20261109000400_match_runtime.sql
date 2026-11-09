-- modul: match
-- Status berjalan (waktu lanjut terakhir, jatah time out dan hydration terpakai) disimpan terpisah dari settings,
-- supaya edit setting oleh Coach tidak bisa menimpa penghitung. Satu bracket match hanya punya satu match.
alter table matches add column runtime jsonb not null default '{}';

create unique index matches_bracket_match_uidx on matches (bracket_match_id) where bracket_match_id is not null;
create index matches_created_by_idx on matches (created_by);
