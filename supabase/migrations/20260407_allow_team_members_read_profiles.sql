alter table public.perfiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'perfiles'
      and policyname = 'Team members can read teammate profiles'
  ) then
    create policy "Team members can read teammate profiles"
      on public.perfiles
      for select
      to authenticated
      using (
        id = auth.uid()
        or exists (
          select 1
          from public.miembros_equipo me_self
          join public.miembros_equipo me_target
            on me_target.equipo_id = me_self.equipo_id
          where me_self.usuario_id = auth.uid()
            and me_self.estado = 'ACTIVO'
            and me_target.usuario_id = perfiles.id
            and me_target.estado = 'ACTIVO'
        )
      );
  end if;
end
$$;
