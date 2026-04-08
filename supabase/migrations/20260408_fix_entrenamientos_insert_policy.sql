create or replace function public.usuario_puede_gestionar_entrenamientos(_equipo_id uuid)
returns boolean
language sql
stable
as $$
  select
    exists (
      select 1
      from public.miembros_equipo me
      where me.equipo_id = _equipo_id
        and me.usuario_id = auth.uid()
        and me.estado = 'ACTIVO'::estado_miembro
        and me.rol in ('ENTRENADOR'::rol_miembro_equipo, 'STAFF'::rol_miembro_equipo)
    )
    or exists (
      select 1
      from public.equipos e
      where e.id = _equipo_id
        and e.creado_por = auth.uid()
    );
$$;

alter table public.entrenamientos_equipo enable row level security;

drop policy if exists "crear entrenamientos si puedes gestionarlos" on public.entrenamientos_equipo;
create policy "crear entrenamientos si puedes gestionarlos"
on public.entrenamientos_equipo
for insert
with check (
  creado_por = auth.uid()
  and public.usuario_puede_gestionar_entrenamientos(equipo_id)
);
