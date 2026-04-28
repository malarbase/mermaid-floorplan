#!/usr/bin/env node
/**
 * mcp_parity_check.mjs — verify the bundled scripts produce equivalent
 * results to the floorplan-mcp-server tools.
 *
 * The skill ships its own validate/analyze/render scripts so it can run
 * without a live MCP server. They share the underlying floorplan-language
 * package with the MCP server, but they diverged once before and could
 * drift again. This check pairs each script with its MCP counterpart and
 * reports whether the outputs agree.
 *
 * Subjects:
 *   - validate: parse + Langium validation + variable resolution + size
 *               references + position resolution. The MCP tool calls
 *               `validateFloorplan` from floorplan-mcp-server/utils/parser.
 *   - analyze:  parse + convertFloorplanToJson, summary + per-room. The
 *               MCP analyze tool wraps the same library function.
 *   - render:   render() -> resvg PNG. The MCP render tool calls
 *               generateSvg() (a wrapper around render()) then svgToPng().
 *               PNG output is compared with compare_visual.py.
 *
 * Usage:
 *   node mcp_parity_check.mjs <file.floorplan>
 *   node mcp_parity_check.mjs --dsl '...'
 *   node mcp_parity_check.mjs <file.floorplan> --out-dir /tmp/parity \
 *       [--width 900] [--threshold 0.999] [--only validate,render]
 *
 * Exit codes:
 *   0 — all subjects agree (or skipped explicitly)
 *   1 — one or more subjects disagree
 *   2 — runtime error (missing dep, MCP build absent, etc.)
 */

import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  convertFloorplanToJson,
  render as languageRender,
  resolveFloorPositions,
  resolveVariables,
  validateSizeReferences,
} from 'floorplan-language';
import {
  parseArgs,
  readDsl,
  parseDsl,
  runLangiumValidation,
  emitOk,
  emitValidationError,
  emitRuntimeError,
  run,
} from './_lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = dirname(HERE);
const REPO_ROOT = dirname(dirname(dirname(SKILL_DIR)));
const MCP_OUT = join(REPO_ROOT, 'floorplan-mcp-server', 'out');

async function loadMcpUtils() {
  try {
    const parser = await import(join(MCP_OUT, 'utils', 'parser.js'));
    const renderer = await import(join(MCP_OUT, 'utils', 'renderer.js'));
    return { parser, renderer };
  } catch (err) {
    emitRuntimeError([
      {
        message: `Could not load MCP server build at ${MCP_OUT}: ${err instanceof Error ? err.message : err}`,
        hint: 'Run `npm run build -w floorplan-mcp-server` from the monorepo root.',
      },
    ]);
  }
}

function ensureDir(path) {
  mkdirSync(resolve(path), { recursive: true });
}

function shallowDiff(a, b, path = '') {
  const diffs = [];
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const key of keys) {
    const va = a?.[key];
    const vb = b?.[key];
    const p = path ? `${path}.${key}` : key;
    if (typeof va !== typeof vb) {
      diffs.push({ path: p, a: va, b: vb, reason: 'type-mismatch' });
    } else if (typeof va === 'object' && va !== null && !Array.isArray(va)) {
      diffs.push(...shallowDiff(va, vb ?? {}, p));
    } else if (Array.isArray(va)) {
      if (!Array.isArray(vb) || va.length !== vb.length) {
        diffs.push({ path: p, a: va?.length, b: vb?.length, reason: 'length-mismatch' });
      }
    } else if (va !== vb) {
      diffs.push({ path: p, a: va, b: vb, reason: 'value-mismatch' });
    }
  }
  return diffs;
}

async function runScriptValidate(dsl) {
  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) {
    return { valid: false, errors: parseErrors, warnings: [] };
  }
  const { errors: semErrors, warnings: semWarnings } = await runLangiumValidation(document);
  const floorplan = document.parseResult.value;
  const varRes = resolveVariables(floorplan);
  const sizeRefErrors = validateSizeReferences(floorplan, varRes.variables);
  const posErrors = [];
  const posWarnings = [];
  for (const floor of floorplan.floors) {
    const res = resolveFloorPositions(floor, varRes.variables);
    posErrors.push(...res.errors);
    posWarnings.push(...res.warnings);
  }
  const errors = [
    ...semErrors,
    ...varRes.errors,
    ...sizeRefErrors,
    ...posErrors,
  ];
  const warnings = [...semWarnings, ...posWarnings];
  return { valid: errors.length === 0, errors, warnings };
}

