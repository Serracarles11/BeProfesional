create extension if not exists pgcrypto;

create table if not exists public.clubes (
  id uuid not null default gen_random_uuid(),
  nombre text not null,
  creado_por uuid not null,
  creado_en timestamp with time zone not null default now(),
  constraint clubes_pkey primary key (id),
  constraint clubes_creado_por_fkey foreign key (creado_por) references public.perfiles(id)
);

alter table public.equipos
  add column if not exists club_id uuid,
  add column if not exists categoria_anio text,
  add column if not exists ubicacion text,
  add column if not exists campo_juego text,
  add column if not exists direccion_campo text,
  add column if not exists ciudad text,
  add column if not exists provincia text,
  add column if not exists pais text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'equipos_club_id_fkey'
      and conrelid = 'public.equipos'::regclass
  ) then
    alter table public.equipos
      add constraint equipos_club_id_fkey
      foreign key (club_id) references public.clubes(id);
  end if;
end $$;

create index if not exists clubes_nombre_idx on public.clubes (nombre);
create index if not exists equipos_club_id_idx on public.equipos (club_id);

alter table public.clubes enable row level security;

drop policy if exists "clubes_select_authenticated" on public.clubes;
create policy "clubes_select_authenticated"
on public.clubes
for select
to authenticated
using (true);

drop policy if exists "clubes_insert_authenticated_owner" on public.clubes;
create policy "clubes_insert_authenticated_owner"
on public.clubes
for insert
to authenticated
with check (creado_por = auth.uid());
