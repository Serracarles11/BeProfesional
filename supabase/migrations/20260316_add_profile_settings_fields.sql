alter table public.perfiles
  add column if not exists foto_url text null,
  add column if not exists telefono text null,
  add column if not exists ciudad text null,
  add column if not exists pais text null,
  add column if not exists bio text null,
  add column if not exists instagram text null,
  add column if not exists objetivo text null;