function normalizeValidate(result) {
  return {
    valid: !!result.valid,
    errorCount: (result.errors ?? []).length,
    warningCount: (result.warnings ?? []).length,
    errorTypes: (result.errors ?? []).map((e) => e.type ?? 'unknown').sort(),
  };
}

async function runScriptAnalyze(dsl) {
  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) {
    return { ok: false, errors: parseErrors };
  }
  const json = convertFloorplanToJson(document.parseResult.value);
  if (!json.data) {
    return { ok: false, errors: [{ message: 'convertFloorplanToJson returned no data' }] };
  }
  return { ok: true, json: json.data };
}

function normalizeAnalyze(jsonData) {
  if (!jsonData) return null;
  const summary = jsonData.summary;
  const floors = (jsonData.floors ?? []).map((f) => ({
    id: f.id,
    roomCount: f.rooms?.length ?? 0,
    netArea: Math.round((f.metrics?.netArea ?? 0) * 100) / 100,
    bbox: f.metrics?.boundingBox
      ? {
          width: f.metrics.boundingBox.width,
          height: f.metrics.boundingBox.height,
        }
      : null,
  }));
  const rooms = (jsonData.floors ?? []).flatMap((f) =>
    (f.rooms ?? []).map((r) => ({
      name: r.name,
      width: r.width,
      height: r.height,
      x: r.x,
      y: r.z,
    })),
  );
  rooms.sort((a, b) => a.name.localeCompare(b.name));
  return {
    floorCount: summary?.floorCount ?? floors.length,
    totalRooms: summary?.totalRoomCount ?? rooms.length,
    grossFloorArea: Math.round((summary?.grossFloorArea ?? 0) * 100) / 100,
    floors,
    rooms,
  };
}

async function renderScriptPng(dsl, width) {
  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) {
    throw new Error(`Parse error: ${parseErrors[0].message}`);
  }
  const svg = languageRender(document, { includeStyles: true, padding: 2 });
  const { Resvg } = await import('@resvg/resvg-js');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'white',
  });
  return { svg, png: resvg.render().asPng() };
}

async function renderMcpPng(mcp, dsl, width) {
  const parseResult = await mcp.parser.parseFloorplan(dsl);
  if (parseResult.errors.length > 0 || !parseResult.document) {
    throw new Error(
      `MCP parse error: ${parseResult.errors[0]?.message ?? 'unknown'}`,
    );
  }
  const svg = mcp.renderer.generateSvg(parseResult.document);
  const png = await mcp.renderer.svgToPng(svg, width);
  return { svg, png };
}

function comparePngs(scriptPath, mcpPath) {
  const compareScript = join(HERE, 'compare_visual.py');
  const result = spawnSync(
    'python3',
    [compareScript, '--a', scriptPath, '--b', mcpPath],
    { encoding: 'utf-8' },
  );
  if (result.status === null) {
    return { ok: false, error: `compare_visual.py failed to spawn: ${result.error}` };
  }
  try {
    const parsed = JSON.parse(result.stdout.trim().split('\n').pop());
    if (!parsed.success) {
      return { ok: false, error: parsed.errors?.[0]?.message ?? 'compare_visual error' };
    }
    return { ok: true, ...parsed.data };
  } catch (err) {
    return { ok: false, error: `Could not parse compare_visual output: ${err.message}` };
  }
}

