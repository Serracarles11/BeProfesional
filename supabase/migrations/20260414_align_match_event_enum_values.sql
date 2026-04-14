do $$
begin
  if exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'tipo_evento_partido'
  ) then
    alter type public.tipo_evento_partido add value if not exists 'GOL';
    alter type public.tipo_evento_partido add value if not exists 'ASISTENCIA';
    alter type public.tipo_evento_partido add value if not exists 'AMARILLA';
    alter type public.tipo_evento_partido add value if not exists 'ROJA';
  end if;
end $$;
