#!/usr/bin/env node
/**
 * render.mjs — render a .floorplan DSL to SVG and PNG.
 *
 * Usage:
 *   node render.mjs <file.floorplan> [--out <path>] [--svg-out <path>]
 *                   [--width 900] [--floor-index 0] [--all-floors]
 *                   [--layout stacked|sideBySide]
 *                   [--show-area] [--show-dimensions] [--show-summary]
 *                   [--area-unit sqft|sqm] [--length-unit ft|m]
 *   node render.mjs --dsl '<literal DSL>' --out out.png
 *   cat file.floorplan | node render.mjs --out out.png
 *
 * Default output: PNG at ./render.png, SVG at ./render.svg.
 *
 * Exit codes:
 *   0 — rendered
 *   1 — DSL failed to parse
 *   2 — runtime error (missing dep, I/O)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { render as renderFloorplan } from 'floorplan-language';
import {
  parseArgs,
  readDsl,
  parseDsl,
  runLangiumValidation,
  emitOk,
  emitValidationError,
  run,
} from './_lib.mjs';

function ensureDir(filePath) {
  mkdirSync(dirname(resolve(filePath)), { recursive: true });
}

run(async () => {
  const args = parseArgs();
  const dsl = readDsl(args);

  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) {
    emitValidationError(parseErrors);
  }

  const { errors: semErrors, warnings: semWarnings } = await runLangiumValidation(document);

  const docConfig = document.parseResult.value.config;
  const docLengthUnit = docConfig?.defaultUnit ?? docConfig?.default_unit;
  const docAreaUnit = docConfig?.areaUnit ?? docConfig?.area_unit;

  const renderOptions = {
    includeStyles: true,
    padding: 2,
    floorIndex: args['floor-index'] !== undefined ? Number(args['floor-index']) : undefined,
    renderAllFloors: args['all-floors'] === true,
    multiFloorLayout: args.layout,
    showArea: args['show-area'] === true,
    showDimensions: args['show-dimensions'] === true,
    showFloorSummary: args['show-summary'] === true,
    areaUnit: args['area-unit'] ?? docAreaUnit ?? 'sqft',
    lengthUnit: args['length-unit'] ?? docLengthUnit ?? 'ft',
  };

  const semWarningsExtra = [];
  if (!docLengthUnit) {
    semWarningsExtra.push({
      message: "Document has no `config { default_unit: ... }`. Defaulted to 'ft' for rendering. Add the config block to make this explicit.",
      rule: 'config_missing_default_unit',
      severity: 'warning',
    });
  }

  const svg = renderFloorplan(document, renderOptions);

  const width = args.width ? Number(args.width) : 900;

  // Lazy-import resvg so a pure --svg-out render would still work if resvg fails.
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: 'white' });
  const png = resvg.render().asPng();

  const pngOut = args.out ?? 'render.png';
  const svgOut = args['svg-out'] ?? pngOut.replace(/\.png$/i, '.svg');

  ensureDir(pngOut);
  ensureDir(svgOut);
  writeFileSync(pngOut, png);
  writeFileSync(svgOut, svg);

  emitOk(
    {
      pngPath: resolve(pngOut),
      svgPath: resolve(svgOut),
      pngBytes: png.length,
      svgBytes: svg.length,
      width,
      floors: document.parseResult.value.floors?.length ?? 0,
      rooms: document.parseResult.value.floors?.reduce((n, f) => n + (f.rooms?.length ?? 0), 0) ?? 0,
      semanticErrors: semErrors.length,
      lengthUnit: renderOptions.lengthUnit,
      areaUnit: renderOptions.areaUnit,
    },
    [...semWarnings, ...semWarningsExtra],
  );
});
