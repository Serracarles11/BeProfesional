create table if not exists public.home_bienestar_diario (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  fecha date not null,
  estado_mental smallint check (estado_mental is null or estado_mental between 1 and 10),
  fatiga smallint check (fatiga is null or fatiga between 1 and 10),
  asiste_entrenamiento boolean,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (equipo_id, usuario_id, fecha)
);

create index if not exists idx_home_bienestar_equipo_fecha
  on public.home_bienestar_diario(equipo_id, fecha);

create index if not exists idx_home_bienestar_usuario_fecha
  on public.home_bienestar_diario(usuario_id, fecha);

create index if not exists idx_home_bienestar_asistencia
  on public.home_bienestar_diario(equipo_id, fecha, asiste_entrenamiento);

alter table public.home_bienestar_diario enable row level security;

drop policy if exists "leer bienestar si eres miembro activo del equipo" on public.home_bienestar_diario;
create policy "leer bienestar si eres miembro activo del equipo"
on public.home_bienestar_diario
for select
using (
  exists (
    select 1
    from public.miembros_equipo me
    where me.equipo_id = home_bienestar_diario.equipo_id
      and me.usuario_id = auth.uid()
      and me.estado = 'ACTIVO'::estado_miembro
  )
);

drop policy if exists "insertar bienestar propio del dia" on public.home_bienestar_diario;
create policy "insertar bienestar propio del dia"
on public.home_bienestar_diario
for insert
with check (
  usuario_id = auth.uid()
  and exists (
    select 1
    from public.miembros_equipo me
    where me.equipo_id = home_bienestar_diario.equipo_id
      and me.usuario_id = auth.uid()
      and me.estado = 'ACTIVO'::estado_miembro
  )
);

drop policy if exists "actualizar bienestar propio del dia" on public.home_bienestar_diario;
create policy "actualizar bienestar propio del dia"
on public.home_bienestar_diario
for update
using (
  usuario_id = auth.uid()
)
with check (
  usuario_id = auth.uid()
  and exists (
    select 1
    from public.miembros_equipo me
    where me.equipo_id = home_bienestar_diario.equipo_id
      and me.usuario_id = auth.uid()
      and me.estado = 'ACTIVO'::estado_miembro
  )
);
