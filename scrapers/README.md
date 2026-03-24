# FFIB PE Sant Jordi scraper

Scraper en Node.js + Playwright para FFIB.

## Requisitos

- Node.js 20+
- `npm install`
- `npx playwright install chromium`

## Ejecutar

```bash
npm start
```

Opcional:

```bash
node ffib_santjordi.js --matchMinutes=90 --allow-partial=true
```

## Salidas

- `ffib_pe_sant_jordi_j1_11_clean.json`
- `ffib_pe_sant_jordi_j1_11_report.md`
- `debug/` cuando falla una acta o una validacion

## Nota

La web de FFIB esta devolviendo a veces cuerpos vacios. El script intenta red de FFIB primero y cae a fixtures/cache locales cuando existen.
