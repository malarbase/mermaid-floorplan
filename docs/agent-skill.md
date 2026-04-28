# Agent Skill: `mermaid-floorplan`

> **Skill source:** [`.cursor/skills/mermaid-floorplan/`](../.cursor/skills/mermaid-floorplan/)
> **Skill manifest:** [`SKILL.md`](../.cursor/skills/mermaid-floorplan/SKILL.md)
> **Eval suite:** [`evals/`](../.cursor/skills/mermaid-floorplan/evals/)

This is a Cursor / Claude agent skill that turns the LLM into a competent
collaborator for the `mermaid-floorplan` DSL. It wraps the public
[`floorplan-language`](../floorplan-language/) parser/renderer and the
[`floorplan-mcp-server`](../floorplan-mcp-server/) AST editor in a small
set of bundled scripts so the agent can author, refine, reverse‑engineer,
and critique floor plans without a running MCP server.

This document is the canonical reference for **what the skill can do**.
For full prose protocol (when to ask vs. act, tutor‑style worked
examples), read [`SKILL.md`](../.cursor/skills/mermaid-floorplan/SKILL.md).

---

## 1. Scope

### When to invoke the skill

- Any request that mentions "floorplan", "floor plan", `.floorplan`, or
  attaches a `.floorplan` file.
- Designing or sketching a room / apartment / office / house / suite /
  shop in textual form.
- Converting a floor plan **image (PNG/JPG/screenshot) or PDF** into
  equivalent DSL.
- Modifying, resizing, renaming, moving, adding, or removing rooms in
  an existing `.floorplan` via natural language.
- Asking for **multiple layout options**, **design critique**, or
  **accessibility review** of a plan.
- Multi‑story plans (townhouses, two‑story houses, hotel suites,
  small offices) — including stair / lift stacking and 3D feedback.

### When **not** to invoke

- Mermaid flowcharts, sequence, ER, gantt, etc. (use the standard
  Mermaid skill).
- 3D architectural modelling beyond axonometric feedback (use the
  `floorplan-viewer` Three.js app).
- CAD / BIM interchange beyond the renderer's built‑in DXF export.

---

## 2. Capability matrix

| Capability                            | Script                          | Notes                                                                    |
| ------------------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| Parse + semantic validation           | `validate.mjs`                  | Mirrors MCP `validate_floorplan`. `--strict` promotes warnings.          |
| 2D render → SVG + PNG                 | `render.mjs`                    | Single floor, all‑floors stacked, or all‑floors side‑by‑side.            |
| 3D render (axonometric)               | `render_3d.mjs`                 | Headless iso/cabinet projection; for self‑review of stacking & stairs.   |
| Brief → starter DSL                   | `program_to_skeleton.mjs`       | Simple counts or rich [`program_brief.schema.json`](../.cursor/skills/mermaid-floorplan/scripts/program_brief.schema.json). `--floors N` for multi‑story. |
| AST‑safe edits                        | `modify.mjs`                    | JSON ops file: `add_room`, `remove_room`, `resize_room`, `move_room`, `rename_room`, `update_walls`, `add_label`, `convert_to_relative`. |
| Plan analysis (rooms, areas, graph)   | `analyze.mjs`                   | Returns adjacency, computed sizes, resolved positions.                   |
| Design critique                       | `design_critic.mjs`             | 15 multi‑floor‑aware rules. Score 0‑100, findings, suggestions.          |
| Critique → concrete edit ops          | `suggest_improvements.mjs`      | Maps critic findings to `modify.mjs` ops the agent can apply.            |
| N candidate layouts from one brief    | `generate_variations.mjs`       | Strategies: `linear`, `l-shape`, `central-corridor`. `--render`.         |
| PDF / image rasterization             | `ingest_source.py`              | Wraps the sibling `pdf` skill. `--dpi`, optional upsample.               |
| Visual diff between two renders       | `compare_visual.py`             | SSIM score + diff PNG; targets ≥ 0.55 (sketches), ≥ 0.70 (digital).      |
| MCP parity check                      | `mcp_parity_check.mjs`          | Diffs bundled‑script output vs. live MCP server. CI safety net.          |

All scripts share a single I/O contract — see §6.

---

## 3. The four core workflows

The skill is organised around four end‑to‑end loops, all of which share
the same primitives (validate → render → critic → iterate).

### Workflow A — Brief → DSL

