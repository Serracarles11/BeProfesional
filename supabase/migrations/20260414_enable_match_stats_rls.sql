alter table public.participantes_partido enable row level security;
alter table public.eventos_partido enable row level security;

drop policy if exists "leer participantes de partidos del equipo" on public.participantes_partido;
create policy "leer participantes de partidos del equipo"
on public.participantes_partido
for select
using (
  exists (
    select 1
    from public.partidos p
    join public.miembros_equipo me
      on me.equipo_id = p.equipo_id
    where p.id = participantes_partido.partido_id
      and me.usuario_id = auth.uid()
      and me.estado = 'ACTIVO'::estado_miembro
  )
);

drop policy if exists "leer eventos de partidos del equipo" on public.eventos_partido;
create policy "leer eventos de partidos del equipo"
on public.eventos_partido
for select
using (
  exists (
    select 1
    from public.partidos p
    join public.miembros_equipo me
      on me.equipo_id = p.equipo_id
    where p.id = eventos_partido.partido_id
      and me.usuario_id = auth.uid()
      and me.estado = 'ACTIVO'::estado_miembro
  )
);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'participantes_partido'
      and column_name = 'jugador_id'
  ) then
    execute $sql$
      drop policy if exists "insertar participacion propia en partido" on public.participantes_partido;
      create policy "insertar participacion propia en partido"
      on public.participantes_partido
      for insert
      with check (
        jugador_id = auth.uid()
        and exists (
          select 1
          from public.partidos p
          join public.miembros_equipo me
            on me.equipo_id = p.equipo_id
          where p.id = participantes_partido.partido_id
            and me.usuario_id = auth.uid()
            and me.estado = 'ACTIVO'::estado_miembro
        )
      );

      drop policy if exists "actualizar participacion propia en partido" on public.participantes_partido;
      create policy "actualizar participacion propia en partido"
      on public.participantes_partido
      for update
      using (
        jugador_id = auth.uid()
      )
      with check (
        jugador_id = auth.uid()
        and exists (
          select 1
          from public.partidos p
          join public.miembros_equipo me
            on me.equipo_id = p.equipo_id
          where p.id = participantes_partido.partido_id
            and me.usuario_id = auth.uid()
            and me.estado = 'ACTIVO'::estado_miembro
        )
      );
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'participantes_partido'
      and column_name = 'usuario_id'
  ) then
    execute $sql$
      drop policy if exists "insertar participacion propia en partido" on public.participantes_partido;
      create policy "insertar participacion propia en partido"
      on public.participantes_partido
      for insert
      with check (
        usuario_id = auth.uid()
        and exists (
          select 1
          from public.partidos p
          join public.miembros_equipo me
            on me.equipo_id = p.equipo_id
          where p.id = participantes_partido.partido_id
            and me.usuario_id = auth.uid()
            and me.estado = 'ACTIVO'::estado_miembro
        )
      );

      drop policy if exists "actualizar participacion propia en partido" on public.participantes_partido;
      create policy "actualizar participacion propia en partido"
      on public.participantes_partido
      for update
      using (
        usuario_id = auth.uid()
      )
      with check (
        usuario_id = auth.uid()
        and exists (
          select 1
          from public.partidos p
          join public.miembros_equipo me
            on me.equipo_id = p.equipo_id
          where p.id = participantes_partido.partido_id
            and me.usuario_id = auth.uid()
            and me.estado = 'ACTIVO'::estado_miembro
        )
      );
    $sql$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'eventos_partido'
      and column_name = 'jugador_id'
  ) then
    execute $sql$
      drop policy if exists "insertar eventos propios en partido" on public.eventos_partido;
      create policy "insertar eventos propios en partido"
      on public.eventos_partido
      for insert
      with check (
        jugador_id = auth.uid()
        and exists (
          select 1
          from public.partidos p
          join public.miembros_equipo me
            on me.equipo_id = p.equipo_id
          where p.id = eventos_partido.partido_id
            and me.usuario_id = auth.uid()
            and me.estado = 'ACTIVO'::estado_miembro
        )
      );

      drop policy if exists "actualizar eventos propios en partido" on public.eventos_partido;
      create policy "actualizar eventos propios en partido"
      on public.eventos_partido
      for update
      using (
        jugador_id = auth.uid()
      )
      with check (
        jugador_id = auth.uid()
        and exists (
          select 1
          from public.partidos p
          join public.miembros_equipo me
            on me.equipo_id = p.equipo_id
          where p.id = eventos_partido.partido_id
            and me.usuario_id = auth.uid()
            and me.estado = 'ACTIVO'::estado_miembro
        )
      );

      drop policy if exists "eliminar eventos propios en partido" on public.eventos_partido;
      create policy "eliminar eventos propios en partido"
      on public.eventos_partido
      for delete
      using (
        jugador_id = auth.uid()
      );
    $sql$;
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'eventos_partido'
      and column_name = 'usuario_id'
  ) then
    execute $sql$
      drop policy if exists "insertar eventos propios en partido" on public.eventos_partido;
      create policy "insertar eventos propios en partido"
      on public.eventos_partido
      for insert
      with check (
        usuario_id = auth.uid()
        and exists (
          select 1
          from public.partidos p
          join public.miembros_equipo me
            on me.equipo_id = p.equipo_id
          where p.id = eventos_partido.partido_id
            and me.usuario_id = auth.uid()
            and me.estado = 'ACTIVO'::estado_miembro
        )
      );

      drop policy if exists "actualizar eventos propios en partido" on public.eventos_partido;
      create policy "actualizar eventos propios en partido"
      on public.eventos_partido
      for update
      using (
        usuario_id = auth.uid()
      )
      with check (
        usuario_id = auth.uid()
        and exists (
          select 1
          from public.partidos p
          join public.miembros_equipo me
            on me.equipo_id = p.equipo_id
          where p.id = eventos_partido.partido_id
            and me.usuario_id = auth.uid()
            and me.estado = 'ACTIVO'::estado_miembro
        )
      );

      drop policy if exists "eliminar eventos propios en partido" on public.eventos_partido;
      create policy "eliminar eventos propios en partido"
      on public.eventos_partido
      for delete
      using (
        usuario_id = auth.uid()
      );
    $sql$;
  end if;
end $$;