run(async () => {
  const args = parseArgs();
  const dsl = readDsl(args);
  const width = args.width ? Number(args.width) : 900;
  const threshold = args.threshold ? Number(args.threshold) : 0.999;
  const outDir = args['out-dir']
    ? resolve(args['out-dir'])
    : mkdtempSync(join(tmpdir(), 'mermaid-fp-parity-'));
  ensureDir(outDir);

  const allSubjects = ['validate', 'analyze', 'render'];
  const only = args.only
    ? new Set(String(args.only).split(',').map((s) => s.trim()))
    : null;
  const subjects = allSubjects.filter((s) => !only || only.has(s));

  const mcp = await loadMcpUtils();
  const report = {};

  if (subjects.includes('validate')) {
    const scriptRes = await runScriptValidate(dsl);
    const mcpRes = await mcp.parser.validateFloorplan(dsl);
    const ns = normalizeValidate(scriptRes);
    const nm = normalizeValidate(mcpRes);
    const diffs = shallowDiff(ns, nm);
    report.validate = {
      match: diffs.length === 0,
      script: ns,
      mcp: nm,
      diffs,
    };
  }

  if (subjects.includes('analyze')) {
    const s = await runScriptAnalyze(dsl);
    const mcpParse = await mcp.parser.parseFloorplan(dsl);
    const mcpOk = mcpParse.errors.length === 0 && !!mcpParse.document;

    if (!s.ok && !mcpOk) {
      // Both surfaces refused to parse — that's mutually consistent.
      report.analyze = {
        match: true,
        script: { ok: false, errorCount: s.errors.length },
        mcp: { ok: false, errorCount: mcpParse.errors.length },
      };
    } else if (s.ok !== mcpOk) {
      report.analyze = {
        match: false,
        error: `Parse mismatch: script.ok=${s.ok} mcp.ok=${mcpOk}`,
        script: s.ok ? { ok: true } : { ok: false, errors: s.errors },
        mcp: mcpOk ? { ok: true } : { ok: false, errors: mcpParse.errors },
      };
    } else {
      const mcpJson = convertFloorplanToJson(mcpParse.document.parseResult.value).data ?? null;
      const ns = normalizeAnalyze(s.json);
      const nm = normalizeAnalyze(mcpJson);
      const diffs = shallowDiff(ns ?? {}, nm ?? {});
      report.analyze = {
        match: diffs.length === 0,
        script: ns,
        mcp: nm,
        diffs,
      };
    }
  }

  if (subjects.includes('render')) {
    try {
      const scriptOut = join(outDir, 'script-render.png');
      const mcpOut = join(outDir, 'mcp-render.png');
      const compositeOut = join(outDir, 'parity-composite.png');
      const diffOut = join(outDir, 'parity-diff.png');
      const { png: scriptPng, svg: scriptSvg } = await renderScriptPng(dsl, width);
      writeFileSync(scriptOut, scriptPng);
      writeFileSync(scriptOut.replace(/\.png$/i, '.svg'), scriptSvg);
      const { png: mcpPng, svg: mcpSvg } = await renderMcpPng(mcp, dsl, width);
      writeFileSync(mcpOut, mcpPng);
      writeFileSync(mcpOut.replace(/\.png$/i, '.svg'), mcpSvg);
      const cmp = spawnSync(
        'python3',
        [
          join(HERE, 'compare_visual.py'),
          '--a', scriptOut,
          '--b', mcpOut,
          '--composite', compositeOut,
          '--diff', diffOut,
        ],
        { encoding: 'utf-8' },
      );
      let cmpData = null;
      let cmpError = null;
      try {
        const parsed = JSON.parse(cmp.stdout.trim().split('\n').pop());
        if (parsed.success) cmpData = parsed.data;
        else cmpError = parsed.errors?.[0]?.message ?? 'compare error';
      } catch (err) {
        cmpError = `Could not parse compare output: ${err.message}`;
      }
      report.render = {
        match: !cmpError && cmpData && cmpData.similarity >= threshold,
        threshold,
        scriptPath: scriptOut,
        mcpPath: mcpOut,
        composite: compositeOut,
        diff: diffOut,
        compare: cmpData,
        error: cmpError,
      };
    } catch (err) {
      report.render = {
        match: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const allMatch = Object.values(report).every((r) => r.match === true);

  if (!allMatch) {
    emitValidationError(
      Object.entries(report)
        .filter(([, v]) => v.match !== true)
        .map(([subject, v]) => ({
          type: 'parity_mismatch',
          subject,
          message: v.error ?? `Parity mismatch on ${subject}`,
          diffs: v.diffs,
        })),
      { parity: report, outDir },
    );
  }

  emitOk({ parity: report, outDir });
});
