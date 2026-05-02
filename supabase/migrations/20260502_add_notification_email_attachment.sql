alter table public.notificaciones
  add column if not exists email_adjunto_nombre text,
  add column if not exists email_adjunto_base64 text;
