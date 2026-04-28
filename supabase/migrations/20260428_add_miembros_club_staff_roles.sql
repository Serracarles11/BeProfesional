create extension if not exists pgcrypto;

create table if not exists public.miembros_club (
  id uuid not null default gen_random_uuid(),
  club_id uuid not null,
  usuario_id uuid not null,
  rol text not null,
  estado text not null default 'ACTIVO',
  fecha_alta timestamp with time zone not null default now(),
  constraint miembros_club_pkey primary key (id),
  constraint miembros_club_club_id_fkey foreign key (club_id) references public.clubes(id) on delete cascade,
  constraint miembros_club_usuario_id_fkey foreign key (usuario_id) references public.perfiles(id) on delete cascade,
  constraint miembros_club_unique unique (club_id, usuario_id),
  constraint miembros_club_rol_check check (rol in ('ADMINISTRATIVO', 'DIRECTOR', 'COORDINADOR')),
  constraint miembros_club_estado_check check (estado in ('ACTIVO', 'INACTIVO'))
);

alter table public.miembros_club
  add column if not exists fecha_alta timestamp with time zone not null default now();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'miembros_club_rol_check'
      and conrelid = 'public.miembros_club'::regclass
  ) then
    alter table public.miembros_club drop constraint miembros_club_rol_check;
  end if;

  alter table public.miembros_club
    add constraint miembros_club_rol_check
    check (rol in ('ADMINISTRATIVO', 'DIRECTOR', 'COORDINADOR'))
    not valid;
exception
  when duplicate_object then null;
end $$;

create index if not exists miembros_club_usuario_idx on public.miembros_club (usuario_id);
create index if not exists miembros_club_club_idx on public.miembros_club (club_id);
create index if not exists miembros_club_staff_idx
  on public.miembros_club (usuario_id, estado, rol);

alter table public.miembros_club enable row level security;

create or replace function public.is_club_staff(
  p_club_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.miembros_club mc
    where mc.club_id = p_club_id
      and mc.usuario_id = p_user_id
      and mc.estado = 'ACTIVO'
      and mc.rol in ('ADMINISTRATIVO', 'DIRECTOR', 'COORDINADOR')
  );
$$;

drop policy if exists "miembros_club_select_own_staff" on public.miembros_club;
create policy "miembros_club_select_own_staff"
on public.miembros_club
for select
to authenticated
using (usuario_id = auth.uid());

drop policy if exists "miembros_club_insert_service_only" on public.miembros_club;
create policy "miembros_club_insert_service_only"
on public.miembros_club
for insert
to authenticated
with check (false);

drop policy if exists "miembros_club_update_service_only" on public.miembros_club;
create policy "miembros_club_update_service_only"
on public.miembros_club
for update
to authenticated
using (false)
with check (false);

do $$
begin
  if to_regclass('public.equipos') is not null then
    execute 'drop policy if exists "equipos_select_club_staff" on public.equipos';
    execute 'create policy "equipos_select_club_staff" on public.equipos for select to authenticated using (public.is_club_staff(club_id, auth.uid()))';
  end if;

  if to_regclass('public.miembros_equipo') is not null then
    execute 'drop policy if exists "miembros_equipo_select_club_staff" on public.miembros_equipo';
    execute 'create policy "miembros_equipo_select_club_staff" on public.miembros_equipo for select to authenticated using (exists (select 1 from public.equipos e where e.id = miembros_equipo.equipo_id and public.is_club_staff(e.club_id, auth.uid())))';
  end if;

  if to_regclass('public.perfiles') is not null then
    execute 'drop policy if exists "perfiles_select_club_staff_players" on public.perfiles';
    execute 'create policy "perfiles_select_club_staff_players" on public.perfiles for select to authenticated using (id = auth.uid() or exists (select 1 from public.miembros_equipo me join public.equipos e on e.id = me.equipo_id where me.usuario_id = perfiles.id and public.is_club_staff(e.club_id, auth.uid())))';
  end if;

  if to_regclass('public.entrenamientos_equipo') is not null then
    execute 'drop policy if exists "entrenamientos_equipo_select_club_staff" on public.entrenamientos_equipo';
    execute 'create policy "entrenamientos_equipo_select_club_staff" on public.entrenamientos_equipo for select to authenticated using (exists (select 1 from public.equipos e where e.id = entrenamientos_equipo.equipo_id and public.is_club_staff(e.club_id, auth.uid())))';
  end if;

  if to_regclass('public.partidos') is not null then
    execute 'drop policy if exists "partidos_select_club_staff" on public.partidos';
    execute 'create policy "partidos_select_club_staff" on public.partidos for select to authenticated using (exists (select 1 from public.equipos e where e.id = partidos.equipo_id and public.is_club_staff(e.club_id, auth.uid())))';
  end if;

  if to_regclass('public.home_bienestar_diario') is not null then
    execute 'drop policy if exists "home_bienestar_diario_select_club_staff" on public.home_bienestar_diario';
    execute 'create policy "home_bienestar_diario_select_club_staff" on public.home_bienestar_diario for select to authenticated using (exists (select 1 from public.equipos e where e.id = home_bienestar_diario.equipo_id and public.is_club_staff(e.club_id, auth.uid())))';
  end if;

  if to_regclass('public.checkins_diarios') is not null then
    execute 'drop policy if exists "checkins_diarios_select_club_staff" on public.checkins_diarios';
    execute 'create policy "checkins_diarios_select_club_staff" on public.checkins_diarios for select to authenticated using (exists (select 1 from public.equipos e where e.id = checkins_diarios.equipo_id and public.is_club_staff(e.club_id, auth.uid())))';
  end if;

  if to_regclass('public.registros_actividad') is not null then
    execute 'drop policy if exists "registros_actividad_select_club_staff" on public.registros_actividad';
    execute 'create policy "registros_actividad_select_club_staff" on public.registros_actividad for select to authenticated using (exists (select 1 from public.equipos e where e.id = registros_actividad.equipo_id and public.is_club_staff(e.club_id, auth.uid())))';
  end if;
end $$;

grant execute on function public.is_club_staff(uuid, uuid) to authenticated;

-- Alta manual de staff de club desde Supabase SQL:
-- insert into public.miembros_club (club_id, usuario_id, rol)
-- values ('CLUB_ID', 'USER_ID', 'ADMINISTRATIVO')
-- on conflict (club_id, usuario_id)
-- do update set rol = excluded.rol, estado = 'ACTIVO';
