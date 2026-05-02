alter table public.partidos
  add column if not exists recordatorio_estadisticas_enviado_en timestamptz;
