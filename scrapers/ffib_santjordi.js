import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const chunk = argv[index];
    if (!chunk.startsWith("--")) {
      continue;
    }
    const eqIndex = chunk.indexOf("=");
    if (eqIndex !== -1) {
      out[chunk.slice(2, eqIndex)] = chunk.slice(eqIndex + 1);
      continue;
    }
    const key = chunk.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      out[key] = "true";
      continue;
    }
    out[key] = next;
    index += 1;
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

const BASE_URL = "https://www.ffib.es";
const START_SESS_URL = `${BASE_URL}/Fed/NLogin?NSess=1`;
const TEAM_PAGE_URL = `${BASE_URL}/Fed/NPcd/NFG_VisEquipos?cod_primaria=1000109&Codigo_Equipo=131039`;

const TEAM = "PE SANT JORDI";
const TEAM_CODE = 131039;

const COD_PRIMARIA = 1000110;
const COD_COMPETICION = 22536446;
const COD_GRUPO = 22750685;
const COD_TEMPORADA = 21;
const SCH_CODIGO_DELEGACION = 1;

const FROM_JORNADA = Number(args.fromJornada || 1);
const TO_JORNADA = Number(args.toJornada || 11);
const MATCH_MINUTES = Number(args.matchMinutes || 90);
const ALLOW_PARTIAL = String(args["allow-partial"] || "true") !== "false";

const OUT_JSON = path.join(__dirname, "ffib_pe_sant_jordi_j1_11_clean.json");
const OUT_MD = path.join(__dirname, "ffib_pe_sant_jordi_j1_11_report.md");
const DEBUG_DIR = path.join(__dirname, "debug");
const CACHE_DIR = path.join(__dirname, "cache", "ffib");
const ACTA_READY_TIMEOUT_MS = 15000;
const ACTA_MIN_TABLES = 8;
const ACTA_RETRY_LIMIT = 2;
const ACTA_EMPTY_HTML_MAX_CHARS = 120;
const ACTA_EMPTY_EARLY_EXIT_MS = 1200;
const ACTA_POLL_INTERVAL_MS = 400;

const FIXTURES = {
  teamPage: path.join(__dirname, "team_page.html"),
  teamCompetitions: path.join(__dirname, "team_comp.html"),
  teamGroup: path.join(__dirname, "grp.body.html"),
  jornada11: path.join(__dirname, "jor.body.html"),
  acta732057: path.join(__dirname, "acta_732057.html"),
};

const LEGACY_FILES = [
  path.join(__dirname, "ffib_pe_sant_jordi_1_11_structured.json"),
  path.join(__dirname, "ffib_pe_sant_jordi_structured.json"),
];

const KNOWN_ACTAS = {
  1: "732006",
  2: "732012",
  3: "732017",
  4: "732023",
  5: "732028",
  6: "732034",
  7: "732039",
  8: "732044",
  9: "732048",
  10: "732051",
  11: "732057",
};

const DOM_HELPERS_SOURCE = `
(() => {
  const cleanText = (value) => String(value || "").replace(/\\u00a0/g, " ").replace(/\\s+/g, " ").trim();
  const normalizeText = (value) =>
    cleanText(value)
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .toUpperCase()
      .trim();

  const decodeCssContent = (value) => {
    if (!value || value === "none" || value === "normal") {
      return "";
    }
    let output = value.trim();
    if ((output.startsWith('"') && output.endsWith('"')) || (output.startsWith("'") && output.endsWith("'"))) {
      output = output.slice(1, -1);
    }
    output = output.replace(/\\\\([0-9a-fA-F]{1,6})\\s?/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
    return output;
  };

  const pseudoText = (element, pseudo) => {
    const style = getComputedStyle(element, pseudo);
    if (!style || style.display === "none" || style.visibility === "hidden") {
      return "";
    }
    return decodeCssContent(style.content);
  };

  const elementHidden = (element) => {
    const style = getComputedStyle(element);
    return style.display === "none" || style.visibility === "hidden";
  };

  const classDigit = (element) => {
    const className = typeof element.className === "string" ? element.className : "";
    const match = className.match(/(?:^|\\s)fa-(\\d+)(?:\\s|$)/);
    return match ? match[1] : "";
  };

  const readVisibleText = (node) => {
    if (!node) {
      return "";
    }
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }
    const element = node;
    if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) {
      return "";
    }
    if (elementHidden(element)) {
      return "";
    }
    const before = pseudoText(element, "::before");
    const after = pseudoText(element, "::after");
    const childrenText = Array.from(element.childNodes).map(readVisibleText).join("");
    const digit = classDigit(element);
    const middle = digit && !cleanText(childrenText) ? digit : childrenText;
    return before + middle + after;
  };

  const extractScore = (node) => {
    const raw = cleanText(readVisibleText(node));
    const match = raw.match(/(\\d+)\\s*-\\s*(\\d+)/);
    return {
      raw,
      score: match ? { home: Number(match[1]), away: Number(match[2]) } : null,
    };
  };

  const extractMinuteAndName = (value) => {
    const raw = cleanText(value);
    const match = raw.match(/\\((\\d+)'\\)\\s*(.+)$/);
    if (!match) {
      return null;
    }
    return {
      minute: Number(match[1]),
      name: cleanText(match[2]),
      raw,
    };
  };

  window.__ffibHelpers = {
    cleanText,
    normalizeText,
    readVisibleText,
    extractScore,
    extractMinuteAndName,
  };
})();
`;

function log(step, message) {
  console.log(`[ffib] ${step} ${message}`);
}

function cleanText(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .toUpperCase()
    .trim();
}

function toAbsoluteUrl(input) {
  if (!input) {
    return null;
  }
  return new URL(input, BASE_URL).toString();
}

function jornadaUrl(jornada) {
  return `${BASE_URL}/Fed/NPcd/NFG_CmpJornada?cod_primaria=${COD_PRIMARIA}&CodCompeticion=${COD_COMPETICION}&CodGrupo=${COD_GRUPO}&CodTemporada=${COD_TEMPORADA}&CodJornada=${jornada}&Sch_Codigo_Delegacion=${SCH_CODIGO_DELEGACION}`;
}

function teamCompetitionsUrl() {
  return `${BASE_URL}/Fed/NPcd/NFG_VisCompeticiones_Equipo?cod_primaria=1000113&codequipo=${TEAM_CODE}&codtemporada=${COD_TEMPORADA}`;
}

function teamGroupUrl() {
  return `${BASE_URL}/Fed/NPcd/NFG_VisCompeticiones_Grupo?cod_primaria=1000113&codequipo=${TEAM_CODE}&codgrupo=${COD_GRUPO}`;
}

function actaUrl(acta) {
  return `${BASE_URL}/Fed/NPcd/NFG_CmpPartido?cod_primaria=${COD_PRIMARIA}&CodActa=${acta}&cod_acta=${acta}`;
}

