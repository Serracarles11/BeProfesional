# Despliegue en Vercel

Configuracion recomendada:

- Framework Preset: `Next.js`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Node.js Version: `22.x`

Variables de entorno necesarias en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `PLAYMAKER_OPENAI_MODEL`
- `PLAYMAKER_OPENAI_TEMPERATURE`
- `EXERCISEDB_RAPIDAPI_KEY`

Variables opcionales:

- `PLAYMAKER_OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SUPABASE_URL`
- `EXERCISEDB_BASE_URL`
- `EXERCISEDB_RAPIDAPI_HOST`
- `REMOVEBG_API_KEY`

Notas:

- Si usas `gpt-5`, la ruta de rutinas usa Responses API y no envia `temperature`.
- `EXERCISEDB_RAPIDAPI_KEY` es necesaria para enriquecer rutinas con imagenes/GIFs de ExerciseDB.
- La ruta `/api/import/ffib` usa datos cacheados incluidos en `scrapers/`; en Vercel no debe depender de ejecutar Playwright en runtime.
