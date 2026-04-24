"use client";

type PipelineNode = {
  id: string;
  label: string;
  sublabel?: string;
  color: string;
  icon: string;
};

type PipelineGroup = {
  title: string;
  nodes: PipelineNode[];
  accent: string;
};

const layers: PipelineGroup[] = [
  {
    title: "Entrada",
    accent: "border-blue-500",
    nodes: [
      { id: "user", label: "Usuario", sublabel: "Entrenador / Jugador", color: "bg-blue-900 border-blue-500", icon: "👤" },
    ],
  },
  {
    title: "Autenticación",
    accent: "border-purple-500",
    nodes: [
      { id: "auth", label: "Supabase Auth", sublabel: "JWT + SSR Cookies", color: "bg-purple-900 border-purple-500", icon: "🔐" },
    ],
  },
  {
    title: "Frontend",
    accent: "border-cyan-500",
    nodes: [
      { id: "nextjs", label: "Next.js 16", sublabel: "React 19 + TypeScript 5", color: "bg-cyan-900 border-cyan-500", icon: "⚡" },
      { id: "ui", label: "UI Layer", sublabel: "Tailwind 4 + Radix UI + ECharts", color: "bg-cyan-900 border-cyan-500", icon: "🎨" },
    ],
  },
  {
    title: "API Routes",
    accent: "border-yellow-500",
    nodes: [
      { id: "api", label: "Next.js API", sublabel: "/api/* endpoints", color: "bg-yellow-900 border-yellow-500", icon: "🔀" },
    ],
  },
  {
    title: "Backend Logic",
    accent: "border-orange-500",
    nodes: [
      { id: "training", label: "Training Engine", sublabel: "PlayMaker + PDF Generator", color: "bg-orange-900 border-orange-500", icon: "🏋️" },
      { id: "stats", label: "Stats Engine", sublabel: "Análisis rendimiento", color: "bg-orange-900 border-orange-500", icon: "📊" },
      { id: "chat", label: "Chat Module", sublabel: "Mensajería + IA", color: "bg-orange-900 border-orange-500", icon: "💬" },
    ],
  },
  {
    title: "Servicios",
    accent: "border-green-500",
    nodes: [
      { id: "openai", label: "OpenAI GPT-4.1", sublabel: "Generación IA de rutinas", color: "bg-green-900 border-green-500", icon: "🤖" },
      { id: "supabase", label: "Supabase DB", sublabel: "PostgreSQL + Storage", color: "bg-green-900 border-green-500", icon: "🗄️" },
      { id: "exercisedb", label: "ExerciseDB", sublabel: "RapidAPI", color: "bg-green-900 border-green-500", icon: "💪" },
      { id: "removebg", label: "RemoveBG", sublabel: "Recorte de imágenes", color: "bg-green-900 border-green-500", icon: "🖼️" },
      { id: "docraptor", label: "DocRaptor", sublabel: "Generación de PDFs", color: "bg-green-900 border-green-500", icon: "📄" },
    ],
  },
];

const Arrow = () => (
  <div className="flex items-center justify-center px-1">
    <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
      <path d="M0 8 H26" stroke="#6b7280" strokeWidth="2" />
      <path d="M22 3 L30 8 L22 13" stroke="#6b7280" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function ProjectPipeline() {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Pipeline del Proyecto
          </h1>
          <p className="text-gray-400 text-lg">BeProfesional — Flujo de datos y arquitectura de la aplicación</p>
        </div>

        {/* Horizontal pipeline */}
        <div className="flex items-start justify-center gap-0 overflow-x-auto pb-4">
          {layers.map((layer, i) => (
            <div key={layer.title} className="flex items-start">
              <div className={`flex flex-col gap-2 min-w-[140px] max-w-[160px]`}>
                <div className={`text-xs font-semibold uppercase tracking-widest text-center border-b pb-1 mb-1 ${layer.accent.replace("border-", "text-").replace("-500", "-400")} border-gray-700`}>
                  {layer.title}
                </div>
                {layer.nodes.map((node) => (
                  <div
                    key={node.id}
                    className={`border rounded-lg p-3 flex flex-col items-center text-center gap-1 ${node.color}`}
                  >
                    <span className="text-2xl">{node.icon}</span>
                    <span className="font-semibold text-sm leading-tight">{node.label}</span>
                    {node.sublabel && (
                      <span className="text-xs text-gray-400 leading-tight">{node.sublabel}</span>
                    )}
                  </div>
                ))}
              </div>
              {i < layers.length - 1 && (
                <div className="flex items-center self-stretch pt-10">
                  <Arrow />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Data flow legend */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-blue-400 mb-2">📥 Flujo de Entrada</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>Usuario accede a la app</li>
              <li>Supabase Auth valida sesión (JWT)</li>
              <li>React renderiza la UI</li>
            </ol>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-orange-400 mb-2">⚙️ Procesamiento</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>API Route recibe petición autenticada</li>
              <li>Backend invoca OpenAI / Supabase / APIs</li>
              <li>PlayMaker genera rutinas de entrenamiento</li>
            </ol>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="font-semibold text-green-400 mb-2">📤 Respuesta</h3>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>Datos devueltos al Frontend</li>
              <li>ECharts renderiza estadísticas</li>
              <li>PDF exportado vía DocRaptor</li>
            </ol>
          </div>
        </div>

      </div>
    </div>
  );
}