function parseActaFromUrl(url) {
  if (!url) {
    return null;
  }
  const parsed = new URL(url, BASE_URL);
  return parsed.searchParams.get("CodActa") || parsed.searchParams.get("cod_acta");
}

function scoreForSantJordi(match) {
  if (!match || !match.match || !match.match.score) {
    return null;
  }
  return match.match.santJordiSide === "home" ? match.match.score.home : match.match.score.away;
}

function slug(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function isMeaningfulHtml(html, markers = []) {
  const value = String(html || "").trim();
  if (value.length < 300) {
    return false;
  }
  if (markers.length === 0) {
    return /<html/i.test(value) || value.length > 1000;
  }
  return markers.some((marker) => value.includes(marker));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readFixture(filePath) {
  if (!(await exists(filePath))) {
    return "";
  }
  return fs.readFile(filePath, "latin1");
}

async function writeUtf8(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, "utf8");
}

async function installBrowseBlockers(page) {
  await page.route("**/*", (route) => {
    const requestUrl = route.request().url();
    let hostname = "";
    try {
      hostname = new URL(requestUrl).hostname.toLowerCase();
    } catch {
      hostname = "";
    }
    if (hostname.endsWith("ffib.es")) {
      return route.continue();
    }
    if (
      /doubleclick|googleads|googlesyndication|adservice|google-analytics|googletagmanager|refinery89/i.test(hostname)
    ) {
      return route.abort();
    }
    return route.continue();
  });
}

async function createParserPage(browser) {
  const page = await browser.newPage();
  await page.route("**/*", (route) => route.abort());
  await page.addInitScript(() => {
    const noop = () => {};
    let chain = null;
    chain = new Proxy(noop, {
      get() {
        return chain;
      },
      apply() {
        return chain;
      },
    });
    window.$ = window.jQuery = () => chain;
    window.Nova_Ajax = noop;
    window.Select_Init = noop;
    window.page = noop;
  });
  return page;
}

async function prepareParserPage(page, html, baseUrl) {
  await page.setContent(html, { waitUntil: "domcontentloaded" });
  if (baseUrl) {
    await page.evaluate((value) => {
      let base = document.querySelector("base");
      if (!base) {
        base = document.createElement("base");
        document.head.prepend(base);
      }
      base.href = value;
    }, baseUrl);
  }
  await page.addScriptTag({ content: DOM_HELPERS_SOURCE });
  await page.waitForTimeout(150);
}

async function primeSession(context) {
  const page = await context.newPage();
  try {
    await installBrowseBlockers(page);
    await page.goto(START_SESS_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
    await page.waitForTimeout(200);
  } finally {
    await page.close();
  }
}

async function fetchHtmlViaPage(context, url, markers) {
  const page = await context.newPage();
  try {
    await installBrowseBlockers(page);

    const sequence = [url, `${BASE_URL}/Fed/NLogin`, url];
    let lastHtml = "";
    let lastStatus = null;
    let lastUrl = url;

    for (const target of sequence) {
      const response = await page
        .goto(String(target || "").replace(/#google_vignette$/i, ""), {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        })
        .catch(() => null);
      lastStatus = response?.status?.() ?? lastStatus;
      await page.waitForTimeout(250);
      const html = await page.content().catch(() => "");
      lastHtml = html;
      lastUrl = page.url();
      if (isMeaningfulHtml(html, markers)) {
        return {
          html,
          finalUrl: lastUrl,
          status: lastStatus,
          source: "live-page",
        };
      }
    }

    return {
      html: lastHtml,
      finalUrl: lastUrl,
      status: lastStatus,
      source: "live-page",
    };
  } finally {
    await page.close();
  }
}

async function fetchHtmlViaRequest(context, url, markers) {
  const request = context.request;
  const attempts = [START_SESS_URL, url, `${BASE_URL}/Fed/NLogin`, url];
  let lastHtml = "";
  let lastStatus = null;
  let lastUrl = url;

  for (const target of attempts) {
    const response = await request
      .get(target, {
        failOnStatusCode: false,
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Referer: BASE_URL,
        },
      })
      .catch(() => null);
    if (!response) {
      continue;
    }
    lastStatus = response.status();
    lastUrl = target;
    const html = await response.text().catch(() => "");
    lastHtml = html;
    if (target === url && isMeaningfulHtml(html, markers)) {
      return {
        html,
        finalUrl: target,
        status: lastStatus,
        source: "live-request",
      };
    }
  }

  return {
    html: lastHtml,
    finalUrl: lastUrl,
    status: lastStatus,
    source: "live-request",
  };
}

async function loadHtml(context, label, url, options = {}) {
  const markers = options.markers || [];
  const fixtureFiles = options.fixtureFiles || [];
  const cacheFile = path.join(CACHE_DIR, `${slug(label)}.html`);

  if (await exists(cacheFile)) {
    const cached = await fs.readFile(cacheFile, "utf8");
    if (isMeaningfulHtml(cached, markers)) {
      log("cache", `${label} -> ${cacheFile}`);
      return {
        html: cached,
        source: "cache",
        url,
      };
    }
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const fromRequest = await fetchHtmlViaRequest(context, url, markers);
    if (isMeaningfulHtml(fromRequest.html, markers)) {
      await writeUtf8(cacheFile, fromRequest.html);
      log("live", `${label} via request (attempt ${attempt})`);
      return {
        html: fromRequest.html,
        source: fromRequest.source,
        url: fromRequest.finalUrl || url,
      };
    }

    const fromPage = await fetchHtmlViaPage(context, url, markers);
    if (isMeaningfulHtml(fromPage.html, markers)) {
      await writeUtf8(cacheFile, fromPage.html);
      log("live", `${label} via page (attempt ${attempt})`);
      return {
        html: fromPage.html,
        source: fromPage.source,
        url: fromPage.finalUrl || url,
      };
    }
  }

  for (const fixtureFile of fixtureFiles) {
    const fixtureHtml = await readFixture(fixtureFile);
    if (isMeaningfulHtml(fixtureHtml, markers)) {
      log("fixture", `${label} -> ${path.basename(fixtureFile)}`);
      return {
        html: fixtureHtml,
        source: "fixture",
        url,
      };
    }
  }

  if (await exists(cacheFile)) {
    const cached = await fs.readFile(cacheFile, "utf8");
    if (cached.trim()) {
      log("cache", `${label} -> stale cache`);
      return {
        html: cached,
        source: "cache-stale",
        url,
      };
    }
  }

  log("warn", `${label} -> no HTML`);
  return {
    html: "",
    source: "missing",
    url,
  };
}

async function inspectActaState(page) {
  return page.evaluate(
    ({ minRows }) => {
      const clean = (value) => String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
      const bodyText = clean(document.body?.innerText || document.body?.textContent || "");
      const tables = Array.from(document.querySelectorAll("table"));
      const rosterTables = tables.filter((table) => {
        const rows = Array.from(table.querySelectorAll("tr")).map((row) => Array.from(row.querySelectorAll("td")));
        const validRows = rows.filter((cells) => {
          if (cells.length < 2) {
            return false;
          }
          const number = clean(cells[0].textContent);
          const name = clean(cells[1].textContent);
          return /^\d+$/.test(number) && name.length > 2;
        });
        return validRows.length >= minRows;
      });
        return {
          tablesCount: tables.length,
          rosterTableCount: rosterTables.length,
          hasTitulares: /Titulares/i.test(bodyText),
          hasSuplentes: /Suplentes/i.test(bodyText),
          hasActaTitle: /Acta del partido/i.test(bodyText),
          bodyTextSample: bodyText.slice(0, 2000),
          url: window.location.href,
        };
      },
    {
      minRows: 5,
    },
  );
}

async function inspectActaHtml(parserPage, html, url) {
  if (!html) {
    return {
      complete: false,
      tablesCount: 0,
      rosterTableCount: 0,
      hasTitulares: false,
      hasSuplentes: false,
      hasActaTitle: false,
      reason: "html vacio",
    };
  }
  await prepareParserPage(parserPage, html, url);
  const state = await inspectActaState(parserPage);
  return {
    ...state,
    complete: state.rosterTableCount >= 2 && state.hasTitulares && state.hasSuplentes,
    reason:
      state.rosterTableCount >= 2 && state.hasTitulares && state.hasSuplentes
        ? null
        : `incompleta: titulares=${state.hasTitulares} suplentes=${state.hasSuplentes} rosterTables=${state.rosterTableCount} tables=${state.tablesCount}`,
  };
}

function isActaHtmlObviouslyEmpty(html, state) {
  const compactHtml = String(html || "").replace(/\s+/g, " ").trim();
  const bodySample = cleanText(state?.bodyTextSample || "");
  return (
    compactHtml.length <= ACTA_EMPTY_HTML_MAX_CHARS &&
    (state?.tablesCount || 0) === 0 &&
    (state?.rosterTableCount || 0) === 0 &&
    !state?.hasTitulares &&
    !state?.hasSuplentes &&
    bodySample.length === 0
  );
}

async function waitForActaReady(page) {
  const startedAt = Date.now();
  let lastHtml = "";
  let lastState = null;

  while (Date.now() - startedAt < ACTA_READY_TIMEOUT_MS) {
    lastHtml = await page.content().catch(() => "");
    lastState = await inspectActaState(page).catch(() => null);

    if (
      lastState &&
      (lastState.hasTitulares ||
        lastState.hasSuplentes ||
        lastState.tablesCount >= ACTA_MIN_TABLES ||
        lastState.rosterTableCount >= 2)
    ) {
      return {
        ready: true,
        html: lastHtml,
        state: lastState,
        reason: null,
      };
    }

    if (Date.now() - startedAt >= ACTA_EMPTY_EARLY_EXIT_MS && isActaHtmlObviouslyEmpty(lastHtml, lastState)) {
      return {
        ready: false,
        html: lastHtml,
        state: lastState,
        reason: "acta vacia o cuerpo minimo tras cargar el partido",
      };
    }

    await page.waitForTimeout(ACTA_POLL_INTERVAL_MS);
  }

  lastHtml = await page.content().catch(() => lastHtml);
  lastState = await inspectActaState(page).catch(() => lastState);
  return {
    ready: false,
    html: lastHtml,
    state: lastState,
    reason: `timeout esperando Titulares/Suplentes o >=${ACTA_MIN_TABLES} tablas`,
  };
}

async function saveActaDiagnostics(page, acta, html, xhrLog, state, errorMessage) {
  await ensureDir(DEBUG_DIR);
  const base = path.join(DEBUG_DIR, `acta-${acta}`);
  await writeUtf8(`${base}.html`, html || "");
  await writeUtf8(
    `${base}.xhr.json`,
    `${JSON.stringify(
      {
        acta,
        error: errorMessage || null,
        state: state || null,
        xhr: xhrLog || [],
      },
      null,
      2,
    )}\n`,
  );
  if (page) {
    try {
      await page.screenshot({ path: `${base}.png`, fullPage: true });
    } catch {
      await fs.writeFile(`${base}.png`, "");
    }
  } else {
    await fs.writeFile(`${base}.png`, "");
  }
}

async function loadActaWithRetries(context, parserPage, acta, options = {}) {
  const url = actaUrl(acta);
  const cacheFile = path.join(CACHE_DIR, `acta-${acta}.html`);
  const fixtureFiles = options.fixtureFiles || [];

  if (await exists(cacheFile)) {
    const cached = await fs.readFile(cacheFile, "utf8");
    const cachedState = await inspectActaHtml(parserPage, cached, url);
    if (cachedState.complete) {
      log("cache", `acta-${acta} -> ${cacheFile}`);
      return {
        html: cached,
        source: "cache",
        complete: true,
        state: cachedState,
        error: null,
      };
    }
  }

  const page = await context.newPage();
  const xhrLog = [];
  let lastHtml = "";
  let lastState = null;
  let lastError = null;
  let currentAttempt = 0;

  page.on("response", async (response) => {
    try {
      const request = response.request();
      if (request.resourceType() !== "xhr") {
        return;
      }
      xhrLog.push({
        attempt: currentAttempt,
        url: response.url(),
        status: response.status(),
        method: request.method(),
      });
    } catch {}
  });

  try {
    await installBrowseBlockers(page);

    for (let attempt = 0; attempt <= ACTA_RETRY_LIMIT; attempt += 1) {
      currentAttempt = attempt;
      if (attempt > 0) {
        log("retry", `acta ${acta} intento ${attempt}/${ACTA_RETRY_LIMIT}`);
        await page.goto(START_SESS_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
        await page.waitForTimeout(250);
      }

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null);
      const readyResult = await waitForActaReady(page);
      lastHtml = readyResult.html || (await page.content().catch(() => ""));
      lastState = readyResult.state || (await inspectActaState(page).catch(() => null));
      const complete = Boolean(
        lastState && lastState.rosterTableCount >= 2 && lastState.hasTitulares && lastState.hasSuplentes,
      );
      if (complete) {
        await writeUtf8(cacheFile, lastHtml);
        return {
          html: lastHtml,
          source: "live-acta",
          complete: true,
          state: {
            ...lastState,
            complete: true,
            reason: null,
          },
          error: null,
        };
      }
      lastError = lastState
        ? `acta incompleta: titulares=${lastState.hasTitulares} suplentes=${lastState.hasSuplentes} rosterTables=${lastState.rosterTableCount} tables=${lastState.tablesCount}${readyResult.reason ? ` | ${readyResult.reason}` : ""}`
        : readyResult.reason || "acta sin estado";
    }

    for (const fixtureFile of fixtureFiles) {
      const fixtureHtml = await readFixture(fixtureFile);
      const fixtureState = await inspectActaHtml(parserPage, fixtureHtml, url);
      if (fixtureState.complete) {
        log("fixture", `acta-${acta} -> ${path.basename(fixtureFile)}`);
        return {
          html: fixtureHtml,
          source: "fixture",
          complete: true,
          state: fixtureState,
          error: null,
        };
      }
    }

    await saveActaDiagnostics(page, acta, lastHtml, xhrLog, lastState, lastError);
    return {
      html: lastHtml,
      source: "failed-acta",
      complete: false,
      state: lastState,
      error: lastError || "acta incompleta tras reintentos",
      xhrLog,
    };
  } finally {
    await page.close();
  }
}

async function parseTeamPage(parserPage, html) {
  await prepareParserPage(parserPage, html, TEAM_PAGE_URL);
  return parserPage.evaluate(
    ({ baseUrl, teamCode, seasonCode }) => {
      const link = Array.from(document.querySelectorAll("a[href]")).find((anchor) => {
        const href = anchor.getAttribute("href") || "";
        return (
          /NFG_VisCompeticiones_Equipo/i.test(href) &&
          href.includes(`codequipo=${teamCode}`) &&
          href.includes(`codtemporada=${seasonCode}`)
        );
      });
      return {
        competitionHistoryUrl: link ? new URL(link.getAttribute("href"), baseUrl).toString() : null,
        title: window.__ffibHelpers.cleanText(document.title),
      };
    },
    {
      baseUrl: BASE_URL,
      teamCode: TEAM_CODE,
      seasonCode: COD_TEMPORADA,
    },
  );
}

async function parseCompetitionsPage(parserPage, html) {
  await prepareParserPage(parserPage, html, teamCompetitionsUrl());
  return parserPage.evaluate(
    ({ baseUrl, groupCode }) => {
      const clipboardLink = Array.from(document.querySelectorAll("a[href]")).find((anchor) => {
        const href = anchor.getAttribute("href") || "";
        return /NFG_VisCompeticiones_Grupo/i.test(href) && href.includes(`codgrupo=${groupCode}`);
      });
      return {
        groupUrl: clipboardLink ? new URL(clipboardLink.getAttribute("href"), baseUrl).toString() : null,
      };
    },
    {
      baseUrl: BASE_URL,
      groupCode: COD_GRUPO,
    },
  );
}

async function parseGroupSchedule(parserPage, html) {
  await prepareParserPage(parserPage, html, teamGroupUrl());
  return parserPage.evaluate(() => {
    const helper = window.__ffibHelpers;
    const table = Array.from(document.querySelectorAll("table")).find((element) => {
      const headers = Array.from(element.querySelectorAll("th")).map((cell) => helper.cleanText(cell.textContent));
      return headers.includes("Jor.") && headers.includes("Casa/Fuera") && headers.includes("Resultado");
    });
    if (!table) {
      return [];
    }
    return Array.from(table.querySelectorAll("tr"))
      .map((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length !== 3) {
          return null;
        }
        const jornada = Number(helper.cleanText(cells[0].textContent));
        if (!Number.isFinite(jornada)) {
          return null;
        }
        const infoBits = Array.from(cells[1].querySelectorAll("h5")).map((node) => helper.cleanText(node.textContent));
        return {
          jornada,
          homeTeam: infoBits[0] || "",
          awayTeam: infoBits[1] || "",
          kickoff: infoBits[2] || "",
          score: helper.extractScore(cells[2]).score,
        };
      })
      .filter(Boolean);
  });
}

async function parseJornadaCards(parserPage, html, jornada) {
  await prepareParserPage(parserPage, html, jornadaUrl(jornada));
  return parserPage.evaluate(
    ({ baseUrl }) => {
      const helper = window.__ffibHelpers;
      return Array.from(document.querySelectorAll('a[href*="NFG_CmpPartido"]')).map((anchor) => {
        const table = anchor.closest("table");
        const teamLinks = table ? Array.from(table.querySelectorAll('a[href*="NFG_VisEquipos"]')) : [];
        const strong = table ? table.querySelector("h4 strong") : null;
        const url = new URL(anchor.getAttribute("href"), baseUrl).toString();
        return {
          acta: new URL(url).searchParams.get("CodActa") || new URL(url).searchParams.get("cod_acta"),
          url,
          homeTeam: helper.cleanText(teamLinks[0]?.textContent),
          awayTeam: helper.cleanText(teamLinks[1]?.textContent),
          score: helper.extractScore(strong || table).score,
          text: helper.cleanText(table?.textContent),
        };
      });
    },
    {
      baseUrl: BASE_URL,
    },
  );
}

async function parseActaPage(parserPage, html, url) {
  await prepareParserPage(parserPage, html, url);
  return parserPage.evaluate(() => {
    const helper = window.__ffibHelpers;

    const parseRosterTable = (table) =>
      Array.from(table.querySelectorAll("tr"))
        .map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          if (cells.length < 2) {
            return null;
          }
          const number = Number(helper.cleanText(cells[0].textContent));
          const name = helper.cleanText(cells[1].textContent);
          if (!Number.isFinite(number) || !name) {
            return null;
          }
          return { number, name };
        })
        .filter(Boolean);

    const parseSubstitutionTable = (table) => {
      const rows = Array.from(table.querySelectorAll("tr")).filter((row) => row.querySelectorAll("td").length >= 2);
      if (rows.length < 2) {
        return null;
      }
      const inCells = Array.from(rows[0].querySelectorAll("td"));
      const outCells = Array.from(rows[1].querySelectorAll("td"));
      const inNumber = Number(helper.cleanText(inCells[0]?.textContent));
      const inName = helper.cleanText(inCells[1]?.textContent);
      const minuteAndName = helper.extractMinuteAndName(helper.readVisibleText(outCells[1]));
      const outNumber = Number(helper.cleanText(outCells[0]?.textContent));
      if (!minuteAndName) {
        return null;
      }
      return {
        minute: minuteAndName.minute,
        in: {
          number: Number.isFinite(inNumber) ? inNumber : null,
          name: inName,
        },
        out: {
          number: Number.isFinite(outNumber) ? outNumber : null,
          name: minuteAndName.name,
        },
      };
    };

    const parseCardsTable = (table) =>
      Array.from(table.querySelectorAll("tr"))
        .map((row) => {
          const cells = Array.from(row.querySelectorAll("td"));
          const carrier = cells[1] || row;
          const minuteAndName = helper.extractMinuteAndName(helper.readVisibleText(carrier));
          if (!minuteAndName) {
            return null;
          }
          const iconSource =
            row.querySelector("img")?.getAttribute("src") ||
            row.querySelector("i")?.className ||
            "";
          const type = /roj|red/i.test(iconSource) ? "red" : "yellow";
          return {
            minute: minuteAndName.minute,
            player: minuteAndName.name,
            type,
          };
        })
        .filter(Boolean);

    const parseTeamCard = (card) => {
      const title = helper.cleanText(card.querySelector(".number")?.textContent);
      const titleKey = helper.normalizeText(title);
      if (!title || titleKey === "GOLES" || titleKey === "ARBITROS") {
        return null;
      }
      const desc = card.querySelector(".desc");
      if (!desc) {
        return null;
      }

      const output = {
        teamName: title,
        starters: [],
        bench: [],
        substitutions: [],
        cards: [],
      };

      let section = "";
      for (const child of Array.from(desc.children)) {
        const text = helper.cleanText(child.textContent);
        const key = helper.normalizeText(text);

        if (key === "TITULARES") {
          section = "starters";
          continue;
        }
        if (key === "SUPLENTES") {
          section = "bench";
          continue;
        }
        if (key === "SUSTITUCIONES") {
          section = "subs";
          continue;
        }
        if (key === "TARJETAS") {
          section = "cards";
          continue;
        }
        if (child.tagName !== "TABLE") {
          continue;
        }

        if (section === "starters") {
          output.starters.push(...parseRosterTable(child));
        } else if (section === "bench") {
          output.bench.push(...parseRosterTable(child));
        } else if (section === "subs") {
          const sub = parseSubstitutionTable(child);
          if (sub) {
            output.substitutions.push(sub);
          }
        } else if (section === "cards") {
          output.cards.push(...parseCardsTable(child));
        }
      }

      if (!output.cards.length && /Tarjetas/i.test(helper.cleanText(desc.textContent))) {
        const fallbackMatches = Array.from(helper.readVisibleText(desc).matchAll(/\((\d+)'\)\s*([^\n]+?)(?=(\(\d+'\)|$))/g));
        for (const match of fallbackMatches) {
          output.cards.push({
            minute: Number(match[1]),
            player: helper.cleanText(match[2]),
            type: "yellow",
          });
        }
      }

      return output;
    };

    const topTable = Array.from(document.querySelectorAll("table")).find(
      (table) => table.querySelector(".font_widgetL") && table.querySelector(".font_widgetV"),
    );

    const homeTeam = helper.cleanText(topTable?.querySelector(".font_widgetL")?.textContent);
    const awayTeam = helper.cleanText(topTable?.querySelector(".font_widgetV")?.textContent);
    const score = helper.extractScore(topTable?.querySelector("h2.ntype strong")).score;

    const cards = Array.from(document.querySelectorAll(".dashboard-stat.grey"));
    const goalsCard = cards.find((card) => helper.normalizeText(card.querySelector(".number")?.textContent) === "GOLES");
    const teamCards = cards.map(parseTeamCard).filter(Boolean);

    const goalRows = [];
    if (goalsCard) {
      let previous = { home: 0, away: 0 };
      for (const row of Array.from(goalsCard.querySelectorAll("tr"))) {
        const cells = Array.from(row.querySelectorAll("td"));
        if (cells.length < 2) {
          continue;
        }
        const runningScore = helper.extractScore(cells[0]).score;
        const minuteAndName = helper.extractMinuteAndName(helper.readVisibleText(cells[1]));
        if (!minuteAndName || !runningScore) {
          continue;
        }
        let side = null;
        if (runningScore.home === previous.home + 1 && runningScore.away === previous.away) {
          side = "home";
        } else if (runningScore.away === previous.away + 1 && runningScore.home === previous.home) {
          side = "away";
        }
        previous = runningScore;
        goalRows.push({
          minute: minuteAndName.minute,
          playerName: minuteAndName.name,
          side,
          runningScore,
        });
      }
    }

    const headerText = helper.cleanText(document.querySelector(".font-grey-cascade")?.textContent);
    const jornadaMatch = headerText.match(/Jornada\\s+(\\d+)/i);

    return {
      jornada: jornadaMatch ? Number(jornadaMatch[1]) : null,
      headerText,
      homeTeam,
      awayTeam,
      score,
      teamCards,
      goals: goalRows,
    };
  });
}