```
brief.json  ──►  program_to_skeleton.mjs  ──►  plan.floorplan
                                                     │
                            ┌────────────────────────┤
                            ▼                        ▼
                       validate.mjs            render.mjs
                            │                        │
                            └──►  design_critic.mjs ◄┘
                                         │
                                         ▼
                                suggest_improvements.mjs
                                         │
                                         ▼
                                    modify.mjs  ──►  plan.v2
```

Use `generate_variations.mjs` for non‑trivial briefs to give the user a
linear / L‑shaped / central‑corridor menu before settling on one.

### Workflow B — Modify existing plan

```
plan.floorplan ──► analyze.mjs ──► (translate NL ask to ops) ──►
                                       modify.mjs ──► plan.floorplan
                                            │
                                            └──► validate / render / critic
```

### Workflow C — Image / PDF → DSL

```
sketch.pdf ──► ingest_source.py ──► frames/page_1.png
                                         │
                                  (vision pass; fill brief
                                   with confidence per field)
                                         │
                                         ▼
                                    brief.json
                                         │
                                         ▼
                              program_to_skeleton.mjs ──► reconstructed.floorplan
                                         │
                                         ▼
                                    render.mjs
                                         │
                                         ▼
                              compare_visual.py (SSIM)
```

Aim for SSIM ≥ 0.55 on hand sketches, ≥ 0.70 on digital sources.
Confidence < 0.5 on any numeric field → re‑ingest at higher DPI or
ask the user.

### Workflow D — Conversational refinement

Per turn: `analyze → translate to smallest op set → modify → validate
→ render → critic`. Keep diffs small (≤ 3 ops/turn).

---

## 4. Multi‑floor + 3D capabilities

Multi‑story plans are first‑class. The skill knows how to:

- **Stack circulation.** `program_to_skeleton.mjs --floors 3` emits a
  stair (and optional lift) at identical `(x, y)` on every floor and
  appends the required `vertical FloorA.MainStair to FloorB.MainStair`
  link.
- **Validate vertical alignment.** `design_critic.mjs` enforces three
  multi‑floor rules:
  - `footprint_aligned` — upper floors must not cantilever beyond the
    ground footprint without explicit slab support.
  - `stair_vertical_aligned` — every `vertical` link must connect
    elements with matching `(x, y)` and width.
  - `multi_floor_egress` — every habitable upper floor must reach a
    declared stair or lift.
  Single‑floor rules (windowless habitable, bath privacy, bedroom‑bath
  adjacency, reachability) **also run on every floor**, not just the
  ground.
- **Render in 3D.** `render_3d.mjs` produces a static axonometric
  SVG/PNG — extruded room boxes, wall‑type colour coding, sloped
  stair runs, lift shafts. No browser, no Three.js. Use it as a
  self‑review step in the agent loop. For full WebGL / GLB export, fall
  back to the `floorplan-viewer` app.

See [`references/multi-floor.md`](../.cursor/skills/mermaid-floorplan/references/multi-floor.md)
for stair/lift conventions, plumbing‑stack heuristics, and naming.

---

## 5. The design critic in detail

`design_critic.mjs` runs 15 rules against the resolved AST. Each finding
has `rule`, `severity` (`error` | `warning` | `info`), `message`,
`rooms`, `details`, and a concrete `suggestion`. The aggregate `score`
is 100 minus a weighted penalty per finding.

### Single‑floor rules

