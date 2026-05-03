alter table public.notificaciones
  add column if not exists asunto text;

create table if not exists public.daily_wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  fecha date not null default current_date,
  fatiga integer null,
  estado_mental integer null,
  comentario text null,
  respondido boolean not null default false,
  responded_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_wellness_checkins_usuario_fecha_key unique (usuario_id, fecha),
  constraint daily_wellness_checkins_fatiga_check check (fatiga is null or fatiga between 1 and 10),
  constraint daily_wellness_checkins_estado_mental_check check (estado_mental is null or estado_mental between 1 and 10)
);

create index if not exists idx_daily_wellness_checkins_usuario_fecha
  on public.daily_wellness_checkins(usuario_id, fecha desc);

create or replace function public.set_daily_wellness_checkins_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_daily_wellness_checkins_updated_at on public.daily_wellness_checkins;
create trigger trg_daily_wellness_checkins_updated_at
before update on public.daily_wellness_checkins
for each row
execute function public.set_daily_wellness_checkins_updated_at();

alter table public.daily_wellness_checkins enable row level security;

drop policy if exists "daily wellness select own" on public.daily_wellness_checkins;
create policy "daily wellness select own"
on public.daily_wellness_checkins
for select
to authenticated
using (usuario_id = auth.uid());

drop policy if exists "daily wellness insert own" on public.daily_wellness_checkins;
create policy "daily wellness insert own"
on public.daily_wellness_checkins
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "daily wellness update own" on public.daily_wellness_checkins;
create policy "daily wellness update own"
on public.daily_wellness_checkins
for update
to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

drop policy if exists "daily wellness service role all" on public.daily_wellness_checkins;
create policy "daily wellness service role all"
on public.daily_wellness_checkins
for all
to service_role
using (true)
with check (true);
