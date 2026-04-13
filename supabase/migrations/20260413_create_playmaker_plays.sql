create table if not exists public.playmaker_plays (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  equipo_id uuid null references public.equipos(id) on delete set null,
  titulo text not null,
  draft jsonb not null,
  creado_en timestamptz not null default timezone('utc', now()),
  actualizado_en timestamptz not null default timezone('utc', now())
);

create index if not exists playmaker_plays_usuario_actualizado_idx
  on public.playmaker_plays (usuario_id, actualizado_en desc);

create index if not exists playmaker_plays_equipo_idx
  on public.playmaker_plays (equipo_id);

alter table public.playmaker_plays enable row level security;

drop policy if exists "leer jugadas playmaker propias" on public.playmaker_plays;
create policy "leer jugadas playmaker propias"
on public.playmaker_plays
for select
using (usuario_id = auth.uid());

drop policy if exists "crear jugadas playmaker propias" on public.playmaker_plays;
create policy "crear jugadas playmaker propias"
on public.playmaker_plays
for insert
with check (usuario_id = auth.uid());

drop policy if exists "actualizar jugadas playmaker propias" on public.playmaker_plays;
create policy "actualizar jugadas playmaker propias"
on public.playmaker_plays
for update
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

drop policy if exists "eliminar jugadas playmaker propias" on public.playmaker_plays;
create policy "eliminar jugadas playmaker propias"
on public.playmaker_plays
for delete
using (usuario_id = auth.uid());
