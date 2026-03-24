create unique index if not exists eventos_partido_external_event_unique
  on public.eventos_partido (partido_id, minuto, tipo, jugador_externo_id)
  where jugador_externo_id is not null;
