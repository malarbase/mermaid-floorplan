/**
 * Shared helpers for all mermaid-floorplan skill scripts.
 *
 * All scripts emit a JSON envelope on stdout:
 *   { success: boolean, data: {...}, warnings: [...], errors: [...] }
 *
 * Exit codes:
 *   0 — success
 *   1 — validation or user-input failure (bad DSL, missing file, invalid op)
 *   2 — missing runtime dependency or unexpected error
 */

import { readFileSync, existsSync } from 'node:fs';
import process from 'node:process';
import { createFloorplansServices } from 'floorplan-language';
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';

export const EXIT_OK = 0;
export const EXIT_VALIDATION = 1;
export const EXIT_RUNTIME = 2;

/**
 * Parse argv into a simple flag map.
 * Supports:
 *   --flag             -> { flag: true }
 *   --key value        -> { key: "value" }
 *   --key=value        -> { key: "value" }
 *   positional args    -> _: [ ... ]
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        out[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          out[key] = next;
          i++;
        } else {
          out[key] = true;
        }
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

/**
 * Resolve DSL text from args. In priority order:
 *   1. --dsl '<literal>'
 *   2. --file <path>  (or first positional arg)
 *   3. stdin (if not a TTY)
 *
 * Emits EXIT_VALIDATION if nothing is supplied.
 */
export function readDsl(args) {
  if (typeof args.dsl === 'string') return args.dsl;

  const path = args.file ?? args._[0];
  if (path) {
    if (!existsSync(path)) {
      emitAndExit(
        { success: false, data: null, warnings: [], errors: [{ message: `File not found: ${path}` }] },
        EXIT_VALIDATION,
      );
    }
    return readFileSync(path, 'utf-8');
  }

  if (!process.stdin.isTTY) {
    return readFileSync(0, 'utf-8');
  }

  emitAndExit(
    {
      success: false,
      data: null,
      warnings: [],
      errors: [{ message: 'No DSL provided. Pass --file <path>, --dsl <literal>, or pipe via stdin.' }],
    },
    EXIT_VALIDATION,
  );
}

/**
 * Lazily-constructed Langium services and parser.
 */
let _services = null;
let _parse = null;
export function getServices() {
  if (!_services) {
    _services = createFloorplansServices(EmptyFileSystem);
    _parse = parseHelper(_services.Floorplans);
  }
  return { services: _services, parse: _parse };
}

/**
 * Parse DSL text. Returns { document, parseErrors }. The document is returned
 * whether or not parse errors exist so downstream tools can inspect partial state.
 */
export async function parseDsl(dsl) {
  const { parse } = getServices();
  const document = await parse(dsl);
  const parseErrors = [];
  for (const e of document.parseResult.parserErrors) {
    parseErrors.push({
      type: 'parse',
      message: e.message,
      line: e.token?.startLine,
      column: e.token?.startColumn,
    });
  }
  for (const e of document.parseResult.lexerErrors) {
    parseErrors.push({
      type: 'parse',
      message: e.message,
      line: e.line,
      column: e.column,
    });
  }
  return { document, parseErrors };
}

/**
 * Run full Langium validation on a parsed document. Returns diagnostic arrays.
 */
export async function runLangiumValidation(document) {
  const { services } = getServices();
  await services.shared.workspace.DocumentBuilder.build([document], { validation: true });
  const errors = [];
  const warnings = [];
  for (const d of document.diagnostics ?? []) {
    const loc = {
      line: d.range?.start?.line !== undefined ? d.range.start.line + 1 : undefined,
      column: d.range?.start?.character !== undefined ? d.range.start.character + 1 : undefined,
    };
    if (d.severity === 1) {
      errors.push({ type: 'connection', message: d.message, ...loc });
    } else if (d.severity === 2) {
      warnings.push({ type: 'wall_type', message: d.message, ...loc });
    }
  }
  return { errors, warnings };
}

/**
 * Print the envelope and exit.
 */
export function emitAndExit(envelope, code = EXIT_OK) {
  process.stdout.write(`${JSON.stringify(envelope)}\n`);
  process.exit(code);
}

/**
 * Print a success envelope.
 */
export function emitOk(data = {}, warnings = []) {
  emitAndExit({ success: true, data, warnings, errors: [] }, EXIT_OK);
}

/**
 * Print a validation-failure envelope (exit 1).
 */
export function emitValidationError(errors, data = null, warnings = []) {
  emitAndExit(
    { success: false, data, warnings, errors: Array.isArray(errors) ? errors : [{ message: String(errors) }] },
    EXIT_VALIDATION,
  );
}

/**
 * Print a runtime-failure envelope (exit 2). Used for missing deps,
 * unexpected exceptions, etc.
 */
export function emitRuntimeError(errors, data = null, warnings = []) {
  emitAndExit(
    { success: false, data, warnings, errors: Array.isArray(errors) ? errors : [{ message: String(errors) }] },
    EXIT_RUNTIME,
  );
}

/**
 * Wrap an async main function with default error handling so every script
 * gets consistent runtime-error output.
 */
export async function run(main) {
  try {
    await main();
  } catch (err) {
    emitRuntimeError([
      {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    ]);
  }
}
