#!/usr/bin/env node
/**
 * validate.mjs — validate a .floorplan DSL.
 *
 * Mirrors the MCP `validate_floorplan` tool: parses the DSL, runs the full
 * Langium validation pipeline, resolves variables, resolves relative
 * positions, and reports errors + warnings in the skill's JSON envelope.
 *
 * Usage:
 *   node validate.mjs <file.floorplan> [--strict]
 *   node validate.mjs --dsl '<literal>'
 *   cat file.floorplan | node validate.mjs --strict
 *
 * With `--strict`, warnings are promoted to errors and the script exits 1.
 */

import {
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
  run,
} from './_lib.mjs';

run(async () => {
  const args = parseArgs();
  const dsl = readDsl(args);
  const strict = args.strict === true;

  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) {
    emitValidationError(parseErrors);
  }

  const { errors: semErrors, warnings: semWarnings } = await runLangiumValidation(document);

  const floorplan = document.parseResult.value;
  const varRes = resolveVariables(floorplan);
  const varErrors = varRes.errors.map((e) => ({
    type: e.type,
    message: e.message,
    variableName: e.variableName,
    roomName: e.roomName,
  }));

  const sizeRefErrors = validateSizeReferences(floorplan, varRes.variables).map((e) => ({
    type: e.type,
    message: e.message,
    variableName: e.variableName,
    roomName: e.roomName,
  }));

  const posErrors = [];
  const posWarnings = [];
  for (const floor of floorplan.floors) {
    const res = resolveFloorPositions(floor, varRes.variables);
    for (const e of res.errors) {
      posErrors.push({ type: e.type, message: e.message, roomName: e.roomName });
    }
    for (const w of res.warnings) {
      posWarnings.push({
        type: 'overlap',
        message: `Rooms "${w.room1}" and "${w.room2}" overlap`,
        rooms: [w.room1, w.room2],
      });
    }
  }

  const errors = [...semErrors, ...varErrors, ...sizeRefErrors, ...posErrors];
  let warnings = [...semWarnings, ...posWarnings];

  if (strict && warnings.length > 0) {
    errors.push(
      ...warnings.map((w) => ({
        type: 'strict_promoted',
        message: `[--strict] ${w.message}`,
        ...w,
      })),
    );
    warnings = [];
  }

  if (errors.length > 0) {
    emitValidationError(errors, { valid: false, errorCount: errors.length }, warnings);
  }

  emitOk(
    {
      valid: true,
      floors: floorplan.floors.length,
      rooms: floorplan.floors.reduce((n, f) => n + (f.rooms?.length ?? 0), 0),
    },
    warnings,
  );
});
