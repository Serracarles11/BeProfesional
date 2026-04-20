alter table public.entrenamientos_equipo
  add column if not exists creado_como_fijo boolean not null default false,
  add column if not exists grupo_fijo_id uuid;

create index if not exists idx_entrenamientos_equipo_fijos
  on public.entrenamientos_equipo(equipo_id, creado_como_fijo, fecha);
