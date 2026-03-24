alter table public.players
  add column if not exists minutes_total integer not null default 0,
  add column if not exists goals_total integer not null default 0,
  add column if not exists yellows_total integer not null default 0,
  add column if not exists starts_total integer not null default 0;
