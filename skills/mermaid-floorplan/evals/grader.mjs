#!/usr/bin/env node
/**
 * grader.mjs — evaluate a single eval run against its declared assertions.
 *
 * Reads the eval definition from evals.json, the run outputs from
 * evals/runs/<iteration>/<eval_id>/, and produces a JSON report with
 * per-assertion pass/fail.
 *
 * Usage:
 *   node grader.mjs --eval create_studio --run-dir evals/runs/iteration-1/with-skill/create_studio
 *   node grader.mjs --eval-all --iteration iteration-1   (grades every eval in both arms)
 *
 * The grader is deterministic and does not call an LLM — it shells out to
 * the bundled scripts (validate.mjs, design_critic.mjs, analyze.mjs,
 * compare_visual.py) and applies pure functions per assertion kind.
 */

import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(__dirname, '..');
const SCRIPTS = join(SKILL_ROOT, 'scripts');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[k] = v;
    }
  }
  return args;
}

function runScript(name, args) {
  try {
    const isPython = name.endsWith('.py');
    const cmd = isPython ? 'python3' : 'node';
    const script = join(SCRIPTS, name);
    const out = execFileSync(cmd, [script, ...args], { encoding: 'utf-8' });
    return JSON.parse(out);
  } catch (err) {
    if (err.stdout) {
      try { return JSON.parse(err.stdout.toString('utf-8')); }
      catch { /* fallthrough */ }
    }
    return { success: false, error: String(err.message ?? err) };
  }
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf-8')); }
  catch { return null; }
}

function safeStat(path) {
  try { return statSync(path); }
  catch { return null; }
}

function pass(message) {
  return { ok: true, message };
}
function fail(message, details) {
  return { ok: false, message, details };
}

function inferKindFromName(name = '', label = '') {
  const text = `${name} ${label}`.toLowerCase();
  // Order matters: more-specific tokens first so that compound names like
  // "MasterBath", "HallBath", "BedroomCloset" classify as the rightmost noun.
  if (/(powder)/.test(text)) return 'powder_room';
  if (/(bath|wc|toilet|restroom|ensuite)/.test(text)) return 'bathroom';
  if (/(kitchen|kitchenette|galley)/.test(text)) return 'kitchen';
  if (/(dining)/.test(text)) return 'dining';
  if (/(laundry|utility)/.test(text)) return 'laundry';
  if (/(closet|wardrobe)/.test(text)) return 'closet';
  if (/(garage)/.test(text)) return 'garage';
  if (/(retail|sales)/.test(text)) return 'retail';
  if (/(stair|stairs)/.test(text)) return 'stair';
  if (/(lift|elevator)/.test(text)) return 'lift';
  if (/(office|study|den)/.test(text)) return 'office';
  if (/(storage)/.test(text)) return 'closet';
  if (/(bedroom|bed\s*\d+|bed\d+|sleep|primary|master|kids?)/.test(text)) return 'bedroom';
  if (/(foyer|entry|vestibule)/.test(text)) return 'entry';
  if (/(living|salon|lounge)/.test(text)) return 'living';
  if (/(hall|corridor)/.test(text)) return 'hallway';
  return 'other';
}

function getRoomKinds(rooms) {
  return rooms.map((r) => ({
    id: r.id ?? r.name,
    label: r.label ?? '',
    kind: r.kind ?? inferKindFromName(r.id ?? r.name, r.label),
    width: r.width ?? r.size?.width ?? r.dimensions?.width,
    height: r.height ?? r.size?.height ?? r.dimensions?.height,
    area: r.area,
  }));
}

function roomDims(r) {
  return {
    width: r.width ?? r.size?.width ?? r.dimensions?.width,
    height: r.height ?? r.size?.height ?? r.dimensions?.height,
  };
}

