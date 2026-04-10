create or replace function public.usuario_pertenece_equipo_chat(_equipo_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.miembros_equipo me
    where me.equipo_id = _equipo_id
      and me.usuario_id = auth.uid()
      and me.estado = 'ACTIVO'::estado_miembro
  );
$$;

alter table public.chats enable row level security;
alter table public.chat_mensajes enable row level security;
alter table public.chat_mensajes_guardados enable row level security;

drop policy if exists "leer chats si eres miembro activo del equipo" on public.chats;
create policy "leer chats si eres miembro activo del equipo"
on public.chats
for select
using (
  public.usuario_pertenece_equipo_chat(equipo_id)
);

drop policy if exists "crear chats si eres miembro activo del equipo" on public.chats;
create policy "crear chats si eres miembro activo del equipo"
on public.chats
for insert
with check (
  creado_por = auth.uid()
  and public.usuario_pertenece_equipo_chat(equipo_id)
);

drop policy if exists "leer mensajes de chats del equipo" on public.chat_mensajes;
create policy "leer mensajes de chats del equipo"
on public.chat_mensajes
for select
using (
  exists (
    select 1
    from public.chats c
    where c.id = chat_mensajes.chat_id
      and public.usuario_pertenece_equipo_chat(c.equipo_id)
  )
);

drop policy if exists "crear mensajes en chats del equipo" on public.chat_mensajes;
create policy "crear mensajes en chats del equipo"
on public.chat_mensajes
for insert
with check (
  emisor_id = auth.uid()
  and exists (
    select 1
    from public.chats c
    where c.id = chat_mensajes.chat_id
      and public.usuario_pertenece_equipo_chat(c.equipo_id)
  )
);

drop policy if exists "leer guardados propios en chats del equipo" on public.chat_mensajes_guardados;
create policy "leer guardados propios en chats del equipo"
on public.chat_mensajes_guardados
for select
using (
  usuario_id = auth.uid()
  and exists (
    select 1
    from public.chat_mensajes m
    join public.chats c on c.id = m.chat_id
    where m.id = chat_mensajes_guardados.mensaje_id
      and public.usuario_pertenece_equipo_chat(c.equipo_id)
  )
);

drop policy if exists "crear guardados propios en chats del equipo" on public.chat_mensajes_guardados;
create policy "crear guardados propios en chats del equipo"
on public.chat_mensajes_guardados
for insert
with check (
  usuario_id = auth.uid()
  and exists (
    select 1
    from public.chat_mensajes m
    join public.chats c on c.id = m.chat_id
    where m.id = chat_mensajes_guardados.mensaje_id
      and public.usuario_pertenece_equipo_chat(c.equipo_id)
  )
);

drop policy if exists "eliminar guardados propios en chats del equipo" on public.chat_mensajes_guardados;
create policy "eliminar guardados propios en chats del equipo"
on public.chat_mensajes_guardados
for delete
using (
  usuario_id = auth.uid()
);
