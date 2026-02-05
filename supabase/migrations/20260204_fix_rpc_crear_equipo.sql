create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'miembros_equipo'
      and con.contype = 'u'
      and (
        select array_agg(att.attname order by att.attname)
        from unnest(con.conkey) as ck(attnum)
        join pg_attribute att
          on att.attrelid = rel.oid
         and att.attnum = ck.attnum
      ) = array['equipo_id', 'usuario_id']
  ) then
    alter table public.miembros_equipo
      add constraint miembros_equipo_equipo_id_usuario_id_unique
      unique (equipo_id, usuario_id);
  end if;
end $$;

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'crear_equipo_con_codigos'
  loop
    execute format('drop function if exists %s', fn.sig);
  end loop;
end $$;

create or replace function public.generar_codigo_invitacion()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text;
begin
  v_raw := upper(encode(gen_random_bytes(4), 'hex'));
  return substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4);
end;
$$;

create or replace function public.crear_equipo_con_codigos(
  p_nombre text,
  p_club text,
  p_categoria text,
  p_temporada text,
  p_usos_jugadores int,
  p_usos_entrenador int
)
returns table (
  equipo_id uuid,
  codigo_entrenador text,
  codigo_jugadores text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_code_coach text;
  v_code_player text;
begin
  if auth.uid() is null then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  if coalesce(trim(p_nombre), '') = '' then
    raise exception 'El nombre del equipo es obligatorio' using errcode = '22023';
  end if;

  insert into public.equipos (nombre, club, categoria, temporada, creado_por)
  values (
    trim(p_nombre),
    nullif(trim(p_club), ''),
    nullif(trim(p_categoria), ''),
    nullif(trim(p_temporada), ''),
    auth.uid()
  )
  returning id into v_equipo_id;

  insert into public.miembros_equipo (equipo_id, usuario_id, rol)
  values (v_equipo_id, auth.uid(), 'ENTRENADOR')
  on conflict (equipo_id, usuario_id)
  do update set rol = excluded.rol;

  loop
    v_code_coach := public.generar_codigo_invitacion();
    exit when not exists (
      select 1
      from public.codigos_invitacion_equipo c
      where c.codigo = v_code_coach
    );
  end loop;

  loop
    v_code_player := public.generar_codigo_invitacion();
    exit when not exists (
      select 1
      from public.codigos_invitacion_equipo c
      where c.codigo = v_code_player
    );
  end loop;

  insert into public.codigos_invitacion_equipo (
    equipo_id,
    codigo,
    rol_asignado,
    usos_maximos,
    usos_actuales,
    activo,
    creado_por
  )
  values (
    v_equipo_id,
    v_code_coach,
    'ENTRENADOR',
    greatest(coalesce(p_usos_entrenador, 3), 1),
    0,
    true,
    auth.uid()
  );

  insert into public.codigos_invitacion_equipo (
    equipo_id,
    codigo,
    rol_asignado,
    usos_maximos,
    usos_actuales,
    activo,
    creado_por
  )
  values (
    v_equipo_id,
    v_code_player,
    'JUGADOR',
    greatest(coalesce(p_usos_jugadores, 30), 1),
    0,
    true,
    auth.uid()
  );

  return query
  select v_equipo_id, v_code_coach, v_code_player;
end;
$$;

grant execute on function public.generar_codigo_invitacion() to authenticated;
grant execute on function public.crear_equipo_con_codigos(text, text, text, text, int, int) to authenticated;

-- select pg_get_functiondef('public.crear_equipo_con_codigos(text,text,text,text,int,int)'::regprocedure);
