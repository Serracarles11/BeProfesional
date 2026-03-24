import fs from "fs/promises";
import { chromium } from "playwright";

const START_SESS_URL = "https://www.ffib.es/Fed/NLogin?NSess=1";
const TEAM = "PE SANT JORDI";

// Parámetros tuyos
const COD_PRIMARIA = 1000110;
const COD_COMPETICION = 22536446;
const COD_GRUPO = 22750685;
const COD_TEMPORADA = 21;
const SCH_DELEGACION = 1;

const FROM_JORNADA = 1;
const TO_JORNADA = 11;

// ⚠️ Si tu categoría dura 80/70 cambia esto
const MATCH_MINUTES = 90;

const OUT_JSON = "./ffib_pe_sant_jordi_j1_11_clean.json";
const OUT_MD = "./ffib_pe_sant_jordi_j1_11_report.md";

function jornadaUrl(j) {
  return `https://www.ffib.es/Fed/NPcd/NFG_CmpJornada?cod_primaria=${COD_PRIMARIA}&CodCompeticion=${COD_COMPETICION}&CodGrupo=${COD_GRUPO}&CodTemporada=${COD_TEMPORADA}&CodJornada=${j}&Sch_Codigo_Delegacion=${SCH_DELEGACION}`;
}
function matchUrlFromActa(acta) {
  return `https://www.ffib.es/Fed/NPcd/NFG_CmpPartido?cod_primaria=${COD_PRIMARIA}&CodActa=${acta}&cod_acta=${acta}`;
}

