import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, PageBreak, TabStopPosition,
  TabStopType, UnderlineType,
} from "docx";
import { writeFileSync } from "fs";

// ─── Colors ───────────────────────────────────────────────────────────────────
const C = {
  dark:   "1E1E2E",
  accent: "4F8EF7",
  green:  "34D399",
  orange: "FB923C",
  red:    "F87171",
  gray:   "6B7280",
  white:  "F9FAFB",
  yellow: "FCD34D",
  bg:     "F3F4F6",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 100 },
  thematicBreak: false,
  run: { color: C.dark, bold: true, size: 36 },
});

const h2 = (text, color = C.dark) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 28, color })],
  spacing: { before: 360, after: 80 },
});

const h3 = (text, color = C.accent) => new Paragraph({
  children: [new TextRun({ text, bold: true, size: 24, color })],
  spacing: { before: 240, after: 60 },
});

const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, size: 22, color: opts.color ?? C.dark, bold: opts.bold ?? false, italics: opts.italic ?? false })],
  spacing: { before: 60, after: 60 },
  indent: opts.indent ? { left: 360 } : undefined,
});

const bullet = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, size: 22, color: opts.color ?? C.dark })],
  bullet: { level: opts.level ?? 0 },
  spacing: { before: 40, after: 40 },
});

const code = (text) => new Paragraph({
  children: [new TextRun({
    text,
    font: "Courier New",
    size: 18,
    color: C.accent,
    shading: { type: ShadingType.SOLID, color: "E8EEFA", fill: "E8EEFA" },
  })],
  spacing: { before: 40, after: 40 },
  indent: { left: 360 },
});

const divider = () => new Paragraph({
  text: "─────────────────────────────────────────────────────",
  spacing: { before: 200, after: 200 },
  run: { color: "D1D5DB", size: 18 },
});

const tag = (text, color = C.accent) => new TextRun({
  text: ` [${text}] `,
  bold: true,
  color,
  size: 20,
});

const slideHeader = (num, title, time, keywords) => [
  new Paragraph({
    children: [
      new TextRun({ text: `SLIDE ${num}`, bold: true, size: 20, color: C.white,
        shading: { type: ShadingType.SOLID, color: C.dark, fill: C.dark } }),
      new TextRun({ text: `  ${title}`, bold: true, size: 28, color: C.dark }),
      new TextRun({ text: `   ⏱ ${time}`, size: 20, color: C.gray }),
    ],
    spacing: { before: 480, after: 80 },
  }),
  new Paragraph({
    children: [
      new TextRun({ text: "🔑 Keywords: ", bold: true, size: 20, color: C.orange }),
      new TextRun({ text: keywords.join("  ·  "), size: 20, color: C.dark }),
    ],
    spacing: { before: 0, after: 120 },
  }),
];

const keywordsBox = (words) => new Paragraph({
  children: [
    new TextRun({ text: "💡 TARJETA MENTAL → ", bold: true, size: 20, color: C.orange }),
    ...words.map((w, i) => new TextRun({
      text: (i > 0 ? "  |  " : "") + w.toUpperCase(),
      bold: true,
      size: 22,
      color: C.accent,
    })),
  ],
  shading: { type: ShadingType.SOLID, color: "FFF7ED", fill: "FFF7ED" },
  spacing: { before: 160, after: 80 },
  border: {
    left: { style: BorderStyle.SINGLE, size: 16, color: C.orange },
  },
  indent: { left: 180 },
});

const noteBox = (text) => new Paragraph({
  children: [
    new TextRun({ text: "📝 Nota al orador: ", bold: true, size: 19, color: C.gray }),
    new TextRun({ text, size: 19, color: C.gray, italics: true }),
  ],
  spacing: { before: 80, after: 80 },
  indent: { left: 360 },
});

