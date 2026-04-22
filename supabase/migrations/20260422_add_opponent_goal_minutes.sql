alter table public.partidos
  add column if not exists goles_contra_minutos integer[] not null default '{}'::integer[];
