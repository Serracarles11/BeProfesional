# Despliegue en Vercel

Configuración recomendada:

- Framework Preset: `Next.js`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Node.js Version: `22.x`
- Output Directory: dejar vacío, Vercel detecta `.next`

Variables de entorno necesarias en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `EXERCISEDB_RAPIDAPI_KEY`

Variables opcionales:

- `PLAYMAKER_OPENAI_API_KEY`
- `PLAYMAKER_OPENAI_MODEL`
- `PLAYMAKER_OPENAI_TEMPERATURE`
- `OPENAI_MODEL`
- `SUPABASE_URL`
- `EXERCISEDB_BASE_URL`
- `EXERCISEDB_RAPIDAPI_HOST`
- `REMOVEBG_API_KEY`

Notas:

- Si usas `gpt-5`, la ruta de rutinas usa Responses API y no envía `temperature`.
- `EXERCISEDB_RAPIDAPI_KEY` es necesaria para enriquecer rutinas con imágenes/GIFs de ExerciseDB.
- La ruta `/api/import/ffib` usa datos cacheados incluidos en `scrapers/`; en Vercel no ejecuta Playwright en runtime.
- Las Supabase Edge Functions se despliegan con Supabase CLI, no con Vercel.

Comprobación local antes de subir:

```bash
npm ci
npm run build
```

Despliegue rápido con CLI:

```bash
npx vercel
```

Producción:

```bash
npx vercel --prod
```