| Rule                       | What it catches                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `entry_from_outside`       | No door from any room to `outside` — the plan is sealed.                                     |
| `reachability`             | Rooms disconnected from the entry by any door / opening graph traversal.                     |
| `corridor_width`           | Hallways narrower than 3 ft (residential) / 44 in (commercial), per `config.stair_code`.     |
| `door_opening`             | A `connect` declares a door on walls that don't share an edge.                               |
| `windowless_habitable`     | Bedroom / living / dining / office / kitchen with **no** `window` wall.                      |
| `bedroom_bath_adjacency`   | Any bedroom (not only master) further than 2 hops from a bathroom.                           |
| `wet_walls`                | No two wet rooms share a wall (info — plumbing preference, not a defect).                    |
| `bathroom_off_entry`       | Bath opens directly onto a foyer / lobby / outside — privacy violation.                      |
| `corridor_only_hallway`    | Hallway connects ≤ 2 rooms and consumes meaningful area — likely should be open‑plan.        |
| `bathroom_privacy`         | Bath door on a public room (living / dining / kitchen).                                      |
| `bedroom_size`             | Bedroom too small for a queen bed + clearance.                                               |
| `overlap`                  | Two rooms occupy the same coordinates (shouldn't happen if validate passes, belt + braces). |

### Multi‑floor rules

| Rule                       | What it catches                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `footprint_aligned`        | Upper floor cantilevers past the ground floor's outer bounds.                                |
| `stair_vertical_aligned`   | `vertical` link mismatches in `(x, y)` or width across floors.                               |
| `multi_floor_egress`       | Habitable upper floor with no stair/lift element, or no `vertical` link to one below.        |

A 16th meta‑rule, `validator_3d`, surfaces 3D height/wall‑type
mismatches that the renderer would otherwise hide. Think parapet vs.
full‑height room (intentional), or accidental height inconsistencies on
shared walls.

### Room‑kind inference

The critic infers room kind from `name` + `label` using ordered regex
patterns (more‑specific first, e.g. `powder` before `bath`, `master_bed`
before `bedroom`). Categories:

```
HABITABLE_KINDS  = bedroom, master_bedroom, living, dining, office, kitchen
WET_KINDS        = bath, ensuite, powder, kitchen, laundry
PUBLIC_KINDS     = living, dining, kitchen, lobby
CIRCULATION_KINDS = hallway, entry, lobby
```

This is why renaming a room in the DSL changes which rules fire on it:
labelling something `Great Hall` matches `hall`/`hallway` (circulation,
not habitable), so it's exempt from `windowless_habitable`.

---

## 6. The script contract

Every script in
[`scripts/`](../.cursor/skills/mermaid-floorplan/scripts/) shares one
contract so the agent can call them uniformly. See
[`scripts/README.md`](../.cursor/skills/mermaid-floorplan/scripts/README.md)
for the canonical version.

### Input

Any script that consumes DSL accepts it three ways, in order:

1. `--dsl '<literal>'` inline.
2. `--file <path>` or first positional arg — `.floorplan` or text file.
3. stdin if neither is set and stdin is not a TTY.

JSON briefs / PDFs / images use named flags (`--brief`, `--source`).

### Output

Exactly **one line of JSON** to stdout, then exit. The envelope:

```json
{
  "success": true,
  "data": { "...script-specific..." },
  "warnings": [{ "message": "…", "line": 42 }],
  "errors": []
}
```

Binary artifacts (PNG/SVG, frames, variation directories) are written
to disk; their absolute paths come back in `data`.

### Exit codes

| Code | Meaning                                                                                  |
| ---- | ---------------------------------------------------------------------------------------- |
| `0`  | Success.                                                                                 |
| `1`  | Validation / user‑input error (bad DSL, missing file, unknown op, low‑confidence brief). |
| `2`  | Runtime error (missing optional dep, I/O failure, thrown exception).                     |

### Common flags

- `--strict` — promote warnings to errors (`validate.mjs`,
  `design_critic.mjs`, `mcp_parity_check.mjs`).
- `--dpi <int>` — rasterization DPI (`ingest_source.py`, default 200).
- `--out <path>` — destination file or directory (every artefact‑emitting
  script).
- `--width <int>` — rendered width in pixels (default 900).
- `--quiet` — suppress non‑essential warnings (errors are never
  suppressed).

### Shared libraries

- [`_lib.mjs`](../.cursor/skills/mermaid-floorplan/scripts/_lib.mjs) —
  Node ESM helpers: argv parsing, DSL input resolution, Langium parse +
  validate, JSON envelope emitters, runtime wrapper.
- [`_lib.py`](../.cursor/skills/mermaid-floorplan/scripts/_lib.py) —
  Python helpers: argv parsing, JSON envelope, dependency preflight
  (`pdf2image`, `PIL`).
- [`_critic_lib.mjs`](../.cursor/skills/mermaid-floorplan/scripts/_critic_lib.mjs)
  — kind inference, geometry, rule engine.
- [`_layout_lib.mjs`](../.cursor/skills/mermaid-floorplan/scripts/_layout_lib.mjs)
  — shared layout primitives (column packing, wall‑type defaults,
  multi‑floor stacking, DSL emission).

---

## 7. Templates

Polished seeds + intentionally rough variants live in
[`assets/templates/`](../.cursor/skills/mermaid-floorplan/assets/templates/),
each pre‑rendered to `assets/templates/renders/`.

| Polished                              | Rough variant                              | Notes                                                                       |
| ------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------- |
| `two-br.floorplan` (hero)             | —                                          | 2BR ~1000 sqft canonical, central hall                                      |
| `studio.floorplan`                    | `studio-rough.floorplan`                   | ~450 sqft studio, compact wet‑wall                                          |
| `studio-openplan.floorplan`           | —                                          | ~450 sqft studio, open‑plan public zone, no shared kitchen‑bath wall        |
| `one-br.floorplan`                    | `one-br-rough.floorplan`                   | ~720 sqft 1BR                                                               |
| `three-br-house.floorplan`            | `three-br-house-rough.floorplan`           | ~1800 sqft 3BR house                                                        |
| `hotel-suite.floorplan`               | `hotel-suite-rough.floorplan`              | ~520 sqft single‑key hotel suite                                            |
| `retail-shop.floorplan`               | `retail-shop-rough.floorplan`              | ~1100 sqft retail with BOH                                                  |
| `multi-floor-office.floorplan`        | `multi-floor-office-rough.floorplan`       | 2‑floor ~3200 sqft office                                                   |
| `townhouse-two-story.floorplan`       | `townhouse-two-story-rough.floorplan`      | 2‑floor 3BR/2.5BA ~1800 sqft, stair core stacking + `vertical` link         |

Use the rough variants when demonstrating the critic / suggester loop or
when you want a known‑broken "before" state for a refine demo.

---

## 8. References (read on demand)

The skill ships a focused references library — read these only when
the task touches them.

| File                                                                                       | Topic                                                                       |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| [`references/dsl-grammar.md`](../.cursor/skills/mermaid-floorplan/references/dsl-grammar.md)        | DSL surface, wall types, positioning, connections, sub‑rooms, frontmatter   |
| [`references/design-heuristics.md`](../.cursor/skills/mermaid-floorplan/references/design-heuristics.md) | Sensible defaults for room sizes, adjacency, plumbing, light                |
| [`references/patterns-library.md`](../.cursor/skills/mermaid-floorplan/references/patterns-library.md)   | Recurring layout patterns (central corridor, linear, L‑shape, loft)         |
| [`references/accessibility.md`](../.cursor/skills/mermaid-floorplan/references/accessibility.md)         | Corridor widths, turning radii, ramp slopes, within DSL limits              |
| [`references/multi-floor.md`](../.cursor/skills/mermaid-floorplan/references/multi-floor.md)             | Stair/lift conventions, plumbing stacks, egress, floor‑to‑floor heights      |
| [`references/image-extraction.md`](../.cursor/skills/mermaid-floorplan/references/image-extraction.md)   | Vision protocol, confidence fields, recovery paths                          |
| [`references/troubleshooting.md`](../.cursor/skills/mermaid-floorplan/references/troubleshooting.md)     | Parser errors → fixes; "render doesn't match source image" playbook         |

---

## 9. Quick‑start recipes

### Validate + render an existing plan

```bash
node .cursor/skills/mermaid-floorplan/scripts/validate.mjs examples/StyledApartment.floorplan
node .cursor/skills/mermaid-floorplan/scripts/render.mjs   examples/StyledApartment.floorplan \
    --out /tmp/styled.png --show-area --show-dimensions
```

### Generate a 2‑story townhouse from a brief

```bash
node .cursor/skills/mermaid-floorplan/scripts/program_to_skeleton.mjs \
    --brief brief.json --floors 2 --out town.floorplan

node .cursor/skills/mermaid-floorplan/scripts/validate.mjs      town.floorplan
node .cursor/skills/mermaid-floorplan/scripts/design_critic.mjs town.floorplan
node .cursor/skills/mermaid-floorplan/scripts/render.mjs        town.floorplan \
    --all-floors --layout stacked --out /tmp/town-2d.png
node .cursor/skills/mermaid-floorplan/scripts/render_3d.mjs     town.floorplan \
    --out /tmp/town-3d.png
```

### Reverse‑engineer a sketch

```bash
python3 .cursor/skills/mermaid-floorplan/scripts/ingest_source.py sketch.pdf \
    --out frames/ --dpi 300
# (vision pass to fill brief.json)
node .cursor/skills/mermaid-floorplan/scripts/program_to_skeleton.mjs \
    --brief brief.json --out reconstructed.floorplan
node .cursor/skills/mermaid-floorplan/scripts/render.mjs \
    reconstructed.floorplan --out reconstructed.png
python3 .cursor/skills/mermaid-floorplan/scripts/compare_visual.py \
    --a frames/page_1.png --b reconstructed.png --out diff.png
```

### Apply a JSON ops batch

```bash
node .cursor/skills/mermaid-floorplan/scripts/modify.mjs \
    plan.floorplan --ops ops.json --out plan.v2.floorplan
```

`ops.json` is a JSON array of `{ action, target, params }` objects —
same shape as the MCP `modify_floorplan` tool.

---

## 10. Worked examples in the repo

The skill ships four tutor‑style worked examples in
[`SKILL.md`](../.cursor/skills/mermaid-floorplan/SKILL.md), one per
workflow. The repo also contains end‑to‑end real‑world evaluations:

- [`examples/ImprovedTriplexVilla.floorplan`](../examples/ImprovedTriplexVilla.floorplan)
  — 3‑story luxury villa (4 500 sqft, 6 ensuite bedrooms, lift + stair,
  home theater, partly‑covered terrace). Improved from a starter at
  [`trial/ImprovedTriplexVilla.floorplan`](../trial/ImprovedTriplexVilla.floorplan).
  Critic delta: 0 → 96. 2D + 3D renders in
  [`examples/renders/`](../examples/renders/).
- [`examples/StyledApartment.floorplan`](../examples/StyledApartment.floorplan)
  — canonical small example using styles + relative positioning.
- [`examples/RelativePositioning.floorplan`](../examples/RelativePositioning.floorplan)
  — minimal demonstration of `right-of` / `below` / `align top`.

---

## 11. Evals

The skill is regression‑tested by
[`evals/`](../.cursor/skills/mermaid-floorplan/evals/):

- [`evals/evals.json`](../.cursor/skills/mermaid-floorplan/evals/evals.json)
  — declarative test cases (brief → expected critic deltas, expected
  ops, target SSIM, etc.).
- [`evals/grader.mjs`](../.cursor/skills/mermaid-floorplan/evals/grader.mjs)
  — runs each case end‑to‑end and scores it.
- [`evals/fixtures/`](../.cursor/skills/mermaid-floorplan/evals/fixtures/)
  — reference DSL + images.
- [`evals/runs/`](../.cursor/skills/mermaid-floorplan/evals/runs/) —
  timestamped run outputs for diffing.

Run all evals: `node .cursor/skills/mermaid-floorplan/evals/grader.mjs`.

---

## 12. Design principles (cheat sheet)

The skill enforces — and the agent should respect — these invariants:

1. **Exact inputs win.** If the user gives a size, keep it verbatim.
2. **Scripts own the rules.** Translate intent into script calls; don't
   do AST rewrites or arithmetic by hand.
3. **Validate before rendering.** `validate.mjs` is cheap; a failed
   render wastes a turn.
4. **Prefer relative positioning** for new rooms once an anchor exists.
5. **Always emit a `config` block** (`default_unit`, `area_unit`).
   Without it dimension labels render as `<value>undefined`.
6. **Surface preferences before generating** (wet walls split vs.
   shared, hallway vs. open plan).
7. **Multi‑story plans need a `vertical` link.** Otherwise the critic
   will flag `multi_floor_egress`.
8. **Stay within the DSL.** Door swing direction, materials, furniture,
   sub‑0.1 unit dimensions are out of scope.

---

## 13. Cross‑references

| Topic                                  | Where                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| DSL grammar (Langium)                  | [`floorplan-language/src/diagrams/floorplans/floorplans.langium`](../floorplan-language/src/diagrams/floorplans/floorplans.langium) |
| MCP tools (`render`, `validate`, `modify`) | [`floorplan-mcp-server/src/tools/`](../floorplan-mcp-server/src/tools/)                                            |
| Renderer entry points                  | [`floorplan-language/src/diagrams/floorplans/renderer.ts`](../floorplan-language/src/diagrams/floorplans/renderer.ts) |
| Web editor / viewer                    | [`floorplan-editor/`](../floorplan-editor/), [`floorplan-viewer/`](../floorplan-viewer/)                            |
| Repo‑level package context             | [`docs/context/language.md`](context/language.md), [`docs/context/mcp-server.md`](context/mcp-server.md), [`docs/context/viewer-core.md`](context/viewer-core.md) |
