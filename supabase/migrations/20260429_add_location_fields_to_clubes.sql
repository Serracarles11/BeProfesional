alter table public.clubes
  add column if not exists ubicacion text,
  add column if not exists campo_juego text,
  add column if not exists direccion_campo text,
  add column if not exists ciudad text,
  add column if not exists provincia text,
  add column if not exists pais text;

with club_defaults as (
  select distinct on (club_id)
    club_id,
    ubicacion,
    campo_juego,
    direccion_campo,
    ciudad,
    provincia,
    pais
  from public.equipos
  where club_id is not null
    and (
      ubicacion is not null
      or campo_juego is not null
      or direccion_campo is not null
      or ciudad is not null
      or provincia is not null
      or pais is not null
    )
  order by
    club_id,
    case when campo_juego is not null or ciudad is not null then 0 else 1 end,
    nombre nulls last
)
update public.clubes c
set
  ubicacion = coalesce(c.ubicacion, d.ubicacion),
  campo_juego = coalesce(c.campo_juego, d.campo_juego),
  direccion_campo = coalesce(c.direccion_campo, d.direccion_campo),
  ciudad = coalesce(c.ciudad, d.ciudad),
  provincia = coalesce(c.provincia, d.provincia),
  pais = coalesce(c.pais, d.pais)
from club_defaults d
where c.id = d.club_id;

update public.clubes
set pais = coalesce(pais, 'España')
where pais is null;

drop policy if exists "clubes_update_owner_or_staff" on public.clubes;
create policy "clubes_update_owner_or_staff"
on public.clubes
for update
to authenticated
using (
  creado_por = auth.uid()
  or public.is_club_staff(id, auth.uid())
)
with check (
  creado_por = auth.uid()
  or public.is_club_staff(id, auth.uid())
);
