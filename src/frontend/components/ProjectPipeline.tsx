"use client";

type PipelineNode = {
  id: string;
  label: string;
  sublabel?: string;
  accent: string;
  glow: string;
  icon: string;
};

type PipelineLayer = {
  title: string;
  titleColor: string;
  nodes: PipelineNode[];
};

const layers: PipelineLayer[] = [
  {
    title: "Entrada",
    titleColor: "text-blue-400",
    nodes: [
      { id: "user", label: "Usuario", sublabel: "Entrenador / Jugador", accent: "border-blue-500/60 bg-blue-950/60", glow: "shadow-[0_0_18px_rgba(59,130,246,0.18)]", icon: "👤" },
    ],
  },
  {
    title: "Auth",
    titleColor: "text-purple-400",
    nodes: [
      { id: "auth", label: "Supabase Auth", sublabel: "JWT + SSR Cookies", accent: "border-purple-500/60 bg-purple-950/60", glow: "shadow-[0_0_18px_rgba(168,85,247,0.18)]", icon: "🔐" },
    ],
  },
  {
    title: "Frontend",
    titleColor: "text-cyan-400",
    nodes: [
      { id: "nextjs", label: "Next.js 16", sublabel: "React 19 + TS 5", accent: "border-cyan-500/60 bg-cyan-950/60", glow: "shadow-[0_0_18px_rgba(6,182,212,0.15)]", icon: "⚡" },
      { id: "ui", label: "UI Layer", sublabel: "Tailwind 4 + Radix + ECharts", accent: "border-cyan-500/60 bg-cyan-950/60", glow: "shadow-[0_0_18px_rgba(6,182,212,0.15)]", icon: "🎨" },
    ],
  },
  {
    title: "API Routes",
    titleColor: "text-yellow-400",
    nodes: [
      { id: "api", label: "Next.js API", sublabel: "/api/* endpoints", accent: "border-yellow-500/60 bg-yellow-950/60", glow: "shadow-[0_0_18px_rgba(234,179,8,0.15)]", icon: "🔀" },
    ],
  },
  {
    title: "Backend",
    titleColor: "text-orange-400",
    nodes: [
      { id: "training", label: "Training Engine", sublabel: "PlayMaker + PDF", accent: "border-orange-500/60 bg-orange-950/60", glow: "shadow-[0_0_18px_rgba(249,115,22,0.15)]", icon: "🏋️" },
      { id: "stats", label: "Stats Engine", sublabel: "Análisis rendimiento", accent: "border-orange-500/60 bg-orange-950/60", glow: "shadow-[0_0_18px_rgba(249,115,22,0.15)]", icon: "📊" },
      { id: "chat", label: "Chat Module", sublabel: "Mensajería + IA", accent: "border-orange-500/60 bg-orange-950/60", glow: "shadow-[0_0_18px_rgba(249,115,22,0.15)]", icon: "💬" },
    ],
  },
  {
    title: "Servicios",
    titleColor: "text-emerald-400",
    nodes: [
      { id: "openai", label: "OpenAI GPT-4.1", sublabel: "Generación de rutinas", accent: "border-emerald-500/60 bg-emerald-950/60", glow: "shadow-[0_0_18px_rgba(16,185,129,0.15)]", icon: "🤖" },
      { id: "supabase", label: "Supabase DB", sublabel: "PostgreSQL + Storage", accent: "border-emerald-500/60 bg-emerald-950/60", glow: "shadow-[0_0_18px_rgba(16,185,129,0.15)]", icon: "🗄️" },
      { id: "exercisedb", label: "ExerciseDB", sublabel: "RapidAPI", accent: "border-emerald-500/60 bg-emerald-950/60", glow: "shadow-[0_0_18px_rgba(16,185,129,0.15)]", icon: "💪" },
      { id: "removebg", label: "RemoveBG", sublabel: "Recorte imágenes", accent: "border-emerald-500/60 bg-emerald-950/60", glow: "shadow-[0_0_18px_rgba(16,185,129,0.15)]", icon: "🖼️" },
      { id: "docraptor", label: "DocRaptor", sublabel: "PDF export", accent: "border-emerald-500/60 bg-emerald-950/60", glow: "shadow-[0_0_18px_rgba(16,185,129,0.15)]", icon: "📄" },
    ],
  },
];

function Arrow() {
  return (
    <div className="flex shrink-0 items-center self-stretch px-1 pt-8">
      <svg width="28" height="14" viewBox="0 0 28 14" fill="none">
        <defs>
          <linearGradient id="arrow-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4b5563" />
            <stop offset="100%" stopColor="#6b7280" />
          </linearGradient>
        </defs>
        <path d="M0 7 H22" stroke="url(#arrow-grad)" strokeWidth="1.8" />
        <path d="M18 2.5 L26 7 L18 11.5" stroke="url(#arrow-grad)" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
      </svg>
    </div>
  );
}

function PipelineNodeCard({ node }: { node: PipelineNode }) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all hover:-translate-y-0.5 ${node.accent} ${node.glow}`}
    >
      <span className="text-xl leading-none">{node.icon}</span>
      <span className="text-sm font-semibold leading-tight text-white">{node.label}</span>
      {node.sublabel && (
        <span className="text-[11px] leading-snug text-gray-400">{node.sublabel}</span>
      )}
    </div>
  );
}

export default function ProjectPipeline() {
  return (
    <div className="min-h-screen bg-gray-950 p-8 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-400">
            Arquitectura
          </div>
          <h1 className="text-4xl font-black tracking-tight">Pipeline del Proyecto</h1>
          <p className="mt-2 text-gray-500">BeProfesional — Flujo de datos y arquitectura</p>
        </div>

        {/* Pipeline */}
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max items-start gap-0">
            {layers.map((layer, i) => (
              <div key={layer.title} className="flex items-start">
                <div className="flex w-[148px] flex-col gap-2">
                  <div className={`mb-1 border-b border-gray-800 pb-1.5 text-center text-[10px] font-black uppercase tracking-widest ${layer.titleColor}`}>
                    {layer.title}
                  </div>
                  {layer.nodes.map((node) => (
                    <PipelineNodeCard key={node.id} node={node} />
                  ))}
                </div>
                {i < layers.length - 1 && <Arrow />}
              </div>
            ))}
          </div>
        </div>

        {/* Flow legend */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-900/50 bg-blue-950/30 p-5">
            <p className="mb-3 flex items-center gap-2 font-bold text-blue-400">
              <span>📥</span> Flujo de Entrada
            </p>
            <ol className="space-y-1.5 text-sm text-gray-400 list-decimal list-inside">
              <li>Usuario accede a la app</li>
              <li>Supabase Auth valida sesión (JWT)</li>
              <li>React renderiza la UI</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-orange-900/50 bg-orange-950/30 p-5">
            <p className="mb-3 flex items-center gap-2 font-bold text-orange-400">
              <span>⚙️</span> Procesamiento
            </p>
            <ol className="space-y-1.5 text-sm text-gray-400 list-decimal list-inside">
              <li>API Route recibe petición autenticada</li>
              <li>Backend invoca OpenAI / Supabase / APIs</li>
              <li>PlayMaker genera rutinas de entrenamiento</li>
            </ol>
          </div>
          <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/30 p-5">
            <p className="mb-3 flex items-center gap-2 font-bold text-emerald-400">
              <span>📤</span> Respuesta
            </p>
            <ol className="space-y-1.5 text-sm text-gray-400 list-decimal list-inside">
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
