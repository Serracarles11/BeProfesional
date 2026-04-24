"use client";

type Tech = {
  name: string;
  version?: string;
  description: string;
  icon: string;
  docs?: string;
};

type Layer = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
  border: string;
  titleColor: string;
  techs: Tech[];
};

const layers: Layer[] = [
  {
    id: "frontend",
    title: "Frontend",
    subtitle: "Interfaz de usuario",
    icon: "🎨",
    gradient: "from-cyan-950 to-cyan-900",
    border: "border-cyan-700",
    titleColor: "text-cyan-300",
    techs: [
      { name: "Next.js", version: "16.1.6", description: "Framework React con SSR, App Router y API Routes", icon: "▲" },
      { name: "React", version: "19.2.3", description: "Librería UI con hooks y componentes funcionales", icon: "⚛️" },
      { name: "TypeScript", version: "5", description: "Tipado estático sobre JavaScript", icon: "🔷" },
      { name: "Tailwind CSS", version: "4", description: "Utility-first CSS framework", icon: "🌊" },
      { name: "Radix UI", version: "1.4.3", description: "Componentes accesibles sin estilos (headless)", icon: "🧩" },
      { name: "ECharts", version: "6", description: "Gráficas interactivas (estadísticas de jugadores)", icon: "📈" },
      { name: "Lucide React", version: "0.563", description: "Iconos SVG como componentes React", icon: "✨" },
    ],
  },
  {
    id: "backend",
    title: "Backend",
    subtitle: "Lógica del servidor",
    icon: "⚙️",
    gradient: "from-orange-950 to-orange-900",
    border: "border-orange-700",
    titleColor: "text-orange-300",
    techs: [
      { name: "Next.js API Routes", description: "Endpoints REST en /api/* (mismo proceso que el frontend)", icon: "🔀" },
      { name: "Node.js", description: "Runtime para scripts de scraping e importación", icon: "🟢" },
      { name: "Supabase SSR", version: "0.6.1", description: "Cliente Supabase con manejo de cookies server-side", icon: "🍪" },
      { name: "PlayMaker Engine", description: "Motor propietario de generación de rutinas de entrenamiento con IA", icon: "🏋️" },
    ],
  },
  {
    id: "ai",
    title: "Inteligencia Artificial",
    subtitle: "Modelos y generación",
    icon: "🤖",
    gradient: "from-violet-950 to-violet-900",
    border: "border-violet-700",
    titleColor: "text-violet-300",
    techs: [
      { name: "OpenAI SDK", version: "6.21", description: "Integración con la API de OpenAI", icon: "🔮" },
      { name: "GPT-4.1", description: "Modelo para generar rutinas de entrenamiento personalizadas (temp: 0.35)", icon: "🧠" },
    ],
  },
  {
    id: "database",
    title: "Base de Datos",
    subtitle: "Almacenamiento y autenticación",
    icon: "🗄️",
    gradient: "from-green-950 to-green-900",
    border: "border-green-700",
    titleColor: "text-green-300",
    techs: [
      { name: "Supabase", version: "2.49.4", description: "BaaS con PostgreSQL, Auth, Storage y Realtime", icon: "⚡" },
      { name: "PostgreSQL", description: "Base de datos relacional gestionada por Supabase", icon: "🐘" },
      { name: "Supabase Auth", description: "JWT + SSR Cookies para gestión de sesiones", icon: "🔐" },
      { name: "Supabase Storage", description: "Almacenamiento de imágenes (fotos de perfil, campo)", icon: "📦" },
    ],
  },
  {
    id: "external",
    title: "APIs Externas",
    subtitle: "Servicios de terceros",
    icon: "🌐",
    gradient: "from-pink-950 to-pink-900",
    border: "border-pink-700",
    titleColor: "text-pink-300",
    techs: [
      { name: "ExerciseDB", description: "Catálogo de ejercicios físicos vía RapidAPI", icon: "💪" },
      { name: "RemoveBG", description: "Eliminación de fondo en imágenes de jugadores", icon: "🖼️" },
      { name: "DocRaptor", description: "Conversión HTML→PDF para exportar rutinas de entrenamiento", icon: "📄" },
      { name: "FFIB", description: "Federación Española de Fútbol (scraping con Puppeteer)", icon: "⚽" },
    ],
  },
  {
    id: "devtools",
    title: "Dev Tools",
    subtitle: "Herramientas de desarrollo",
    icon: "🛠️",
    gradient: "from-gray-800 to-gray-900",
    border: "border-gray-600",
    titleColor: "text-gray-300",
    techs: [
      { name: "ESLint", version: "9", description: "Linter con configuración Next.js", icon: "🔍" },
      { name: "Puppeteer", description: "Scraping headless de datos de la FFIB", icon: "🕷️" },
      { name: "dotenv", version: "17.3.1", description: "Gestión de variables de entorno", icon: "🔑" },
      { name: "class-variance-authority", version: "0.7.1", description: "Variantes de componentes con Tailwind", icon: "🎭" },
      { name: "tailwind-merge", version: "3.4.0", description: "Merge inteligente de clases Tailwind", icon: "🔗" },
    ],
  },
];

