-- modul: scoring
-- Usulan AI bisa belum tahu tim pencetak (warna baju belum dipetakan ke home/away, dan kok/bola
-- tanpa sisi). Coach memilih tim saat konfirmasi. Kejadian yang dihitung ke skor tetap wajib punya tim.
alter table score_events alter column team drop not null;
alter table score_events
  add constraint score_events_team_required
  check (team is not null or status in ('suggested', 'voided'));

-- Statistik per pemain (GET /scoring/users/:userId/stats) dan per match.
create index score_events_scorer_idx on score_events (scorer_id) where scorer_id is not null;
create index fouls_match_idx on fouls (match_id);
create index fouls_player_idx on fouls (player_id);
