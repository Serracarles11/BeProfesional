# Estructura del proyecto

Esta carpeta concentra el codigo de la aplicacion separado por responsabilidad:

- `backend/`: logica de servidor, integraciones, servicios y endpoints.
- `backend/endpoints/`: implementaciones reales de las rutas API de Next.js.
- `frontend/`: pantallas, componentes visuales, estilos y utilidades de cliente.
- `frontend/routes/`: implementaciones reales de las paginas del App Router.
- `frontend/components/`: componentes reutilizables de interfaz.
- `frontend/styles/`: estilos globales.

La carpeta raiz `app/` se mantiene porque Next.js la necesita para descubrir rutas. Sus archivos son wrappers minimos que reexportan desde `src/frontend/routes` y `src/backend/endpoints`.
