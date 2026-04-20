create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensaje text,
  enlace text,
  leida boolean not null default false,
  creado_en timestamptz not null default now()
);

alter table public.notificaciones
  add column if not exists mensaje text,
  add column if not exists enlace text,
  add column if not exists leida boolean not null default false,
  add column if not exists creado_en timestamptz not null default now();

create index if not exists idx_notificaciones_usuario_creado
  on public.notificaciones(usuario_id, creado_en desc);

create index if not exists idx_notificaciones_usuario_leida
  on public.notificaciones(usuario_id, leida);

alter table public.notificaciones enable row level security;

drop policy if exists "leer notificaciones propias" on public.notificaciones;
create policy "leer notificaciones propias"
on public.notificaciones
for select
to authenticated
using (usuario_id = auth.uid());

drop policy if exists "actualizar notificaciones propias" on public.notificaciones;
create policy "actualizar notificaciones propias"
on public.notificaciones
for update
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;