// ─── Table helper ─────────────────────────────────────────────────────────────
const makeTable = (headers, rows) => {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: h, bold: true, size: 20, color: C.white })],
        alignment: AlignmentType.CENTER,
      })],
      shading: { type: ShadingType.SOLID, color: C.dark, fill: C.dark },
      margins: { top: 80, bottom: 80, left: 140, right: 140 },
    })),
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: cell, size: 19, color: ci === 0 ? C.accent : C.dark, bold: ci === 0 })],
      })],
      shading: ri % 2 === 0
        ? { type: ShadingType.SOLID, color: "F9FAFB", fill: "F9FAFB" }
        : { type: ShadingType.SOLID, color: "FFFFFF", fill: "FFFFFF" },
      margins: { top: 60, bottom: 60, left: 140, right: 140 },
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    margins: { top: 0, bottom: 0 },
  });
};

// ─── Document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
    },
  },
  sections: [{
    properties: {
      page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } },
    },
    children: [

      // ════════════════════════════════════════════
      // PORTADA
      // ════════════════════════════════════════════
      new Paragraph({
        children: [new TextRun({ text: "BeProfesional", bold: true, size: 64, color: C.accent })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Tech Talk — Guía de presentación", size: 32, color: C.gray })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "27 de abril · 25-30 min · Tribunal experto", size: 24, color: C.gray, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      makeTable(
        ["Campo", "Detalle"],
        [
          ["Proyecto",    "BeProfesional — Gestión de equipos de fútbol con IA"],
          ["Stack",       "Next.js 16 · React 19 · TypeScript · Supabase · OpenAI GPT-4.1"],
          ["Duración",    "25-30 minutos · 10 slides"],
          ["Audiencia",   "Tribunal técnico de alto nivel"],
          ["Objetivo",    "Demostrar comprensión profunda de cada decisión técnica"],
        ]
      ),
      divider(),

      // ════════════════════════════════════════════
      // INTRO: METODOLOGÍA
      // ════════════════════════════════════════════
      h2("⚡ Antes de empezar: tarjetas mentales, no guión", C.accent),
      p("Cada slide tiene exactamente 3 palabras clave. Si te bloqueas, miras la tarjeta y continúas."),
      p("Grábate con el móvil. Si suenas como un robot → lo estás leyendo. Si tartamudeas pero das ideas → vas bien.", { italic: true }),
      bullet("Respira hondo ANTES de cada slide. Mira al público, no a la pantalla."),
      bullet("Si no sabes algo: \"No lo medimos, lo haríamos con X\" / \"Limitación que solventaríamos así\""),
      bullet("Cronómetro: < 25 min = rápido. > 30 min = te alargaste."),
      divider(),

      // ════════════════════════════════════════════
      // SLIDE 1
      // ════════════════════════════════════════════
      ...slideHeader(1, "Presentación", "30 seg", ["nombre", "proyecto", "rol"]),
      keywordsBox(["Gestión deportiva", "IA entrenamiento", "Full-stack"]),
      p("Guión sugerido:", { bold: true }),
      p("\"Soy [nombre], desarrollé BeProfesional, una plataforma full-stack para gestión de equipos de fútbol que integra IA generativa para crear rutinas de entrenamiento personalizadas.\"", { italic: true }),
      noteBox("30 segundos máximo. Nombre → proyecto → tecnología central. Sin más."),

      // ════════════════════════════════════════════
      // SLIDE 2
      // ════════════════════════════════════════════
      ...slideHeader(2, "El problema técnico real", "2 min", ["latencia LLM", "JSON estructurado", "estado SSR"]),
      h3("Tres retos técnicos reales (no funcionales)"),
      bullet("Latencia LLM: GPT-4.1 tarda 6-15 s por petición. La UI no puede bloquearse.", { color: C.red }),
      bullet("Salida estructurada fiable: el modelo debe devolver JSON válido con schema estricto. Un JSON mal formado rompe el flujo.", { color: C.orange }),
      bullet("Auth con SSR: Next.js App Router + Supabase SSR requiere sincronización de cookies entre servidor y cliente en cada request.", { color: C.accent }),
      keywordsBox(["latencia", "JSON schema", "cookies SSR"]),
      noteBox("Explícalo como si contaras a un compañero el bug más molesto de la semana. No leer."),

      // ════════════════════════════════════════════
      // SLIDE 3
      // ════════════════════════════════════════════
      ...slideHeader(3, "Restricciones del proyecto", "1.5 min", ["rate limits", "tokens", "tier gratuito"]),
      bullet("OpenAI API: límite 429 (rate limit). Sin reintentos automáticos → mensaje de error claro al usuario."),
      bullet("Tokens: max_tokens fijado a 2.600 por petición para controlar coste y latencia."),
      bullet("Supabase tier gratuito: 500 MB DB, 1 GB storage, 50.000 MAU — diseño enfocado en eficiencia de queries."),
      bullet("Sin infraestructura propia: todo serverless (Vercel + Supabase). Trade-off: cold starts en API routes."),
      keywordsBox(["429 rate limit", "2600 tokens", "serverless cold start"]),
      noteBox("3 balas visuales máximo. Di los números exactos — dan credibilidad."),

      // ════════════════════════════════════════════
      // SLIDE 4
      // ════════════════════════════════════════════
      ...slideHeader(4, "Stack tecnológico + alternativas descartadas", "3 min", ["trade-offs", "decisión", "por qué"]),
      makeTable(
        ["Decisión", "Elegido", "Alternativa descartada", "Razón"],
        [
          ["Framework",    "Next.js 16",         "Express + React CRA",     "API routes + SSR en un solo proceso. Sin servidor separado."],
          ["Base de datos","Supabase (PostgreSQL)","Firebase (NoSQL)",       "Relaciones complejas entre equipos, jugadores y sesiones. SQL > documentos."],
          ["Auth",         "Supabase Auth (SSR)", "NextAuth.js",            "Integración nativa con el cliente Supabase. Menos dependencias."],
          ["LLM",          "OpenAI GPT-4.1",      "LLM local (Ollama)",     "Calidad y velocidad superiores. El coste era asumible."],
          ["CSS",          "Tailwind CSS 4",       "CSS Modules / styled-components", "Velocidad de desarrollo. Sin context-switching."],
          ["PDF",          "DocRaptor",            "Puppeteer headless PDF", "Puppeteer requiere Chrome en servidor. DocRaptor es API externa sin overhead."],
        ]
      ),
      new Paragraph({ spacing: { before: 80 } }),
      keywordsBox(["SQL vs NoSQL", "serverless", "GPT-4.1 vs local"]),
      noteBox("Para cada fila: \"Elegí X porque Y. Descarté Z porque W.\" Máximo 20 segundos por fila."),

      // ════════════════════════════════════════════
      // SLIDE 5
      // ════════════════════════════════════════════
      ...slideHeader(5, "Arquitectura y flujo de datos", "4 min", ["stateless", "App Router", "Supabase SSR"]),
      h3("Flujo completo de una petición de IA (PlayMaker)"),
      bullet("1 · Frontend POST a /api/play-maker/ai-routine con: prompt, draft actual, historial de conversación."),
      bullet("2 · API Route valida sesión via createSupabaseRouteHandler(cookieStore) → getUser()."),
      bullet("3 · Se cargan datos de contexto: equipo, biblioteca de ejercicios, próximas sesiones desde Supabase."),
      bullet("4 · Se construye el system prompt con contexto real + buildContextPrompt()."),
      bullet("5 · OpenAI se llama con response_format: { type: 'json_object' } y max_tokens: 2600."),
      bullet("6 · Se valida el JSON, se enriquece con datos de ExerciseDB y se devuelve al cliente."),
      new Paragraph({ spacing: { before: 80 } }),
      h3("Principio arquitectónico clave"),
      p("API Routes stateless — cada request lleva su propio contexto. No hay estado en memoria del servidor."),
      keywordsBox(["stateless routes", "context building", "json_object format"]),
      noteBox("Señala con puntero (o cursor) cada paso mientras hablas. No leas los bullets — cuéntalos."),

      // ════════════════════════════════════════════
      // SLIDE 6
      // ════════════════════════════════════════════
      ...slideHeader(6, "Implementación más delicada", "5 min", ["json_object", "temperature", "validación"]),
      h3("Llamada a OpenAI con output estructurado — route.ts"),
      code("const openai = new OpenAI({ apiKey })"),
      code("const completion = await openai.chat.completions.create({"),
      code("  model: getModelName(),                    // GPT-4.1"),
      code("  temperature: Math.min(getTemperature(), 0.5),  // máx 0.5"),
      code("  response_format: { type: 'json_object' }, // output forzado a JSON"),
      code("  max_tokens: 2600,"),
      code("  messages: ["),
      code("    { role: 'system', content: systemPrompt },"),
      code("    { role: 'user',   content: buildContextPrompt({"),
      code("        team, prompt, currentDraft, messages,"),
      code("        libraryPreview, upcomingSessions }) },"),
      code("  ],"),
      code("})"),
      new Paragraph({ spacing: { before: 120 } }),
      h3("¿Por qué esto es delicado?"),
      bullet("response_format: json_object obliga al modelo a devolver JSON válido — pero no garantiza que cumpla el schema."),
      bullet("Se añade validación manual del JSON con try/catch y fallback a error codes específicos."),
      bullet("temperature: 0.5 máximo — rutinas deportivas requieren consistencia, no creatividad extrema."),
      bullet("buildContextPrompt inyecta datos reales del equipo para que el LLM genere rutinas relevantes, no genéricas."),
      keywordsBox(["json_object forzado", "temperatura 0.5", "validación post-parse"]),
      noteBox("\"Aquí solucionamos el problema del JSON roto con X.\" Di qué pasa si falla. Muestra que entiendes el edge case."),

      // ════════════════════════════════════════════
      // SLIDE 7
      // ════════════════════════════════════════════
      ...slideHeader(7, "Métricas técnicas", "2 min", ["latencia", "tokens", "queries"]),
      makeTable(
        ["Métrica", "Valor", "Contexto"],
        [
          ["Latencia generación IA",   "6–15 segundos",    "GPT-4.1 · prompt complejo con contexto real de equipo"],
          ["Tokens por petición",      "~1.500–2.600",     "max_tokens fijado a 2.600. Prompt sistema + contexto + respuesta"],
          ["Latencia API (DB queries)","< 200 ms",         "Supabase PostgreSQL en región EU. Queries simples sin JOIN pesado"],
          ["Tiempo de build",          "< 30 s",           "Next.js 16 con TypeScript. Sin SSG pesado"],
          ["Tablas en DB",             "6 tablas core",    "equipos · miembros · ejercicios · entrenamientos · ia_recomendaciones · codigos_invitacion"],
        ]
      ),
      new Paragraph({ spacing: { before: 80 } }),
      keywordsBox(["6-15s LLM", "2600 tokens", "<200ms DB"]),
      noteBox("Números grandes y claros. Si el tribunal pregunta cómo los mediste: \"Con DevTools Network tab y Supabase dashboard.\""),

      // ════════════════════════════════════════════
      // SLIDE 8
      // ════════════════════════════════════════════
      ...slideHeader(8, "Lección aprendida — error real", "2 min", ["JSON inválido", "fallback", "error codes"]),
      h3("El problema"),
      p("GPT-4.1 con response_format: json_object devuelve JSON válido sintácticamente, pero no siempre con la estructura esperada. El primer intento asumía que el schema era correcto si el parse no fallaba."),
      h3("Qué pasó"),
      p("La UI mostraba bloques de entrenamiento undefined porque el modelo devolvía { blocks: null } en lugar de { blocks: [] }."),
      h3("Cómo se arregló"),
      bullet("Validación explícita de cada campo del schema después del JSON.parse()."),
      bullet("Error codes específicos: EMPTY_AI_RESPONSE, INVALID_AI_JSON, STATS_ERROR."),
      bullet("Normalización de nulls a arrays vacíos antes de devolver al cliente."),
      keywordsBox(["schema validation", "null vs []", "error codes"]),
      noteBox("Anécdota corta. Máximo 2 minutos. El tribunal valora que encontraste el bug Y lo entiendes."),

      // ════════════════════════════════════════════
      // SLIDE 9
      // ════════════════════════════════════════════
      ...slideHeader(9, "Pregunta trampa preparada", "2 min", ["fallback", "degradación", "plan B"]),
      h3("\"¿Qué pasa si OpenAI se cae?\""),
      p("Respuesta honesta preparada:", { bold: true }),
      p("\"Actualmente el sistema devuelve un error 429 o 5xx con mensaje claro al usuario. No tenemos fallback automático implementado. Si lo rediseñáramos, añadiríamos: (1) queue con reintentos exponenciales, (2) plantillas predefinidas de rutinas como fallback, (3) alerta en Sentry para detectar degradación del servicio.\"", { italic: true }),
      divider(),
      h3("Otras preguntas trampa y respuestas"),
      makeTable(
        ["Pregunta", "Respuesta clave"],
        [
          ["¿Por qué no usasteis un ORM?",     "Supabase JS client actúa como query builder. Añadir Prisma habría sido overhead innecesario para el scope."],
          ["¿Cómo gestionáis la seguridad de la API key?", "Variables de entorno en Vercel. Nunca en el cliente. Las API routes actúan de proxy."],
          ["¿Por qué Next.js y no un backend separado?", "Un solo despliegue, un solo proceso. Trade-off: no escala frontend e independientemente del backend."],
          ["¿Cómo evitáis que un usuario acceda a datos de otro equipo?", "Row Level Security de Supabase + verificación de membresía en cada API route."],
        ]
      ),
      new Paragraph({ spacing: { before: 80 } }),
      keywordsBox(["reintentos exponenciales", "RLS Supabase", "proxy API key"]),
      noteBox("Ensaya estas 4 respuestas 5 veces en voz alta. Son las más probables. Empieza siempre con 'Buena pregunta, la limitación es...'"),

      // ════════════════════════════════════════════
      // SLIDE 10
      // ════════════════════════════════════════════
      ...slideHeader(10, "Cierre", "30 seg", ["aprendizaje", "iteración", "gracias"]),
      p("Guión sugerido:", { bold: true }),
      p("\"BeProfesional nos enseñó que integrar LLMs en producción no es solo hacer la llamada a la API — es gestionar latencia, validar outputs y diseñar para el fallo. Gracias.\"", { italic: true }),
      keywordsBox(["LLMs en producción", "gestionar fallo", "gracias"]),
      noteBox("Sonreír. Mirar al tribunal. Callar. No añadir nada después de 'gracias'."),
      divider(),

      // ════════════════════════════════════════════
      // APÉNDICE
      // ════════════════════════════════════════════
      h2("📎 Apéndice — Herramientas de preparación"),
      makeTable(
        ["Herramienta", "Para qué", "Por qué"],
        [
          ["Canva",         "Crear diapositivas",                "Plantillas modernas. Sin preocuparse por diseño."],
          ["Google Slides", "Modo presentador con notas",        "Ensayo en equipo + notas visibles solo para ti."],
          ["OBS Studio",    "Grabarte ensayando",                "Detectas muletillas y ritmo. Te odiarás, pero funciona."],
          ["Postman/Bruno", "Capturar métricas de API en vivo",  "Si preguntan latencias, puedes demostrarlo en directo."],
        ]
      ),
      new Paragraph({ spacing: { before: 200 } }),
      h2("🧠 Filtro de oro — qué es relevante"),
      p("Regla: si un programador experto ya sabe esto → lo quito."),
      bullet("✅ RELEVANTE: gestión del rate limit 429 de OpenAI con mensaje de error semántico."),
      bullet("✅ RELEVANTE: response_format json_object + validación de schema manual."),
      bullet("✅ RELEVANTE: elección Supabase vs Firebase para datos relacionales."),
      bullet("❌ IRRELEVANTE: que usásteis useState en React."),
      bullet("❌ IRRELEVANTE: que instalásteis axios o Lucide Icons."),
      bullet("❌ IRRELEVANTE: explicar el login sin decir nada de JWT o cookies."),
      new Paragraph({
        children: [new TextRun({ text: "\nRegla práctica: Si lo puedes explicar en 10 palabras, no necesitas diapositiva. Si necesitas un diagrama o 3 frases → sí.", size: 22, italics: true, color: C.gray })],
        spacing: { before: 120, after: 120 },
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  writeFileSync("BeProfesional_TechTalk.docx", buffer);
  console.log("✅ BeProfesional_TechTalk.docx generado correctamente.");
});
