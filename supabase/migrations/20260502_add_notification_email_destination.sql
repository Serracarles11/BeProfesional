alter table public.notificaciones
  add column if not exists email_destino text;
