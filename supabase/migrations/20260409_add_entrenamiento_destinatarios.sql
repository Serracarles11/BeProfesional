create table if not exists public.entrenamiento_destinatarios (
  id uuid primary key default gen_random_uuid(),
  entrenamiento_id uuid not null references public.entrenamientos_equipo(id) on delete cascade,
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  unique (entrenamiento_id, usuario_id)
);

create index if not exists idx_entrenamiento_destinatarios_entrenamiento
  on public.entrenamiento_destinatarios(entrenamiento_id);

create index if not exists idx_entrenamiento_destinatarios_usuario
  on public.entrenamiento_destinatarios(usuario_id);

alter table public.entrenamiento_destinatarios enable row level security;

drop policy if exists "leer destinatarios de entrenamientos visibles" on public.entrenamiento_destinatarios;
create policy "leer destinatarios de entrenamientos visibles"
on public.entrenamiento_destinatarios
for select
using (
  exists (
    select 1
    from public.entrenamientos_equipo te
    where te.id = entrenamiento_destinatarios.entrenamiento_id
      and public.usuario_puede_ver_entrenamientos(te.equipo_id)
  )
);

drop policy if exists "crear destinatarios de entrenamientos gestionables" on public.entrenamiento_destinatarios;
create policy "crear destinatarios de entrenamientos gestionables"
on public.entrenamiento_destinatarios
for insert
with check (
  exists (
    select 1
    from public.entrenamientos_equipo te
    where te.id = entrenamiento_destinatarios.entrenamiento_id
      and public.usuario_puede_gestionar_entrenamientos(te.equipo_id)
  )
);

drop policy if exists "eliminar destinatarios de entrenamientos gestionables" on public.entrenamiento_destinatarios;
create policy "eliminar destinatarios de entrenamientos gestionables"
on public.entrenamiento_destinatarios
for delete
using (
  exists (
    select 1
    from public.entrenamientos_equipo te
    where te.id = entrenamiento_destinatarios.entrenamiento_id
      and public.usuario_puede_gestionar_entrenamientos(te.equipo_id)
  )
);