const ASSERTIONS = {
  validate({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    if (!existsSync(path)) return fail(`Missing ${assertion.file}`);
    const result = runScript('validate.mjs', [path]);
    const ok = (result?.data?.valid === true) === (assertion.expected?.valid === true);
    return ok ? pass('valid as expected')
              : fail('validation result diverged', { result });
  },
  render_exists({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const stat = safeStat(path);
    if (!stat) return fail(`Missing ${assertion.file}`);
    if (assertion.minBytes && stat.size < assertion.minBytes) {
      return fail(`Render is smaller than minBytes (${stat.size} < ${assertion.minBytes})`);
    }
    return pass(`${stat.size} bytes`);
  },
  rooms_present({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const rooms = result?.data?.rooms ?? [];
    if (rooms.length < (assertion.minRooms ?? 1))
      return fail(`Only ${rooms.length} rooms (< ${assertion.minRooms})`);
    return pass(`${rooms.length} rooms`);
  },
  kind_count({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const rooms = getRoomKinds(result?.data?.rooms ?? []);
    const target = assertion.roomKind ?? assertion.kindName;
    if (!target) return fail('kind_count assertion missing `roomKind`');
    const count = rooms.filter((r) => r.kind === target).length;
    if (typeof assertion.exactly === 'number' && count !== assertion.exactly)
      return fail(`Expected ${assertion.exactly} ${target}, got ${count}`);
    if (typeof assertion.atLeast === 'number' && count < assertion.atLeast)
      return fail(`Expected ≥${assertion.atLeast} ${target}, got ${count}`);
    return pass(`${count} ${target}`);
  },
  kind_coverage({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const rooms = getRoomKinds(result?.data?.rooms ?? []);
    const present = new Set(rooms.map((r) => r.kind));
    const matches = (assertion.kinds ?? []).filter((k) => present.has(k));
    if (matches.length < (assertion.atLeast ?? 1))
      return fail(`Only matched ${matches.length}/${assertion.kinds?.length} kinds`);
    return pass(`matched ${matches.join(', ')}`);
  },
  area_within({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const rooms = result?.data?.rooms ?? [];
    const gross = result?.data?.summary?.grossFloorArea;
    const area = typeof gross === 'number'
      ? gross
      : rooms.reduce((s, r) => {
          if (typeof r.area === 'number') return s + r.area;
          const { width, height } = roomDims(r);
          return s + (width ?? 0) * (height ?? 0);
        }, 0);
    const target = assertion.target;
    const tolerance = assertion.tolerance ?? 0.2;
    if (Math.abs(area - target) > target * tolerance)
      return fail(`Area ${area} outside ±${tolerance * 100}% of ${target}`);
    return pass(`${area} sqft (target ${target})`);
  },
  critic({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('design_critic.mjs', [path]);
    const findings = result?.data?.findings ?? [];
    const errors = findings.filter((f) => f.severity === 'error').length;
    if (errors > (assertion.maxErrors ?? 0))
      return fail(`Critic reports ${errors} errors`, { findings });
    return pass(`${errors} critic errors`);
  },
  every_bedroom_has_window({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('design_critic.mjs', [path]);
    const findings = result?.data?.findings ?? [];
    const offenders = findings.filter((f) => f.rule === 'bedroom_window' || f.rule === 'windowless_habitable');
    if (offenders.length > 0)
      return fail('A bedroom is missing a window', { offenders });
    return pass('every bedroom has a window');
  },
  wet_walls_share({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('design_critic.mjs', [path]);
    const findings = result?.data?.findings ?? [];
    const offending = findings.find((f) => f.rule === 'wet_walls');
    if (offending) return fail('Wet rooms do not share walls', { offending });
    return pass('wet rooms share at least one wall');
  },
  wet_walls_separated({ assertion, runDir }) {
    // Inverse of wet_walls_share: pass when wet rooms do NOT share a wall.
    // The critic emits an `info` finding with rule `wet_walls` exactly when
    // no two wet rooms (kitchen / bath / laundry) are adjacent.
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('design_critic.mjs', [path]);
    const findings = result?.data?.findings ?? [];
    const wetWallsInfo = findings.find((f) => f.rule === 'wet_walls');
    if (!wetWallsInfo) {
      return fail(
        'Kitchen and bathroom share a wall (the prompt required them to be separated)',
        { hint: 'Move the bath so it does not share any wall with the kitchen.' },
      );
    }
    return pass('wet rooms are separated (no shared walls)');
  },
  no_hallway({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const offenders = (result?.data?.rooms ?? [])
      .map((r) => ({ id: r.id ?? r.name, label: r.label ?? '' }))
      .filter((r) => inferKindFromName(r.id, r.label) === 'hallway');
    if (offenders.length > 0)
      return fail(`Plan contains hallway/corridor rooms: ${offenders.map((o) => o.id).join(', ')}`, { offenders });
    return pass('no hallway/corridor rooms');
  },
  critic_no_rule_findings({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('design_critic.mjs', [path]);
    const findings = result?.data?.findings ?? [];
    const targetRules = new Set(assertion.rules ?? []);
    const offending = findings.filter((f) => targetRules.has(f.rule));
    if (offending.length > 0)
      return fail(
        `Critic raised forbidden rules: ${offending.map((f) => f.rule).join(', ')}`,
        { offending },
      );
    return pass(`no findings for ${[...targetRules].join(', ')}`);
  },
  no_walk_through_bedrooms({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('design_critic.mjs', [path]);
    const findings = result?.data?.findings ?? [];
    const offending = findings.find((f) => f.rule === 'bedroom_walk_through' || f.rule === 'walk_through');
    if (offending) return fail('A bedroom is reachable only via another bedroom', { offending });
    return pass('no walk-through bedrooms');
  },
  room_present({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const ids = (result?.data?.rooms ?? []).map((r) => r.id ?? r.name);
    const candidates = [assertion.id, ...(assertion.altIds ?? [])];
    const found = candidates.find((c) => ids.includes(c));
    if (!found) return fail(`No room matched ${candidates.join('/')}`, { ids });
    return pass(`${found} present`);
  },
  room_absent({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const ids = (result?.data?.rooms ?? []).map((r) => r.id ?? r.name);
    if (ids.includes(assertion.id)) return fail(`Room ${assertion.id} still present`, { ids });
    return pass(`${assertion.id} absent`);
  },
  room_size({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const room = (result?.data?.rooms ?? []).find((r) => (r.id ?? r.name) === assertion.id);
    if (!room) return fail(`Room ${assertion.id} not found`);
    const { width, height } = roomDims(room);
    if (width !== assertion.expectedWidth || height !== assertion.expectedHeight)
      return fail(`Size ${width}x${height} ≠ ${assertion.expectedWidth}x${assertion.expectedHeight}`);
    return pass('size matches');
  },
  room_size_grew({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const candidates = [assertion.id, ...(assertion.altIds ?? [])];
    const room = (result?.data?.rooms ?? []).find((r) => candidates.includes(r.id ?? r.name));
    if (!room) return fail(`Room ${candidates.join('/')} not found`);
    const { width, height } = roomDims(room);
    return pass(`now ${width}x${height}`);
  },
  anchor_only_absolute({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const dsl = readFileSync(path, 'utf-8');
    const matches = [...dsl.matchAll(/^\s*room\s+(\w+).*?\bat\s*\(/gm)];
    const absoluteIds = matches.map((m) => m[1]);
    if (absoluteIds.length !== 1 || absoluteIds[0] !== assertion.anchor)
      return fail(`Expected only ${assertion.anchor} absolute, got ${absoluteIds.join(',')}`);
    return pass(`${assertion.anchor} is the only absolute room`);
  },
  render_unchanged({ assertion, runDir }) {
    // Both `before` and `after` may point at .floorplan files. The grader
    // auto-renders either side to a sibling .png if it is missing, so the
    // eval contract for the agent stays the same: produce the .floorplan,
    // and the grader handles round-trip rendering.
    const ensurePng = (input) => {
      if (input.endsWith('.png')) return input;
      const png = input.replace(/\.floorplan$/, '.png');
      if (existsSync(png)) return png;
      const renderRes = runScript('render.mjs', [input, '--out', png]);
      if (!renderRes?.success) {
        throw new Error(`render.mjs failed for ${input}: ${renderRes?.error ?? '(unknown)'}`);
      }
      return png;
    };
    const beforeRel = assertion.before;
    let beforePath;
    if (beforeRel.startsWith('fixtures/')) {
      beforePath = resolve(__dirname, beforeRel);
    } else if (beforeRel.startsWith('outputs/')) {
      beforePath = join(runDir, beforeRel);
    } else {
      beforePath = resolve(runDir, '..', '..', '..', '..', beforeRel);
    }
    const afterPath = join(runDir, 'outputs', assertion.after.split('/').pop());
    let beforePng;
    let afterPng;
    try {
      beforePng = ensurePng(beforePath);
      afterPng = ensurePng(afterPath);
    } catch (err) {
      return fail(String(err.message ?? err));
    }
    const cmp = runScript('compare_visual.py', ['--a', beforePng, '--b', afterPng]);
    const sim = cmp?.data?.similarity ?? 0;
    if (sim < (assertion.minSimilarity ?? 0.95))
      return fail(`Similarity ${sim.toFixed(2)} < ${assertion.minSimilarity}`);
    return pass(`similarity ${sim.toFixed(3)}`);
  },
  compare_similarity({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = readJson(path);
    const sim = result?.data?.similarity ?? result?.similarity ?? 0;
    if (sim < (assertion.minSimilarity ?? 0.5))
      return fail(`Similarity ${sim.toFixed(2)} < ${assertion.minSimilarity}`);
    return pass(`similarity ${sim.toFixed(3)}`);
  },
  brief_has_confidence({ assertion, runDir }) {
    const brief = readJson(join(runDir, 'outputs', assertion.file));
    if (!brief) return fail('Brief missing');
    const withConf = (brief.rooms ?? []).filter((r) => r.size?.confidence != null || r.confidence != null).length;
    if (withConf < (assertion.minRoomsWithConfidence ?? 1))
      return fail(`Only ${withConf} rooms have confidence scores`);
    return pass(`${withConf} rooms with confidence`);
  },
  brief_no_dim_above_unverified({ assertion, runDir }) {
    const brief = readJson(join(runDir, 'outputs', assertion.file));
    if (!brief) return fail('Brief missing');
    const offenders = (brief.rooms ?? []).filter((r) => r.size && (r.size.width != null) && r.size.confidence == null);
    if (offenders.length > 0)
      return fail(`${offenders.length} rooms have dimensions without confidence`, { offenders });
    return pass('all sized rooms include confidence');
  },
  turn_logs({ assertion, runDir }) {
    for (const f of assertion.files) {
      const log = readJson(join(runDir, 'outputs', f));
      if (!log) return fail(`Missing turn log ${f}`);
      const phases = (log.phases ?? log.actions ?? []).map((p) => p.tool ?? p.name);
      const required = assertion.everyTurnIncludes ?? [];
      for (const r of required) {
        if (!phases.includes(r)) return fail(`Turn ${f} missing ${r}`, { phases });
      }
    }
    return pass('every turn ran the required phases');
  },
  all_validate({ assertion, runDir }) {
    for (const f of assertion.files) {
      const path = join(runDir, 'outputs', f);
      const result = runScript('validate.mjs', [path]);
      if (!result?.data?.valid) return fail(`${f} failed validation`);
    }
    return pass(`all ${assertion.files.length} files valid`);
  },
  all_render({ assertion, runDir }) {
    for (const f of assertion.files) {
      const stat = safeStat(join(runDir, 'outputs', f));
      if (!stat) return fail(`Missing render ${f}`);
      if (assertion.minBytes && stat.size < assertion.minBytes)
        return fail(`${f} is too small (${stat.size}B)`);
    }
    return pass(`all renders ≥ ${assertion.minBytes ?? 0}B`);
  },
  layouts_distinct({ assertion, runDir }) {
    const files = assertion.files;
    let maxSim = 0;
    for (let i = 0; i < files.length; i += 1) {
      for (let j = i + 1; j < files.length; j += 1) {
        const cmp = runScript('compare_visual.py', [
          '--a', join(runDir, 'outputs', files[i]),
          '--b', join(runDir, 'outputs', files[j]),
        ]);
        const sim = cmp?.data?.similarity ?? 1;
        if (sim > maxSim) maxSim = sim;
      }
    }
    if (maxSim > (assertion.maxPairwiseSimilarity ?? 0.95))
      return fail(`Pairwise similarity ${maxSim.toFixed(2)} too high`);
    return pass(`max pairwise similarity ${maxSim.toFixed(3)}`);
  },
  floor_count({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const result = runScript('analyze.mjs', [path]);
    const floors = result?.data?.floors ?? [];
    if (assertion.exactly != null && floors.length !== assertion.exactly)
      return fail(`Expected exactly ${assertion.exactly} floors, got ${floors.length}`, { floorIds: floors.map((f) => f.id) });
    if (assertion.atLeast != null && floors.length < assertion.atLeast)
      return fail(`Expected at least ${assertion.atLeast} floors, got ${floors.length}`);
    return pass(`${floors.length} floors`);
  },
  vertical_link_present({ assertion, runDir }) {
    const path = join(runDir, 'outputs', assertion.file);
    const dsl = readFileSync(path, 'utf-8');
    // The DSL syntax is `vertical Floor1.Stair to Floor2.Stair [...]`.
    // Match any line that starts with `vertical` and references at least
    // two floor.element pairs joined by `to`.
    const linkPattern = /^\s*vertical\s+\w+\.\w+\s+to\s+\w+\.\w+/m;
    if (!linkPattern.test(dsl))
      return fail('No `vertical <Floor>.<Stair> to <Floor>.<Stair>` link found in the DSL');
    return pass('vertical link declared');
  },
  critic_findings_decreased({ assertion, runDir }) {
    const before = readJson(join(runDir, 'outputs', assertion.before));
    const after = readJson(join(runDir, 'outputs', assertion.after));
    const b = (before?.data?.findings ?? before?.findings ?? []).length;
    const a = (after?.data?.findings ?? after?.findings ?? []).length;
    if (b - a < (assertion.minReduction ?? 1))
      return fail(`Findings only dropped from ${b} to ${a}`);
    return pass(`findings ${b} → ${a}`);
  },
};

function gradeRun(evalDef, runDir) {
  const results = [];
  for (const assertion of evalDef.assertions ?? []) {
    const handler = ASSERTIONS[assertion.kind];
    if (!handler) {
      results.push({ assertion, ok: false, message: `Unknown assertion kind: ${assertion.kind}` });
      continue;
    }
    try {
      const r = handler({ assertion, runDir });
      results.push({ assertion, ...r });
    } catch (err) {
      results.push({ assertion, ok: false, message: String(err?.message ?? err) });
    }
  }
  const passed = results.filter((r) => r.ok).length;
  return { evalId: evalDef.id, runDir, passed, total: results.length, results };
}

function loadEvals() {
  return JSON.parse(readFileSync(join(__dirname, 'evals.json'), 'utf-8'));
}

function main() {
  const args = parseArgs(process.argv);
  const evalsDoc = loadEvals();
  const evalsById = Object.fromEntries(evalsDoc.evals.map((e) => [e.id, e]));

  if (args['eval-all']) {
    const iteration = args.iteration ?? 'iteration-1';
    const root = join(__dirname, 'runs', iteration);
    const arms = ['with-skill', 'baseline'];
    const report = { iteration, generated_at: new Date().toISOString(), arms: {} };
    for (const arm of arms) {
      const armDir = join(root, arm);
      if (!existsSync(armDir)) continue;
      const armResults = [];
      for (const e of evalsDoc.evals) {
        const runDir = join(armDir, e.id);
        if (!existsSync(runDir)) {
          armResults.push({ evalId: e.id, runDir, status: 'missing' });
          continue;
        }
        armResults.push(gradeRun(e, runDir));
      }
      report.arms[arm] = armResults;
    }
    const out = join(root, 'benchmark.json');
    writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ success: true, data: { wrote: out } }));
    return;
  }

  if (args.eval) {
    const evalDef = evalsById[args.eval];
    if (!evalDef) {
      console.log(JSON.stringify({ success: false, error: `Unknown eval ${args.eval}` }));
      process.exit(1);
    }
    if (!args['run-dir']) {
      console.log(JSON.stringify({ success: false, error: 'Missing --run-dir' }));
      process.exit(1);
    }
    const report = gradeRun(evalDef, args['run-dir']);
    console.log(JSON.stringify({ success: true, data: report }, null, 2));
    return;
  }

  console.log(JSON.stringify({ success: false, error: 'Provide --eval <id> --run-dir <path> or --eval-all' }));
  process.exit(1);
}

main();
