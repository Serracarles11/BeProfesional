create table if not exists public.entrenamiento_asistencias (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  entrenamiento_id uuid not null references public.entrenamientos_equipo(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  asiste boolean not null,
  actualizado_en timestamptz not null default now(),
  unique (entrenamiento_id, usuario_id)
);

create index if not exists idx_entrenamiento_asistencias_entrenamiento
  on public.entrenamiento_asistencias(entrenamiento_id);

create index if not exists idx_entrenamiento_asistencias_usuario
  on public.entrenamiento_asistencias(usuario_id);

alter table public.entrenamiento_asistencias enable row level security;

drop policy if exists "leer asistencias de entrenamientos visibles" on public.entrenamiento_asistencias;
create policy "leer asistencias de entrenamientos visibles"
on public.entrenamiento_asistencias
for select
using (
  exists (
    select 1
    from public.entrenamientos_equipo te
    where te.id = entrenamiento_asistencias.entrenamiento_id
      and public.usuario_puede_ver_entrenamientos(te.equipo_id)
  )
);

drop policy if exists "crear o actualizar asistencia propia" on public.entrenamiento_asistencias;
create policy "crear o actualizar asistencia propia"
on public.entrenamiento_asistencias
for insert
with check (
  usuario_id = auth.uid()
  and exists (
    select 1
    from public.entrenamientos_equipo te
    where te.id = entrenamiento_asistencias.entrenamiento_id
      and public.usuario_puede_ver_entrenamientos(te.equipo_id)
  )
);

drop policy if exists "actualizar asistencia propia" on public.entrenamiento_asistencias;
create policy "actualizar asistencia propia"
on public.entrenamiento_asistencias
for update
using (
  usuario_id = auth.uid()
)
with check (
  usuario_id = auth.uid()
  and exists (
    select 1
    from public.entrenamientos_equipo te
    where te.id = entrenamiento_asistencias.entrenamiento_id
      and public.usuario_puede_ver_entrenamientos(te.equipo_id)
  )
);

drop policy if exists "eliminar asistencias de entrenamientos gestionables" on public.entrenamiento_asistencias;
create policy "eliminar asistencias de entrenamientos gestionables"
on public.entrenamiento_asistencias
for delete
using (
  exists (
    select 1
    from public.entrenamientos_equipo te
    where te.id = entrenamiento_asistencias.entrenamiento_id
      and public.usuario_puede_gestionar_entrenamientos(te.equipo_id)
  )
);
