create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'miembros_equipo'
      and c.contype = 'u'
      and c.conname = 'miembros_equipo_equipo_id_usuario_id_key'
  ) then
    alter table public.miembros_equipo
      add constraint miembros_equipo_equipo_id_usuario_id_key
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
  raw text;
begin
  raw := upper(encode(gen_random_bytes(4), 'hex'));
  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
end;
$$;

create function public.crear_equipo_con_codigos(
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
  v_role_col text;
  v_max_col text;
  v_used_col text;
  v_active_col text;
  v_created_by_col text;
  v_sql text;
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
  values (v_equipo_id, auth.uid(), 'entrenador')
  on conflict (equipo_id, usuario_id)
  do update set rol = excluded.rol;

  loop
    v_code_coach := public.generar_codigo_invitacion();
    exit when not exists (
      select 1
      from public.codigos_invitacion_equipo cie
      where cie.codigo = v_code_coach
    );
  end loop;

  loop
    v_code_player := public.generar_codigo_invitacion();
    exit when not exists (
      select 1
      from public.codigos_invitacion_equipo cie
      where cie.codigo = v_code_player
    );
  end loop;

  select c.column_name
  into v_role_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'codigos_invitacion_equipo'
    and c.column_name in ('rol', 'rol_invitado', 'rol_objetivo', 'tipo')
  order by case c.column_name
    when 'rol' then 1
    when 'rol_invitado' then 2
    when 'rol_objetivo' then 3
    when 'tipo' then 4
    else 99
  end
  limit 1;

  select c.column_name
  into v_max_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'codigos_invitacion_equipo'
    and c.column_name in ('usos_maximos', 'max_usos', 'usos_permitidos')
  order by case c.column_name
    when 'usos_maximos' then 1
    when 'max_usos' then 2
    when 'usos_permitidos' then 3
    else 99
  end
  limit 1;

  select c.column_name
  into v_used_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'codigos_invitacion_equipo'
    and c.column_name in ('usos_actuales', 'usos_usados', 'usos')
  order by case c.column_name
    when 'usos_actuales' then 1
    when 'usos_usados' then 2
    when 'usos' then 3
    else 99
  end
  limit 1;

  select c.column_name
  into v_active_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'codigos_invitacion_equipo'
    and c.column_name in ('activo', 'esta_activo')
  order by case c.column_name
    when 'activo' then 1
    when 'esta_activo' then 2
    else 99
  end
  limit 1;

  select c.column_name
  into v_created_by_col
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'codigos_invitacion_equipo'
    and c.column_name in ('creado_por', 'created_by')
  order by case c.column_name
    when 'creado_por' then 1
    when 'created_by' then 2
    else 99
  end
  limit 1;

  v_sql := 'insert into public.codigos_invitacion_equipo (equipo_id, codigo';
  if v_role_col is not null then v_sql := v_sql || format(', %I', v_role_col); end if;
  if v_max_col is not null then v_sql := v_sql || format(', %I', v_max_col); end if;
  if v_used_col is not null then v_sql := v_sql || format(', %I', v_used_col); end if;
  if v_active_col is not null then v_sql := v_sql || format(', %I', v_active_col); end if;
  if v_created_by_col is not null then v_sql := v_sql || format(', %I', v_created_by_col); end if;
  v_sql := v_sql || ') values (';
  v_sql := v_sql || format('%L::uuid, %L', v_equipo_id::text, v_code_coach);
  if v_role_col is not null then v_sql := v_sql || format(', %L', 'entrenador'); end if;
  if v_max_col is not null then v_sql := v_sql || format(', %s', greatest(coalesce(p_usos_entrenador, 3), 1)); end if;
  if v_used_col is not null then v_sql := v_sql || ', 0'; end if;
  if v_active_col is not null then v_sql := v_sql || ', true'; end if;
  if v_created_by_col is not null then v_sql := v_sql || format(', %L::uuid', auth.uid()::text); end if;
  v_sql := v_sql || ')';
  execute v_sql;

  v_sql := 'insert into public.codigos_invitacion_equipo (equipo_id, codigo';
  if v_role_col is not null then v_sql := v_sql || format(', %I', v_role_col); end if;
  if v_max_col is not null then v_sql := v_sql || format(', %I', v_max_col); end if;
  if v_used_col is not null then v_sql := v_sql || format(', %I', v_used_col); end if;
  if v_active_col is not null then v_sql := v_sql || format(', %I', v_active_col); end if;
  if v_created_by_col is not null then v_sql := v_sql || format(', %I', v_created_by_col); end if;
  v_sql := v_sql || ') values (';
  v_sql := v_sql || format('%L::uuid, %L', v_equipo_id::text, v_code_player);
  if v_role_col is not null then v_sql := v_sql || format(', %L', 'jugador'); end if;
  if v_max_col is not null then v_sql := v_sql || format(', %s', greatest(coalesce(p_usos_jugadores, 30), 1)); end if;
  if v_used_col is not null then v_sql := v_sql || ', 0'; end if;
  if v_active_col is not null then v_sql := v_sql || ', true'; end if;
  if v_created_by_col is not null then v_sql := v_sql || format(', %L::uuid', auth.uid()::text); end if;
  v_sql := v_sql || ')';
  execute v_sql;

  return query
  select v_equipo_id, v_code_coach, v_code_player;
end;
$$;

grant execute on function public.generar_codigo_invitacion() to authenticated;
grant execute on function public.crear_equipo_con_codigos(text, text, text, text, int, int) to authenticated;
