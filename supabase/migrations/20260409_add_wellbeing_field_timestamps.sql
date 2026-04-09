alter table public.home_bienestar_diario
  add column if not exists estado_mental_actualizado_en timestamptz,
  add column if not exists fatiga_actualizada_en timestamptz;

update public.home_bienestar_diario
set estado_mental_actualizado_en = coalesce(estado_mental_actualizado_en, actualizado_en)
where estado_mental is not null;

update public.home_bienestar_diario
set fatiga_actualizada_en = coalesce(fatiga_actualizada_en, actualizado_en)
where fatiga is not null;
