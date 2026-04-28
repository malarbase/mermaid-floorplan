#!/usr/bin/env node
/**
 * design_critic.mjs — design-quality review for a .floorplan.
 *
 * Pure heuristics (no LLM). Runs a battery of architectural-sanity checks
 * over the parsed JSON export and the adjacency graph, then emits a list
 * of findings with severity and an aggregate design score. Intended to be
 * piped into `suggest_improvements.mjs` to get concrete `modify.mjs`
 * operations that would address each finding.
 *
 * Usage:
 *   node design_critic.mjs <file.floorplan> [--strict] [--only <rule,rule>]
 *                          [--skip <rule,rule>] [--area-unit sqft|sqm]
 *   node design_critic.mjs --dsl '<literal DSL>'
 *
 * Rule catalogue lives in _critic_lib.mjs. --strict promotes warnings to
 * errors (and exits 1 if any are present).
 *
 * Output `data` shape:
 *   {
 *     findings: [ { rule, severity, message, rooms, details, suggestion } ],
 *     summary: { errorCount, warningCount, infoCount, rulesChecked, rulesFailed },
 *     score: 0-100,
 *     allClean: boolean
 *   }
 */

import {
  parseArgs,
  readDsl,
  emitOk,
  emitValidationError,
  run,
  EXIT_VALIDATION,
} from './_lib.mjs';
import { runCriticOnDsl } from './_critic_lib.mjs';

run(async () => {
  const args = parseArgs();
  const dsl = readDsl(args);
  const strict = args.strict === true;
  const only = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
  const skip = args.skip ? new Set(String(args.skip).split(',').map((s) => s.trim())) : null;

  const result = await runCriticOnDsl(dsl, { only, skip, strict });

  if (result.parseErrors) emitValidationError(result.parseErrors);
  if (result.semErrors) emitValidationError(result.semErrors, null, result.semWarnings ?? []);
  if (result.convertError) emitValidationError([{ message: result.convertError }]);

  const { findings, summary, score, allClean, semWarnings } = result;
  const data = { findings, summary, score, allClean };

  if (strict && summary.errorCount > 0) {
    process.stdout.write(
      JSON.stringify({
        success: false,
        data,
        warnings: semWarnings ?? [],
        errors: findings,
      }) + '\n',
    );
    process.exit(EXIT_VALIDATION);
  }

  emitOk(data, semWarnings ?? []);
});
