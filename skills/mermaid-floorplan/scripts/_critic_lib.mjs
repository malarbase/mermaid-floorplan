/**
 * Public entry point for the critic subsystem.
 *
 * Consumers (design_critic.mjs, suggest_improvements.mjs) import only from
 * this file. All implementation lives in the _critic/ subdirectory.
 *
 * Re-exported geometry/context symbols:
 *   KIND_PATTERNS, WET_KINDS, HABITABLE_KINDS, PUBLIC_KINDS, CIRCULATION_KINDS,
 *   inferKind, roomBounds, sharedEdge, rectsOverlap, hasWindow,
 *   convertLengthToUnit, requiredLanding, computeStairFootprint,
 *   findStairContainer, bottomStepLandingStrip, topStepLandingStrip,
 *   suggestStairShape, f,
 *   extractConnectionsFromAst, buildCriticContext
 */

import { convertFloorplanToJson } from 'floorplan-language';
import { parseDsl, runLangiumValidation } from './_lib.mjs';

export * from './_critic/geometry.mjs';
export * from './_critic/context.mjs';

import { structuralRules } from './_critic/rules_structural.mjs';
import { habitableRules } from './_critic/rules_habitable.mjs';
import { stairRules } from './_critic/rules_stairs.mjs';

import { extractConnectionsFromAst, buildCriticContext } from './_critic/context.mjs';
import { f } from './_critic/geometry.mjs';

export const rules = {
  ...structuralRules,
  ...habitableRules,
  ...stairRules,
};

// ---------------------------------------------------------------------------
// Orchestration: run everything against a DSL string.
// Returns { findings, summary, score, allClean, ctx, json, semWarnings }.
// Callers are responsible for emit/exit behaviour; this function never
// calls emit*().
// ---------------------------------------------------------------------------

export async function runCriticOnDsl(dsl, { only = null, skip = null, strict = false } = {}) {
  const { document, parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) {
    return { parseErrors };
  }
  const { errors: semErrors, warnings: semWarnings } = await runLangiumValidation(document);
  if (semErrors.length > 0) {
    return { semErrors, semWarnings };
  }

  const floorplan = document.parseResult.value;
  const json = convertFloorplanToJson(floorplan);
  if (!json.data) {
    return { convertError: 'Failed to convert floorplan to JSON' };
  }

  const astConnections = extractConnectionsFromAst(floorplan);
  const ctx = buildCriticContext(
    json.data.floors,
    astConnections,
    json.data.verticalConnections ?? [],
    json.data.config ?? {},
  );
  if (!ctx) {
    return { convertError: 'No floors in floorplan; nothing to critique.' };
  }

  const ruleNames = Object.keys(rules).filter((n) => {
    if (only && !only.includes(n)) return false;
    if (skip && skip.has(n)) return false;
    return true;
  });

  // Rules that need cross-floor context (ctx.floors / ctx.verticalConnections)
  // run once on the merged ctx. All other rules run per-floor so that
  // single-floor rules like windowless_habitable, bathroom_privacy, and
  // bedroom_bath_adjacency catch issues on upper floors too.
  const MULTI_FLOOR_RULES = new Set([
    'footprint_aligned',
    'stair_vertical_aligned',
    'multi_floor_egress',
    'stair_landing_egress',
    'missing_roof_floor',
    'roof_parapet_walls',
  ]);
  // Rules that only make sense on the ground floor (because they look for
  // exterior doors). On upper floors, multi_floor_egress already covers
  // the equivalent check via vertical links.
  const GROUND_FLOOR_ONLY_RULES = new Set(['entry_from_outside']);

  const findings = [];
  const failedRules = new Set();
  const seenFingerprints = new Set();
  const pushUnique = (rFindings) => {
    for (const finding of rFindings) {
      const fp = `${finding.rule}|${finding.severity}|${finding.message}|${(finding.rooms ?? []).join(',')}`;
      if (seenFingerprints.has(fp)) continue;
      seenFingerprints.add(fp);
      findings.push(finding);
    }
  };

  const perFloorCtxs = ctx.floors && ctx.floors.length > 0 ? ctx.floors : [ctx];
  for (const name of ruleNames) {
    const rule = rules[name];
    let collected;
    if (MULTI_FLOOR_RULES.has(name)) {
      collected = rule(ctx);
    } else if (GROUND_FLOOR_ONLY_RULES.has(name)) {
      collected = rule(perFloorCtxs[0]);
    } else {
      collected = [];
      for (const floorCtx of perFloorCtxs) {
        // Each per-floor ctx carries only its own floor's rooms / connections,
        // so single-floor rules naturally scope to that floor.
        const r = rule(floorCtx);
        if (r.length) collected.push(...r);
      }
    }
    if (collected.length > 0) failedRules.add(name);
    pushUnique(collected);
  }

  // Surface the validator's 3D-specific warnings as low-severity critic
  // findings under a synthetic `validator_3d` rule so the agent treats
  // "wall mismatch", "room taller than floor", etc. the same way as
  // architectural rules (instead of having to scrape semWarnings).
  const validator3dKeywords = [
    '3D viewer',
    '3D rendering',
    '3D view',
    'realistic 3D',
  ];
  for (const w of semWarnings ?? []) {
    const msg = w?.message ?? '';
    if (!validator3dKeywords.some((k) => msg.includes(k))) continue;
    findings.push(
      f(
        'validator_3d',
        'info',
        msg,
        [],
        { source: 'langium-validator', original: w },
        'check 3D rendering and adjust wall types / room heights so the 3D view stays consistent',
      ),
    );
    failedRules.add('validator_3d');
  }

  if (strict) {
    for (const x of findings) {
      if (x.severity === 'warning') x.severity = 'error';
    }
  }

  const errorCount = findings.filter((x) => x.severity === 'error').length;
  const warningCount = findings.filter((x) => x.severity === 'warning').length;
  const infoCount = findings.filter((x) => x.severity === 'info').length;

  let score = 100;
  for (const x of findings) {
    if (x.severity === 'error') score -= 10;
    else if (x.severity === 'warning') score -= 3;
    else score -= 1;
  }
  score = Math.max(0, score);

  return {
    findings,
    summary: {
      errorCount,
      warningCount,
      infoCount,
      rulesChecked: ruleNames,
      rulesFailed: [...failedRules],
    },
    score,
    allClean: findings.length === 0,
    ctx,
    json,
    semWarnings,
  };
}