function clean(s) {
  return (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
function normBasic(s) {
  return clean(s).toLowerCase();
}
function normName(s) {
  return clean(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[.,'"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function stripHash(url) {
  const u = new URL(url);
  u.hash = "";
  return u.toString();
}

function getActaId(url) {
  const u = new URL(url);
  return u.searchParams.get("CodActa") || u.searchParams.get("cod_acta");
}

/** ---------- Extracción de tablas ---------- **/
async function extractTablesFromContext(ctx) {
  return await ctx.$$eval("table", (tables) => {
    const clean = (s) => (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

    const nearestHeading = (table) => {
      const cap = table.querySelector("caption");
      if (cap && clean(cap.textContent)) return clean(cap.textContent);

      let el = table.previousElementSibling;
      for (let i = 0; i < 10 && el; i++) {
        const tag = (el.tagName || "").toLowerCase();
        if (["h1", "h2", "h3", "h4", "legend", "strong"].includes(tag)) {
          const txt = clean(el.textContent);
          if (txt) return txt;
        }
        el = el.previousElementSibling;
      }
      return null;
    };

    const getHeaders = (table) => {
      const ths = Array.from(table.querySelectorAll("thead th, tr th"))
        .map((th) => clean(th.textContent))
        .filter(Boolean);
      if (ths.length >= 2) return ths;

      const firstRow = Array.from(table.querySelectorAll("tr")).find(
        (tr) => tr.querySelectorAll("td").length > 1
      );
      if (!firstRow) return [];
      const tds = Array.from(firstRow.querySelectorAll("td")).map((td) => clean(td.textContent));
      return tds.filter(Boolean).length >= 2 ? tds : [];
    };

    const out = [];
    for (const table of tables) {
      const headers = getHeaders(table);
      if (headers.length < 2) continue;

      const trs = Array.from(table.querySelectorAll("tbody tr")).filter(
        (tr) => tr.querySelectorAll("td").length > 0
      );

      const rows = trs
        .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => clean(td.textContent)))
        .filter((r) => r.some((cell) => cell.length));

      if (!rows.length) continue;

      const title = nearestHeading(table);

      const container = table.closest("section,article,fieldset,div") || table.parentElement;
      let ctxText = clean(container?.innerText || "");
      ctxText = ctxText.slice(0, 1200); // más largo, útil para "Tarjetas" / "Gol"

      const rowObjs = rows.map((r) => {
        const o = {};
        headers.forEach((h, i) => (o[h || `col_${i}`] = r[i] ?? ""));
        return o;
      });

      out.push({ title, context: ctxText, headers, rows: rowObjs });
    }

    return out;
  });
}

async function extractAllTables(page) {
  const main = await extractTablesFromContext(page);
  const frames = page.frames().filter((f) => f !== page.mainFrame());
  const fromFrames = [];
  for (const fr of frames) {
    try {
      const t = await extractTablesFromContext(fr);
      if (t.length) fromFrames.push(...t);
    } catch {}
  }
  return [...main, ...fromFrames];
}

function rowToCells(table, rowObj) {
  return table.headers.map((h, i) => {
    if (h in rowObj) return clean(String(rowObj[h] ?? ""));
    const fallback = rowObj[`col_${i}`];
    return clean(String(fallback ?? ""));
  });
}

/** ---------- Marcador + equipos (SIN innerText) ---------- **/
function cleanScoreCandidate(raw) {
  return String(raw ?? "")
    .replace(/\\0{2,}\d+/g, " ")
    .replace(/idh\d+/g, " ")
    .replace(/content:"[^"]*"/g, " ")
    .replace(/\{[^}]*\}/g, " ")
    .replace(/[^0-9\- ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractScoreFromTable(table) {
  for (const r of table.rows || []) {
    for (const v of Object.values(r)) {
      const s = cleanScoreCandidate(v);
      const m = s.match(/(\d+)\s*-\s*(\d+)/);
      if (m) return { home: Number(m[1]), away: Number(m[2]) };
    }
  }
  return null;
}

function looksLikeTeamName(s) {
  const x = clean(s);
  if (!x) return false;
  if (/^\d+$/.test(x)) return false;
  // que tenga letras
  return /[A-ZÁÉÍÓÚÜÑa-z]/.test(x);
}

function findScoreboardTable(tables) {
  const teamN = normBasic(TEAM);
  const candidates = [];

  for (const t of tables) {
    if (!t.headers || t.headers.length < 2) continue;
    const first = t.headers[0];
    const last = [...t.headers].reverse().find((h) => clean(h)) || "";

    if (!looksLikeTeamName(first) || !looksLikeTeamName(last)) continue;

    const h0 = normBasic(first);
    const hL = normBasic(last);

    // La del marcador casi siempre tiene el TEAM en cabecera
    if (!(h0.includes(teamN) || hL.includes(teamN))) continue;

    const score = extractScoreFromTable(t);
    candidates.push({ t, score });
  }

  // Preferimos la que tenga score detectado
  candidates.sort((a, b) => (b.score ? 1 : 0) - (a.score ? 1 : 0));
  return candidates[0] || null;
}

/** ---------- Plantillas (dorsal + nombre) ---------- **/
function looksLikePlayerListTable(t) {
  if (!t?.headers || t.headers.length !== 2) return false;
  if (!t.rows || t.rows.length < 5) return false;

  let ok = 0;
  for (const row of t.rows) {
    const [c1, c2] = rowToCells(t, row);
    if (/^\d+$/.test(c1) && c2.length > 2) ok++;
  }
  return ok >= Math.ceil(t.rows.length * 0.75);
}

function parsePlayerListTable(t) {
  const out = [];
  for (const row of t.rows) {
    const [num, name] = rowToCells(t, row);
    if (!/^\d+$/.test(num)) continue;
    if (!name) continue;
    out.push({ number: Number(num), name: clean(name) });
  }
  return out;
}

/** ---------- Index de nombres (para casar eventos aunque haya pequeñas variaciones) ---------- **/
function splitNameParts(full) {
  // "APELLIDOS, NOMBRE" -> { last: "APELLIDOS", given: "NOMBRE" }
  const s = clean(full);
  const parts = s.split(",");
  if (parts.length >= 2) {
    return { last: clean(parts[0]), given: clean(parts.slice(1).join(", ")) };
  }
  // fallback: último token como nombre
  const toks = s.split(" ").filter(Boolean);
  return { last: toks.slice(0, -1).join(" "), given: toks.slice(-1).join(" ") };
}

function buildRosterIndex(players) {
  const exact = new Map(); // normName -> official
  const byLast = new Map(); // lastNorm -> array of {givenNorm, official}

  for (const p of players) {
    const official = p.name;
    exact.set(normName(official), official);

    const { last, given } = splitNameParts(official);
    const lk = normName(last);
    const gk = normName(given);

    if (!byLast.has(lk)) byLast.set(lk, []);
    byLast.get(lk).push({ given: gk, official });
  }

  function resolve(name) {
    const n = normName(name);
    if (exact.has(n)) return exact.get(n);

    const { last, given } = splitNameParts(name);
    const lk = normName(last);
    const gk = normName(given);

    const options = byLast.get(lk);
    if (!options) return null;

    // match por inicial del nombre si coincide apellido
    const initial = gk ? gk[0] : null;
    for (const opt of options) {
      if (!opt.given) continue;
      if (initial && opt.given[0] === initial) return opt.official;
    }

    // si solo hay 1 opción por apellido, la aceptamos
    if (options.length === 1) return options[0].official;

    return null;
  }

  function has(name) {
    return !!resolve(name);
  }

  return { resolve, has };
}

/** ---------- Sustituciones ---------- **/
function parseSubstitutionTable(t) {
  if (normBasic(t.title || "") !== "sustituciones") return null;
  if (!t.rows || t.rows.length < 2) return null;

  const [inNum, inName] = rowToCells(t, t.rows[0]);
  const [outNum, outText] = rowToCells(t, t.rows[1]);

  const m = outText.match(/\((\d+)'\)\s*(.+)$/);
  if (!m) return null;

  return {
    minute: Number(m[1]),
    in: { number: /^\d+$/.test(inNum) ? Number(inNum) : null, name: clean(inName) },
    out: { number: /^\d+$/.test(outNum) ? Number(outNum) : null, name: clean(m[2]) },
  };
}

/** ---------- Eventos: goles + amarillas ---------- **/
function extractMinuteAndName(text) {
  const m = (text || "").match(/\((\d+)'\)\s*([A-ZÁÉÍÓÚÜÑ ,.'-]+)$/i);
  if (!m) return null;
  return { minute: Number(m[1]), name: clean(m[2]) };
}

function tableLooksLikeGoalsTable(t) {
  const blob = `${t.title || ""} ${t.context || ""} ${t.headers?.join(" ") || ""}`.toLowerCase();
  if (blob.includes("gol") || blob.includes("penalti") || blob.includes("propia puerta")) return true;

  // fallback: muchas apariciones "(min')" dentro de celdas
  let hits = 0;
  for (const row of t.rows || []) {
    const cells = rowToCells(t, row);
    for (const c of cells) {
      if (/\(\d+'\)/.test(c)) hits++;
    }
  }
  return hits >= 3;
}

function extractGoals(tables, rosterIndex) {
  const goals = [];
  for (const t of tables) {
    if (!tableLooksLikeGoalsTable(t)) continue;

    for (const row of t.rows || []) {
      const cells = rowToCells(t, row);
      for (const c of cells) {
        const ev = extractMinuteAndName(c);
        if (!ev) continue;

        const official = rosterIndex.resolve(ev.name);
        if (!official) continue;

        goals.push({ minute: ev.minute, player: official });
      }
    }
  }
  goals.sort((a, b) => a.minute - b.minute);
  return goals;
}

function extractYellowsFromText(tables, rosterIndex) {
  const yellows = [];
  for (const t of tables) {
    const ctx = t.context || "";
    if (!/Tarjetas/i.test(ctx)) continue;

    const regex = /\((\d+)'\)\s*([A-ZÁÉÍÓÚÜÑ ,.'-]+)/g;
    let m;
    while ((m = regex.exec(ctx)) !== null) {
      const minute = Number(m[1]);
      const name = clean(m[2]);
      const official = rosterIndex.resolve(name);
      if (!official) continue;
      yellows.push({ minute, player: official, color: "yellow" });
    }
  }
  yellows.sort((a, b) => a.minute - b.minute);
  return yellows;
}

/** ---------- Alineación final con minutos + stats ---------- **/
function buildLineup({ starters, bench, subs, goals, yellows }) {
  const by = new Map();

  const upsert = (p) => {
    const k = normName(p.name);
    if (!by.has(k)) {
      by.set(k, {
        number: p.number ?? null,
        name: p.name,
        role: "unused", // starter|sub|unused
        from: null,
        to: null,
        minutesPlayed: 0,
        goals: 0,
        yellows: 0,
      });
    }
    const obj = by.get(k);
    if (p.number != null) obj.number = p.number;
    return obj;
  };

  for (const p of starters) {
    const obj = upsert(p);
    obj.role = "starter";
    obj.from = 0;
    obj.to = MATCH_MINUTES;
  }
  for (const p of bench) upsert(p);

  for (const s of subs) {
    const inObj = upsert(s.in);
    const outObj = upsert(s.out);

    inObj.role = "sub";
    inObj.from = s.minute;
    inObj.to = MATCH_MINUTES;

    if (outObj.from === null) outObj.from = 0;
    outObj.to = s.minute;
  }

  for (const g of goals) {
    const obj = upsert({ name: g.player });
    obj.goals += 1;
  }
  for (const c of yellows) {
    const obj = upsert({ name: c.player });
    obj.yellows += 1;
  }

  for (const obj of by.values()) {
    if (obj.from !== null) {
      const to = obj.to ?? MATCH_MINUTES;
      obj.minutesPlayed = Math.max(0, to - obj.from);
    } else {
      obj.minutesPlayed = 0;
      obj.to = null;
    }
  }

  return Array.from(by.values()).sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
}

/** ---------- Jornada: sacar CodActa solo de la fila del Sant Jordi ---------- **/
async function getActasForTeamFromJornada(page) {
  const teamN = normBasic(TEAM);

  const actas = await page.evaluate(({ teamN }) => {
    const norm = (s) => (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const rows = Array.from(document.querySelectorAll("tr")).filter((tr) => norm(tr.innerText).includes(teamN));

    const ids = new Set();

    const grabFromString = (s) => {
      if (!s) return;
      for (const m of String(s).matchAll(/CodActa=(\d+)/gi)) ids.add(m[1]);
      for (const m of String(s).matchAll(/cod_acta=(\d+)/gi)) ids.add(m[1]);
    };

    for (const tr of rows) {
      grabFromString(tr.innerHTML);

      for (const a of tr.querySelectorAll("a[href]")) grabFromString(a.getAttribute("href"));
      for (const el of tr.querySelectorAll("[onclick]")) grabFromString(el.getAttribute("onclick"));
    }

    return Array.from(ids);
  }, { teamN });

  return actas;
}

/** ---------- Scrape partido ---------- **/
async function scrapeMatch(context, matchUrl, jornadaN) {
  const page = await context.newPage();
  try {
    await page.goto(matchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    try { await page.waitForSelector("table", { timeout: 15000 }); } catch {}

    const tables = await extractAllTables(page);

    const sb = findScoreboardTable(tables);
    if (!sb) return null;

    const first = clean(sb.t.headers[0]);
    const last = clean([...sb.t.headers].reverse().find((h) => clean(h)) || "");
    const localTeam = first;
    const awayTeam = last;

    const isSantJordi =
      normBasic(localTeam).includes(normBasic(TEAM)) ||
      normBasic(awayTeam).includes(normBasic(TEAM));
    if (!isSantJordi) return null;

    const homeAway = normBasic(localTeam).includes(normBasic(TEAM)) ? "home" : "away";
    const opponent = homeAway === "home" ? awayTeam : localTeam;

    const score = sb.score || extractScoreFromTable(sb.t) || null;

    // Plantillas (orden típico FFIB)
    const rosterTables = tables.filter(looksLikePlayerListTable);
    const localStarters = rosterTables[0] ? parsePlayerListTable(rosterTables[0]) : [];
    const localBench    = rosterTables[1] ? parsePlayerListTable(rosterTables[1]) : [];
    const awayStarters  = rosterTables[2] ? parsePlayerListTable(rosterTables[2]) : [];
    const awayBench     = rosterTables[3] ? parsePlayerListTable(rosterTables[3]) : [];

    const starters = homeAway === "home" ? localStarters : awayStarters;
    const bench    = homeAway === "home" ? localBench : awayBench;

    const rosterIndex = buildRosterIndex([...starters, ...bench]);

    const subs = tables.map(parseSubstitutionTable).filter(Boolean)
      .filter((s) => rosterIndex.has(s.in.name) || rosterIndex.has(s.out.name))
      .map((s) => ({
        minute: s.minute,
        in: { ...s.in, name: rosterIndex.resolve(s.in.name) || s.in.name },
        out:{ ...s.out,name: rosterIndex.resolve(s.out.name) || s.out.name },
      }))
      .sort((a, b) => a.minute - b.minute);

    const goals = extractGoals(tables, rosterIndex);
    const yellows = extractYellowsFromText(tables, rosterIndex);

    const lineup = buildLineup({ starters, bench, subs, goals, yellows });

    return {
      jornada: jornadaN,
      acta: getActaId(matchUrl),
      url: matchUrl,
      match: {
        homeTeam: localTeam,
        awayTeam: awayTeam,
        score,
        santJordiSide: homeAway,
        opponent,
      },
      events: {
        goals,
        yellows,
        substitutions: subs, // minuto + IN/OUT (quién por quién)
      },
      lineup, // alineación con minutos + stats
    };
  } finally {
    await page.close();
  }
}

/** ---------- Markdown ---------- **/
function matchToMarkdown(m) {
  const home = m.match.homeTeam;
  const away = m.match.awayTeam;
  const sh = m.match.score?.home ?? "?";
  const sa = m.match.score?.away ?? "?";

  const lines = [];
  lines.push(`## Jornada ${m.jornada}`);
  lines.push(`### ${home} ${sh} - ${sa} ${away}`);
  lines.push(`- Sant Jordi: **${m.match.santJordiSide === "home" ? "LOCAL" : "VISITANTE"}** | Rival: **${m.match.opponent}**`);
  lines.push(`- Acta: ${m.acta ?? "-"} | URL: ${m.url}`);
  lines.push("");

  lines.push("**Goles (Sant Jordi):**");
  lines.push(m.events.goals.length ? m.events.goals.map(g => `- ${pad2(g.minute)}' ${g.player}`).join("\n") : "- (sin goles)");
  lines.push("");

  lines.push("**Amarillas (Sant Jordi):**");
  lines.push(m.events.yellows.length ? m.events.yellows.map(c => `- ${pad2(c.minute)}' ${c.player}`).join("\n") : "- (sin amarillas)");
  lines.push("");

  lines.push("**Cambios (quién por quién):**");
  lines.push(
    m.events.substitutions.length
      ? m.events.substitutions.map(s => `- ${pad2(s.minute)}' ${s.in.number} ${s.in.name} ↔ ${s.out.number} ${s.out.name}`).join("\n")
      : "- (sin cambios)"
  );
  lines.push("");

  lines.push("**Alineación Sant Jordi (minutos de-a):**");
  lines.push("| # | Jugador | Rol | Min (de-a) | Jugados | Goles | Amarillas |");
  lines.push("|---:|---|---|---|---:|---:|---:|");

  for (const p of m.lineup) {
    const role = p.role === "starter" ? "Titular" : p.role === "sub" ? "Suplente" : "No jugó";
    const fromTo = p.from === null ? "-" : `${p.from}-${p.to ?? MATCH_MINUTES}`;
    lines.push(`| ${p.number ?? "-"} | ${p.name} | ${role} | ${fromTo} | ${p.minutesPlayed} | ${p.goals} | ${p.yellows} |`);
  }

  lines.push("\n---\n");
  return lines.join("\n");
}

/** ---------- MAIN ---------- **/
async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (compatible; FFIBScraper/3.1)",
  });

  try {
    // Sesión
    const s = await context.newPage();
    await s.goto(START_SESS_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await s.close();

    const result = {
      meta: {
        generatedAt: new Date().toISOString(),
        team: TEAM,
        fromJornada: FROM_JORNADA,
        toJornada: TO_JORNADA,
        matchMinutes: MATCH_MINUTES,
        params: { COD_PRIMARIA, COD_COMPETICION, COD_GRUPO, COD_TEMPORADA, SCH_DELEGACION },
      },
      jornadas: [],
      matches: [],
    };

    let md = `# Reporte FFIB - ${TEAM}\n\nJornadas ${FROM_JORNADA} a ${TO_JORNADA}\n\n---\n\n`;

    for (let j = FROM_JORNADA; j <= TO_JORNADA; j++) {
      const urlJ = stripHash(jornadaUrl(j));

      const page = await context.newPage();
      try {
        await page.goto(urlJ, { waitUntil: "domcontentloaded", timeout: 30000 });
        try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch {}

        // ✅ Actas SOLO del Sant Jordi en esa jornada
        const actas = await getActasForTeamFromJornada(page);

        const matchesThisJ = [];
        for (const acta of actas) {
          const mu = matchUrlFromActa(acta);
          const m = await scrapeMatch(context, mu, j);
          if (m) matchesThisJ.push(m);
        }

        // dedup por acta
        const seen = new Set();
        const dedup = [];
        for (const m of matchesThisJ) {
          const key = m.acta || m.url;
          if (seen.has(key)) continue;
          seen.add(key);
          dedup.push(m);
        }

        result.jornadas.push({ jornada: j, url: urlJ, actas, matches: dedup });

        for (const m of dedup) {
          result.matches.push(m);
          md += matchToMarkdown(m);
        }

      } finally {
        await page.close();
      }
    }

    // ordenar
    result.matches.sort((a, b) => a.jornada - b.jornada);

    await fs.writeFile(OUT_JSON, JSON.stringify(result, null, 2), "utf-8");
    await fs.writeFile(OUT_MD, md, "utf-8");

    console.log("OK =>", OUT_JSON);
    console.log("OK =>", OUT_MD);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});