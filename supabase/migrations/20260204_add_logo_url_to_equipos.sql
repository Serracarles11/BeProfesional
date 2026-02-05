-- Add optional team logo URL used by the dashboard and equipos endpoints.
ALTER TABLE public.equipos
ADD COLUMN IF NOT EXISTS logo_url text;
