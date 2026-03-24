create extension if not exists pgcrypto;

create table if not exists public.jugadores_externos (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  external_id text null,
  nombre text not null,
  dorsal integer null,
  posicion text null,
  fuente text not null default 'ffib',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipo_id, nombre)
);

create table if not exists public.import_runs (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  categoria text not null,
  last_run_at timestamptz null,
  status text not null default 'pending',
  details jsonb not null default '{}'::jsonb
);

create unique index if not exists import_runs_equipo_categoria_unique
  on public.import_runs (equipo_id, categoria);

alter table public.participantes_partido
  add column if not exists jugador_externo_id uuid null references public.jugadores_externos(id) on delete set null;

create unique index if not exists participantes_partido_partido_jugador_externo_unique
  on public.participantes_partido (partido_id, jugador_externo_id)
  where jugador_externo_id is not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'participantes_partido'
      and column_name = 'jugador_id'
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'participantes_partido_player_or_external_check'
    ) then
      alter table public.participantes_partido
        add constraint participantes_partido_player_or_external_check
        check (num_nonnulls(jugador_id, jugador_externo_id) = 1);
    end if;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'participantes_partido'
      and column_name = 'usuario_id'
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'participantes_partido_player_or_external_check'
    ) then
      alter table public.participantes_partido
        add constraint participantes_partido_player_or_external_check
        check (num_nonnulls(usuario_id, jugador_externo_id) = 1);
    end if;
  end if;
end $$;

alter table public.eventos_partido
  add column if not exists jugador_externo_id uuid null references public.jugadores_externos(id) on delete set null,
  add column if not exists jugador_externo_relacionado_id uuid null references public.jugadores_externos(id) on delete set null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'eventos_partido'
      and column_name = 'jugador_id'
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'eventos_partido_player_or_external_check'
    ) then
      alter table public.eventos_partido
        add constraint eventos_partido_player_or_external_check
        check (num_nonnulls(jugador_id, jugador_externo_id) = 1);
    end if;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'eventos_partido_related_player_single_source_check'
  ) then
    alter table public.eventos_partido
      add constraint eventos_partido_related_player_single_source_check
      check (num_nonnulls(jugador_relacionado_id, jugador_externo_relacionado_id) <= 1);
  end if;
end $$;