function splitOfficialName(name) {
  const cleanName = cleanText(name);
  const parts = cleanName.split(",");
  if (parts.length >= 2) {
    return {
      last: normalizeText(parts[0]).split(" ").filter(Boolean),
      given: normalizeText(parts.slice(1).join(" ")).split(" ").filter(Boolean),
    };
  }
  const tokens = normalizeText(cleanName).split(" ").filter(Boolean);
  return {
    last: tokens.slice(0, -1),
    given: tokens.slice(-1),
  };
}

function buildRosterIndex(players) {
  const exact = new Map();
  const byNumber = new Map();
  const entries = [];

  for (const player of players) {
    const official = {
      number: player.number ?? null,
      name: cleanText(player.name),
    };
    const normalized = normalizeText(official.name);
    const parts = splitOfficialName(official.name);
    exact.set(normalized, official);
    if (official.number != null) {
      byNumber.set(String(official.number), official);
    }
    entries.push({
      official,
      normalized,
      lastKey: parts.last.join(" "),
      lastTokens: parts.last,
      givenTokens: parts.given,
    });
  }

  function resolveByName(name) {
    const normalized = normalizeText(name);
    if (!normalized) {
      return null;
    }
    if (exact.has(normalized)) {
      return exact.get(normalized);
    }

    const parts = splitOfficialName(name);
    const lastKey = parts.last.join(" ");
    const lastCandidates = entries.filter((entry) => entry.lastKey && entry.lastKey === lastKey);
    if (lastCandidates.length === 1) {
      return lastCandidates[0].official;
    }
    if (lastCandidates.length > 1 && parts.given.length) {
      const givenInitial = parts.given[0]?.[0] || "";
      const narrowed = lastCandidates.filter((entry) => (entry.givenTokens[0] || "").startsWith(givenInitial));
      if (narrowed.length === 1) {
        return narrowed[0].official;
      }
    }

    const tokenCandidates = entries.filter((entry) => {
      const allTokens = [...entry.lastTokens, ...entry.givenTokens];
      return parts.last.every((token) => allTokens.includes(token));
    });
    if (tokenCandidates.length === 1) {
      return tokenCandidates[0].official;
    }

    const containsCandidates = entries.filter(
      (entry) => entry.normalized.includes(normalized) || normalized.includes(entry.normalized),
    );
    if (containsCandidates.length === 1) {
      return containsCandidates[0].official;
    }

    return null;
  }

  return {
    players: entries.map((entry) => entry.official),
    resolve(reference) {
      if (!reference) {
        return null;
      }
      if (reference.number != null && byNumber.has(String(reference.number))) {
        return byNumber.get(String(reference.number));
      }
      return resolveByName(reference.name || reference.player || reference);
    },
  };
}

