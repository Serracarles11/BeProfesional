# Fix Supabase

## Si usas Supabase CLI

```bash
supabase db push
```

o

```bash
supabase migration up
```

## Si NO usas CLI

1. Abre Supabase SQL Editor.
2. Copia y pega el SQL de:
   - `supabase/migrations/20260204_fix_rpc_crear_equipo.sql`
3. Ejecuta el script.

## Checklist de verificacion

1. Ver overloads de la funcion:

```sql
select p.proname, pg_get_function_identity_arguments(p.oid) args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'crear_equipo_con_codigos';
```

Debe salir solo 1 fila (firma: `text, text, text, text, integer, integer`).

2. Probar en la web:
   - Ir a `/crear-equipo`
   - Crear equipo
   - Debe devolver `equipoId`, `codigoEntrenador`, `codigoJugadores`.