function TechCard({ tech }: { tech: Tech }) {
  return (
    <div className="flex items-start gap-2 bg-black/20 rounded-lg p-2.5 hover:bg-black/30 transition-colors">
      <span className="text-lg flex-shrink-0 mt-0.5">{tech.icon}</span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-white text-sm">{tech.name}</span>
          {tech.version && (
            <span className="text-xs text-gray-400 font-mono">v{tech.version}</span>
          )}
        </div>
        <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{tech.description}</p>
      </div>
    </div>
  );
}

function LayerCard({ layer }: { layer: Layer }) {
  return (
    <div className={`rounded-2xl border ${layer.border} bg-gradient-to-br ${layer.gradient} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{layer.icon}</span>
        <div>
          <h2 className={`font-bold text-lg leading-tight ${layer.titleColor}`}>{layer.title}</h2>
          <p className="text-xs text-gray-500">{layer.subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {layer.techs.map((tech) => (
          <TechCard key={tech.name} tech={tech} />
        ))}
      </div>
    </div>
  );
}

export default function ProjectStack() {
  const totalTechs = layers.reduce((acc, l) => acc + l.techs.length, 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Stack Tecnológico</h1>
          <p className="text-gray-400 text-lg">BeProfesional — {totalTechs} tecnologías en {layers.length} capas</p>
        </div>

        {/* Summary badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {layers.map((l) => (
            <div
              key={l.id}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${l.border} bg-black/30 text-xs font-medium`}
            >
              <span>{l.icon}</span>
              <span className={l.titleColor}>{l.title}</span>
              <span className="text-gray-500">({l.techs.length})</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {layers.map((layer) => (
            <LayerCard key={layer.id} layer={layer} />
          ))}
        </div>

        {/* Footer summary */}
        <div className="mt-10 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-3 text-gray-200">Resumen de la arquitectura</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              <p className="font-semibold text-gray-300 mb-1">Full-Stack en un único repositorio</p>
              <p>Next.js unifica frontend y backend. Las API Routes de Next.js sirven los endpoints del servidor en el mismo proceso que la UI, reduciendo latencia y simplificando el despliegue.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-1">BaaS con Supabase</p>
              <p>Supabase provee auth, base de datos PostgreSQL, almacenamiento de archivos y cliente SSR, eliminando la necesidad de un servidor de identidad separado.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-1">IA para entrenamiento</p>
              <p>OpenAI GPT-4.1 a temperatura 0.35 genera rutinas de entrenamiento consistentes y estructuradas que el PlayMaker Engine convierte en PDFs exportables.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-300 mb-1">Datos de la federación</p>
              <p>Un pipeline offline con Puppeteer raspa la FFIB y un script de importación vuelca los datos de jugadores y equipos directamente en Supabase.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
