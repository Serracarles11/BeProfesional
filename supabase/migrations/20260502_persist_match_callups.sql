alter table public.participantes_partido
  add column if not exists convocado boolean not null default true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'participantes_partido'
      and column_name = 'jugador_id'
  ) then
    with ranked as (
      select
        id,
        row_number() over (
          partition by partido_id, jugador_id
          order by convocado desc, coalesce(minutos_jugados, 0) desc, id
        ) as rn
      from public.participantes_partido
      where jugador_id is not null
    )
    delete from public.participantes_partido pp
    using ranked
    where pp.id = ranked.id
      and ranked.rn > 1;

    create unique index if not exists participantes_partido_partido_jugador_unique
      on public.participantes_partido (partido_id, jugador_id)
      where jugador_id is not null;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'participantes_partido'
      and column_name = 'usuario_id'
  ) then
    with ranked as (
      select
        id,
        row_number() over (
          partition by partido_id, usuario_id
          order by convocado desc, coalesce(minutos_jugados, 0) desc, id
        ) as rn
      from public.participantes_partido
      where usuario_id is not null
    )
    delete from public.participantes_partido pp
    using ranked
    where pp.id = ranked.id
      and ranked.rn > 1;

    create unique index if not exists participantes_partido_partido_usuario_unique
      on public.participantes_partido (partido_id, usuario_id)
      where usuario_id is not null;
  end if;
end $$;