function dedupeBy(items, keyBuilder) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyBuilder(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildLineup({ starters, bench, substitutions, goals, yellows, matchMinutes }) {
  const players = new Map();

  const touch = (player) => {
    const name = cleanText(player?.name ?? player?.player);
    if (!name) {
      return null;
    }
    const key = normalizeText(name);
    if (!players.has(key)) {
      players.set(key, {
        number: player?.number ?? null,
        name,
        role: "unused",
        from: null,
        to: null,
        minutesPlayed: 0,
        goals: 0,
        yellows: 0,
      });
    }
    const current = players.get(key);
    if (player?.number != null) {
      current.number = player.number;
    }
    return current;
  };

  for (const starter of starters) {
    const item = touch(starter);
    if (!item) {
      continue;
    }
    item.role = "starter";
    item.from = 0;
    item.to = matchMinutes;
  }

  for (const reserve of bench) {
    touch(reserve);
  }

  for (const change of substitutions) {
    const incoming = touch(change.in);
    const outgoing = touch(change.out);

    if (incoming) {
      if (incoming.from == null || change.minute < incoming.from) {
        incoming.from = change.minute;
      }
      if (incoming.role !== "starter") {
        incoming.role = "sub";
      }
      if (incoming.to == null) {
        incoming.to = matchMinutes;
      }
    }

    if (outgoing) {
      if (outgoing.from == null) {
        outgoing.from = 0;
      }
      outgoing.to = change.minute;
    }
  }

  for (const goal of goals) {
    const player = touch(goal);
    if (player) {
      player.goals += 1;
    }
  }

  for (const yellow of yellows) {
    const player = touch(yellow);
    if (player) {
      player.yellows += 1;
    }
  }

  return Array.from(players.values())
    .map((player) => {
      if (player.from != null && player.to == null) {
        player.to = matchMinutes;
      }
      player.minutesPlayed =
        player.from == null || player.to == null ? 0 : Math.max(0, Number(player.to) - Number(player.from));
      return player;
    })
    .sort((left, right) => {
      const leftNumber = left.number ?? Number.MAX_SAFE_INTEGER;
      const rightNumber = right.number ?? Number.MAX_SAFE_INTEGER;
      if (leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
      }
      return left.name.localeCompare(right.name, "es");
    });
}

function resolveEventPlayers(index, items, fieldName = "playerName") {
  return items
    .map((item) => {
      const resolved = index.resolve({
        number: item.number ?? null,
        name: item[fieldName] ?? item.name ?? item.player ?? "",
      });
      return {
        ...item,
        resolvedName: resolved?.name || cleanText(item[fieldName] ?? item.name ?? item.player ?? ""),
        resolvedNumber: resolved?.number ?? item.number ?? null,
      };
    })
    .filter((item) => item.resolvedName);
}

function buildModernMatchFromActa(raw, schedule, acta) {
  const homeTeam = raw.homeTeam || schedule.homeTeam;
  const awayTeam = raw.awayTeam || schedule.awayTeam;
  const santJordiSide = normalizeText(homeTeam) === normalizeText(TEAM) ? "home" : "away";
  const opponent = santJordiSide === "home" ? awayTeam : homeTeam;
  const santCard =
    raw.teamCards.find((card) => normalizeText(card.teamName) === normalizeText(TEAM)) ||
    raw.teamCards.find((card) => normalizeText(card.teamName) === normalizeText(homeTeam)) ||
    null;

  const starters = santCard?.starters || [];
  const bench = santCard?.bench || [];
  const rosterIndex = buildRosterIndex([...starters, ...bench]);

  const substitutions = dedupeBy(
    (santCard?.substitutions || []).map((change) => {
      const resolvedIn = rosterIndex.resolve(change.in) || {
        number: change.in.number ?? null,
        name: cleanText(change.in.name),
      };
      const resolvedOut = rosterIndex.resolve(change.out) || {
        number: change.out.number ?? null,
        name: cleanText(change.out.name),
      };
      return {
        minute: change.minute,
        in: resolvedIn,
        out: resolvedOut,
      };
    }),
    (item) => `${item.minute}|${normalizeText(item.in.name)}|${normalizeText(item.out.name)}`,
  ).sort((left, right) => left.minute - right.minute);

  const goals = dedupeBy(
    resolveEventPlayers(
      rosterIndex,
      (raw.goals || []).filter((goal) => goal.side === santJordiSide && goal.minute != null),
      "playerName",
    ).map((goal) => ({
      minute: goal.minute,
      player: goal.resolvedName,
    })),
    (item) => `${item.minute}|${normalizeText(item.player)}`,
  ).sort((left, right) => left.minute - right.minute);

  const yellows = dedupeBy(
    resolveEventPlayers(rosterIndex, (santCard?.cards || []).filter((card) => card.type === "yellow"), "player").map(
      (card) => ({
        minute: card.minute,
        player: card.resolvedName,
      }),
    ),
    (item) => `${item.minute}|${normalizeText(item.player)}`,
  ).sort((left, right) => left.minute - right.minute);

  const lineup = buildLineup({
    starters,
    bench,
    substitutions,
    goals,
    yellows,
    matchMinutes: MATCH_MINUTES,
  });

  return {
    jornada: raw.jornada || schedule.jornada,
    acta: String(acta),
    url: actaUrl(acta),
    match: {
      homeTeam,
      awayTeam,
      score: raw.score || schedule.score,
      santJordiSide,
      opponent,
    },
    events: {
      goals,
      yellows,
      substitutions,
    },
    lineup,
  };
}

function buildScheduleOnlyMatch(schedule, acta, error = null) {
  const santJordiSide = normalizeText(schedule.homeTeam) === normalizeText(TEAM) ? "home" : "away";
  const opponent = santJordiSide === "home" ? schedule.awayTeam : schedule.homeTeam;
  return {
    jornada: schedule.jornada,
    acta: acta ? String(acta) : null,
    url: acta ? actaUrl(acta) : null,
    match: {
      homeTeam: schedule.homeTeam,
      awayTeam: schedule.awayTeam,
      score: schedule.score,
      santJordiSide,
      opponent,
      ...(error ? { error } : {}),
    },
    events: {
      goals: [],
      yellows: [],
      substitutions: [],
    },
    lineup: [],
  };
}

function sanitizeLegacyGoals(goals, schedule) {
  const score = schedule?.score;
  const santJordiGoals =
    normalizeText(schedule?.homeTeam) === normalizeText(TEAM) ? score?.home ?? null : score?.away ?? null;

  const deduped = dedupeBy(
    (goals || []).map((goal) => ({
      minute: Number(goal.minute),
      player: cleanText(goal.player),
    })),
    (item) => `${item.minute}|${normalizeText(item.player)}`,
  )
    .filter((goal) => Number.isFinite(goal.minute) && goal.player)
    .sort((left, right) => left.minute - right.minute);

  if (santJordiGoals == null) {
    return deduped;
  }
  if (deduped.length > santJordiGoals) {
    return [];
  }
  return deduped;
}

function sanitizeLegacyYellows(cards) {
  return dedupeBy(
    (cards || [])
      .map((card) => ({
        minute: Number(card.minute),
        player: cleanText(card.player),
      }))
      .filter((card) => Number.isFinite(card.minute) && card.player),
    (item) => `${item.minute}|${normalizeText(item.player)}`,
  ).sort((left, right) => left.minute - right.minute);
}

function convertLegacyMatch(legacyMatch, schedule, error = null) {
  const acta = parseActaFromUrl(legacyMatch.url) || String(legacyMatch.id || "");
  const scheduleBacked = buildScheduleOnlyMatch(schedule, acta);
  const legacyLineup = legacyMatch.peSantJordi?.lineup || {};
  const starters = legacyLineup.starters || [];
  const bench = [...(legacyLineup.bench?.used || []), ...(legacyLineup.bench?.unused || [])];
  const substitutions = dedupeBy(
    (legacyMatch.peSantJordi?.events?.substitutions || [])
      .map((change) => ({
        minute: Number(change.minute),
        in: {
          number: change.playerIn?.number ?? null,
          name: cleanText(change.playerIn?.name),
        },
        out: {
          number: change.playerOut?.number ?? null,
          name: cleanText(change.playerOut?.name),
        },
      }))
      .filter((change) => Number.isFinite(change.minute) && change.in.name && change.out.name),
    (item) => `${item.minute}|${normalizeText(item.in.name)}|${normalizeText(item.out.name)}`,
  ).sort((left, right) => left.minute - right.minute);

  const goals = sanitizeLegacyGoals(legacyMatch.peSantJordi?.events?.goals || [], schedule);
  const yellows = sanitizeLegacyYellows(legacyMatch.peSantJordi?.events?.cards || []);

  const lineup = buildLineup({
    starters,
    bench,
    substitutions,
    goals,
    yellows,
    matchMinutes: MATCH_MINUTES,
  });

  return {
    ...scheduleBacked,
    match: {
      ...scheduleBacked.match,
      ...(error ? { error } : {}),
    },
    events: {
      goals,
      yellows,
      substitutions,
    },
    lineup,
  };
}

async function loadLegacyMatches() {
  const byActa = new Map();
  for (const file of LEGACY_FILES) {
    if (!(await exists(file))) {
      continue;
    }
    const raw = JSON.parse(await fs.readFile(file, "utf8"));
    const matches = raw.matches || [];
    for (const match of matches) {
      const acta = parseActaFromUrl(match.url) || String(match.id || "");
      if (acta && !byActa.has(acta)) {
        byActa.set(acta, match);
      }
    }
  }
  return byActa;
}

function pickActaForSchedule(schedule, jornadaCards) {
  const homeKey = normalizeText(schedule.homeTeam);
  const awayKey = normalizeText(schedule.awayTeam);
  const found = jornadaCards.find(
    (item) => normalizeText(item.homeTeam) === homeKey && normalizeText(item.awayTeam) === awayKey,
  );
  return found || null;
}

async function saveDebugArtifacts(parserPage, label, html) {
  await ensureDir(DEBUG_DIR);
  const htmlFile = path.join(DEBUG_DIR, `${slug(label)}.html`);
  const screenshotFile = path.join(DEBUG_DIR, `${slug(label)}.png`);
  await writeUtf8(htmlFile, html || "");
  if (parserPage && html) {
    try {
      await prepareParserPage(parserPage, html, BASE_URL);
      await parserPage.screenshot({ path: screenshotFile, fullPage: true });
    } catch {
      await fs.writeFile(screenshotFile, "");
    }
  } else {
    await fs.writeFile(screenshotFile, "");
  }
}

function formatScore(score) {
  if (!score) {
    return "?-?";
  }
  return `${score.home}-${score.away}`;
}

function matchToMarkdown(match) {
  const lines = [];
  lines.push(`## Jornada ${match.jornada} — ${match.match.homeTeam} ${formatScore(match.match.score)} ${match.match.awayTeam}`);
  lines.push(
    `Rival: ${match.match.opponent} | Lado: ${match.match.santJordiSide === "home" ? "LOCAL" : "VISITANTE"}`,
  );
  lines.push(`Acta: ${match.acta || "-"} | URL: ${match.url || "-"}`);
  if (match.match.error) {
    lines.push(`Estado: ERROR | ${match.match.error}`);
  }
  lines.push("");

  lines.push("### Goles");
  if (match.events.goals.length) {
    for (const goal of match.events.goals) {
      lines.push(`- ${goal.minute}' ${goal.player}`);
    }
  } else {
    lines.push(match.lineup.length ? "- (sin goles de Sant Jordi)" : "- (sin acta disponible; solo calendario)");
  }
  lines.push("");

  lines.push("### Amarillas");
  if (match.events.yellows.length) {
    for (const yellow of match.events.yellows) {
      lines.push(`- ${yellow.minute}' ${yellow.player}`);
    }
  } else {
    lines.push(match.lineup.length ? "- (sin amarillas)" : "- (sin acta disponible)");
  }
  lines.push("");

  lines.push("### Cambios");
  if (match.events.substitutions.length) {
    for (const change of match.events.substitutions) {
      lines.push(
        `- ${change.minute}' IN ${change.in.number ?? "-"} ${change.in.name} ↔ OUT ${change.out.number ?? "-"} ${change.out.name}`,
      );
    }
  } else {
    lines.push(match.lineup.length ? "- (sin cambios)" : "- (sin acta disponible)");
  }
  lines.push("");

  lines.push("### Alineacion");
  if (!match.lineup.length) {
    lines.push("- (sin acta disponible; no hay alineacion detallada)");
    lines.push("");
    lines.push("---");
    lines.push("");
    return lines.join("\n");
  }

  lines.push("| dorsal | jugador | rol | de-a | minutos | goles | amarillas |");
  lines.push("|---:|---|---|---|---:|---:|---:|");
  for (const player of match.lineup) {
    const range = player.from == null || player.to == null ? "-" : `${player.from}-${player.to}`;
    lines.push(
      `| ${player.number ?? "-"} | ${player.name} | ${player.role} | ${range} | ${player.minutesPlayed} | ${player.goals} | ${player.yellows} |`,
    );
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  await ensureDir(DEBUG_DIR);
  await ensureDir(CACHE_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    javaScriptEnabled: true,
  });
  const parserPage = await createParserPage(browser);

  try {
    log("session", `priming ${START_SESS_URL}`);
    await primeSession(context);

    const legacyMatches = await loadLegacyMatches();

    const teamPage = await loadHtml(context, "team-page", TEAM_PAGE_URL, {
      markers: ["Ficha de Competicion", "Competiciones del Equipo"],
      fixtureFiles: [FIXTURES.teamPage],
    });
    const teamPageInfo = teamPage.html ? await parseTeamPage(parserPage, teamPage.html) : {};

    const competitionsPage = await loadHtml(
      context,
      "team-competitions",
      teamPageInfo.competitionHistoryUrl || teamCompetitionsUrl(),
      {
        markers: ["Competiciones del Equipo", "DIVISI", "2025-2026"],
        fixtureFiles: [FIXTURES.teamCompetitions],
      },
    );
    const competitionsInfo = competitionsPage.html ? await parseCompetitionsPage(parserPage, competitionsPage.html) : {};

    const groupPage = await loadHtml(context, "team-group", competitionsInfo.groupUrl || teamGroupUrl(), {
      markers: ["Jor.", "Casa/Fuera", "PE SANT JORDI"],
      fixtureFiles: [FIXTURES.teamGroup],
    });
    const schedule = groupPage.html ? await parseGroupSchedule(parserPage, groupPage.html) : [];
    const filteredSchedule = schedule
      .filter((item) => item.jornada >= FROM_JORNADA && item.jornada <= TO_JORNADA)
      .sort((left, right) => left.jornada - right.jornada);

    if (filteredSchedule.length === 0) {
      throw new Error("No se pudo extraer el calendario del grupo.");
    }

    const matches = [];
    const coverage = {
      full: [],
      legacy: [],
      scheduleOnly: [],
      warnings: [],
    };

    for (const scheduleMatch of filteredSchedule) {
      const jornadaLabel = `jornada-${scheduleMatch.jornada}`;
      const jornadaHtml = await loadHtml(context, jornadaLabel, jornadaUrl(scheduleMatch.jornada), {
        markers: ["Acta del partido", "NFG_CmpPartido", TEAM],
        fixtureFiles: scheduleMatch.jornada === 11 ? [FIXTURES.jornada11] : [],
      });

      let acta = null;
      if (jornadaHtml.html) {
        const jornadaCards = await parseJornadaCards(parserPage, jornadaHtml.html, scheduleMatch.jornada);
        acta = pickActaForSchedule(scheduleMatch, jornadaCards)?.acta || null;
      }
      if (!acta) {
        acta = KNOWN_ACTAS[scheduleMatch.jornada] || null;
        coverage.warnings.push(
          `J${scheduleMatch.jornada}: acta no encontrada en jornada; fallback a acta conocida ${acta || "-"}`,
        );
      }

      if (!acta) {
        matches.push(buildScheduleOnlyMatch(scheduleMatch, null));
        coverage.scheduleOnly.push(scheduleMatch.jornada);
        continue;
      }

      const actaLoad = await loadActaWithRetries(context, parserPage, acta, {
        fixtureFiles: acta === "732057" ? [FIXTURES.acta732057] : [],
      });

      let modernMatch = null;
      if (actaLoad.complete && actaLoad.html) {
        try {
          const rawActa = await parseActaPage(parserPage, actaLoad.html, actaUrl(acta));
          modernMatch = buildModernMatchFromActa(rawActa, scheduleMatch, acta);
          coverage.full.push(scheduleMatch.jornada);
        } catch (error) {
          coverage.warnings.push(`J${scheduleMatch.jornada}: fallo parseando acta ${acta}: ${error.message}`);
          await saveDebugArtifacts(parserPage, `j${scheduleMatch.jornada}-acta-${acta}-parse-error`, actaLoad.html);
        }
      }

      if (!modernMatch && legacyMatches.has(String(acta))) {
        modernMatch = convertLegacyMatch(
          legacyMatches.get(String(acta)),
          scheduleMatch,
          actaLoad.error || `Acta ${acta} incompleta; se usaron datos legacy locales`,
        );
        coverage.legacy.push(scheduleMatch.jornada);
      }

      if (!modernMatch) {
        modernMatch = buildScheduleOnlyMatch(
          scheduleMatch,
          acta,
          actaLoad.error || `Acta ${acta} incompleta o sin plantilla tras reintentos`,
        );
        coverage.scheduleOnly.push(scheduleMatch.jornada);
        coverage.warnings.push(
          `J${scheduleMatch.jornada}: acta ${acta} incompleta; ${actaLoad.error || "sin detalle util"}`,
        );
      }

      matches.push(modernMatch);
    }

    matches.sort((left, right) => left.jornada - right.jornada);

    const validation = {
      found732057: matches.some((match) => match.acta === "732057"),
      teams732057: false,
      score732057: null,
      warning: null,
    };

    const match732057 = matches.find((match) => match.acta === "732057");
    if (match732057) {
      validation.teams732057 =
        match732057.match.homeTeam === "PE SANT JORDI" && match732057.match.awayTeam === "SANTA GERTRUDIS";
      validation.score732057 = match732057.match.score;
      if (
        !match732057.match.score ||
        match732057.match.score.home !== 7 ||
        match732057.match.score.away !== 0
      ) {
        validation.warning =
          `Acta 732057: la fuente disponible devuelve ${formatScore(match732057.match.score)} y no 7-0.`;
        const html = await readFixture(FIXTURES.acta732057);
        if (html) {
          await saveDebugArtifacts(parserPage, "j11-acta-732057-validation", html);
        }
      }
    }

    if (!validation.found732057 || !validation.teams732057) {
      throw new Error("Validacion minima fallida para acta 732057.");
    }

    if (!ALLOW_PARTIAL && coverage.scheduleOnly.length) {
      throw new Error(`Faltan actas detalladas para jornadas: ${coverage.scheduleOnly.join(", ")}`);
    }

    const result = {
      meta: {
        generatedAt: new Date().toISOString(),
        team: TEAM,
        fromJornada: FROM_JORNADA,
        toJornada: TO_JORNADA,
        matchMinutes: MATCH_MINUTES,
        params: {
          cod_primaria: COD_PRIMARIA,
          CodCompeticion: COD_COMPETICION,
          CodGrupo: COD_GRUPO,
          CodTemporada: COD_TEMPORADA,
          Sch_Codigo_Delegacion: SCH_CODIGO_DELEGACION,
          teamPage: TEAM_PAGE_URL,
        },
        coverage,
        validation,
      },
      matches,
    };

    const markdown = [
      `# FFIB - ${TEAM}`,
      "",
      `Jornadas ${FROM_JORNADA} a ${TO_JORNADA}`,
      "",
      ...matches.map((match) => matchToMarkdown(match)),
    ].join("\n");

    await writeUtf8(OUT_JSON, `${JSON.stringify(result, null, 2)}\n`);
    await writeUtf8(OUT_MD, `${markdown.trim()}\n`);

    log("done", path.basename(OUT_JSON));
    log("done", path.basename(OUT_MD));
    if (coverage.scheduleOnly.length) {
      log("warn", `sin acta detallada para jornadas ${coverage.scheduleOnly.join(", ")}`);
    }
    if (validation.warning) {
      log("warn", validation.warning);
    }
  } finally {
    await parserPage.close();
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`[ffib] fatal ${error.stack || error.message}`);
  process.exitCode = 1;
});
