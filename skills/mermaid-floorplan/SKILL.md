---
name: mermaid-floorplan
description: Author, refine, reverse-engineer, and critique floor plans written in the mermaid-floorplan DSL. Use this skill when the user wants to create a .floorplan from a textual brief ("design a 2BR apartment with..."), modify an existing .floorplan through natural-language edits ("make the master bigger", "add a home office"), convert a floorplan image or PDF into equivalent DSL, render a plan to SVG/PNG, generate layout variations, or get actionable design critique. Do NOT use this skill for Mermaid flowcharts/sequence diagrams or for 3D building modelling — only for 2D architectural floor plans in the mermaid-floorplan DSL.
---

# mermaid-floorplan

This skill turns the agent into a competent assistant for the
`mermaid-floorplan` DSL: creating, modifying, critiquing, and
reverse-engineering 2D architectural floor plans that render to SVG/PNG.

The skill is built around **bundled scripts** in
`skills/mermaid-floorplan/scripts/` that wrap the public
`floorplan-language` parser/renderer plus the MCP server's AST editor and
spatial utilities. The scripts run standalone via `node` and `python3`; the
skill does **not** require a running MCP server.

> **Path reminder:** All script commands in this skill must be prefixed with
> `skills/mermaid-floorplan/scripts/` (e.g.
> `node skills/mermaid-floorplan/scripts/validate.mjs plan.floorplan`).

## When to use this skill

Trigger on any of the following cues:

- A user asks to design, create, sketch, or lay out a room/apartment/office/
  house/suite/shop, and mentions "floorplan", "floor plan", ".floorplan",
  "mermaid-floorplan", or attaches a `.floorplan` file.
- A user shares a floor plan image (PNG, JPG, screenshot) or PDF and asks
  for the equivalent DSL, or for edits based on the image.
- A user asks to modify, resize, rename, move, add, or remove rooms in an
  existing `.floorplan` via natural language.
- A user asks for multiple layout options, critique, or accessibility review
  of a plan.

Do **not** use this skill for Mermaid flowcharts/sequence diagrams, 3D
architectural modelling, or CAD interchange beyond what the DSL natively
supports (DXF export is handled by the renderer, not by this skill).

## Four core workflows

### Workflow A — Create a floor plan from a textual brief

1. If the request is vague ("design a nice studio"), ask **one** clarifying
   question about the hard constraints (target square footage, must-have
   rooms, orientation). Do not over-ask.
2. Write the brief to a JSON file matching
   [`scripts/program_brief.schema.json`](scripts/program_brief.schema.json).
3. Generate a skeleton DSL:
   `node scripts/program_to_skeleton.mjs --brief brief.json --out plan.floorplan`.
   For a multi-story brief (townhouse, two-story house, small office),
   add `--floors 2` (or `--floors 3`) to auto-stack a stair core on
   every floor and emit the required `vertical` link. See
   [`references/multi-floor.md`](references/multi-floor.md).
4. Validate + render: `node scripts/validate.mjs plan.floorplan` then
   `node scripts/render.mjs plan.floorplan --out plan.png --show-area --show-dimensions`.
   For multi-story plans, also render the axonometric 3D view:
   `node scripts/render_3d.mjs plan.floorplan --out plan-3d.png` so the
   loop can self-check stacking, cantilevers, and stair runs.
5. Run the design critic:
   `node scripts/design_critic.mjs plan.floorplan`. If findings appear, feed
   them into `node scripts/suggest_improvements.mjs plan.floorplan
   --critique critique.json`, apply the suggested operations with
   `modify.mjs`, and re-render.
6. For non-trivial briefs, also run
   `node scripts/generate_variations.mjs --brief brief.json --count 3 --out
   variations/` so the user can choose between a linear, an L-shaped, and a
   central-corridor layout before you settle on one.
7. Present the rendered PNG(s) to the user with a one-paragraph rationale.

### Workflow B — Modify an existing floor plan

1. Read the current DSL. Run `node scripts/analyze.mjs plan.floorplan` to
   get the room list, adjacency graph, and computed areas.
2. Translate the user's ask into one or more operations from the
   `modify.mjs` operation set (`add_room`, `remove_room`, `resize_room`,
   `move_room`, `rename_room`, `update_walls`, `add_label`,
   `convert_to_relative`).
3. Apply: `node skills/mermaid-floorplan/scripts/modify.mjs plan.floorplan --ops ops.json --out
   plan.floorplan` (writes in place unless `--out` differs).
4. **Fallback:** If `modify.mjs` fails (e.g. missing MCP server build
   artifacts), fall back to hand-editing the `.floorplan` file directly.
   The DSL is human-readable; prefer surgical `apply_diff` edits over
   full rewrites so the AST structure stays clean.
5. Re-validate, re-render, re-critique.

### Workflow C — Reverse-engineer from an image or PDF

1. Rasterize the source:
   `python3 scripts/ingest_source.py <source> --out frames/ --dpi 300`.
   For PDFs this delegates to the sibling `pdf` skill's converter; for
   images it normalizes and optionally upsamples.
2. Apply vision to each page image. Produce a program brief matching
   [`scripts/program_brief.schema.json`](scripts/program_brief.schema.json),
   filling in `confidence` per field (scale, dimensions, door positions,
   room names). See [`references/image-extraction.md`](references/image-extraction.md)
   for the extraction protocol, confidence-driven escalation, and recovery
   paths when the diagram is degraded.
3. Generate DSL from the rich brief:
   `node scripts/program_to_skeleton.mjs --brief brief.json --out
   reconstructed.floorplan`.
4. Render and compare:
   `node scripts/compare_visual.mjs --source frames/page_1.png
   --reconstructed reconstructed.png --out diff.png`. The script emits a
   SSIM score; aim for ≥ 0.70 on a clean digital source, ≥ 0.55 on a scan.
5. If SSIM is low or the brief had low-confidence fields, rerun ingest with
   higher `--dpi`, refine the brief, and iterate.

### Workflow D — Interactive natural-language refinement

Use this when the user iterates on a plan through conversational edits
("make the bathroom bigger", "move the kitchen to the south wall", "swap
bedrooms 1 and 2"). Each turn:

1. Run `analyze.mjs` to ground yourself in the current AST (room names, IDs,
   sizes, adjacencies).
2. Translate the natural-language ask into the smallest set of
   `modify.mjs` operations. Prefer `resize_room` / `move_room` /
   `update_walls` / `convert_to_relative` over manual string edits.
3. Apply, re-validate, re-render.
4. Run `design_critic.mjs` after any structurally significant change. Fold
   its findings into the next turn only if they block the user's goal.

## Key design principles

- **Exact inputs win.** When the user specifies a size, keep it verbatim;
  do not round or "optimize" it without asking.
- **Scripts own the rules.** The agent's job is to translate intent into
  scripts calls, not to do arithmetic or AST rewrites by hand.
- **Validate before rendering.** `validate.mjs` is cheap; a failed render
  wastes turns.
- **Prefer relative positioning** for new rooms once an anchor exists. It
  survives resizing better than absolute coordinates.
- **Always emit a `config` block.** Every generated `.floorplan` should
  start with `config { default_unit: ft, area_unit: sqft }` (or your
  user's preferred units). Without it, dimension labels render as
  `<value>undefined`. `render.mjs` defaults to `ft`/`sqft` when missing,
  but it also emits the `config_missing_default_unit` warning — heed it.
- **Surface preferences before generating.** Two architectural choices
  vary by user/region and should be confirmed up front:
  1. **Wet walls** — should kitchen and bath share a plumbing wall, or
     stay apart? Both are valid. The critic flags missing shared wet
     walls only as `info`.
  2. **Hallways vs. open plan** — for ≤1000 sqft / ≤2BR plans, prefer
     an open-plan public zone over a backbone hallway. The critic flags
     hallways that bridge ≤2 rooms via `corridor_only_hallway`.
- **Bathroom placement matters.** New rules: `bathroom_off_entry` warns
  if a bath opens onto a foyer/lobby/outside; `bedroom_bath_adjacency`
  now requires every bedroom (not just the master) to be within 2 hops
  of a bath.
- **Multi-story plans need a `vertical` link.** Whenever the brief
  has more than one `floor` block, declare the stair (and lift, if any)
  on each floor with the same `(x, y)` and width, then add a
  `vertical FloorA.MainStair to FloorB.MainStair` line. The critic
  rules `footprint_aligned`, `stair_vertical_aligned`, and
  `multi_floor_egress` enforce this and will flag cantilevers,
  unaligned shafts, and unreachable upper floors. Every per-floor rule
  (bath privacy, windowless bedrooms, reachability) now also runs on
  upper floors, so don't assume issues only matter on the ground floor.
- **Stair placement is geometric, not just adjacency.** A stair has a
  real 2D footprint (`runLength = ceil(rise / riser) × tread`) and
  needs a clear landing on both ends (3 ft residential, 4 ft when
  `config.stair_code` is `commercial` or `ada`). Five critic rules
  enforce this: `stair_through_walls` (footprint must sit inside
  exactly one room — and it suggests a U-shaped or spiral fallback when
  the room is too small for a straight run), `stair_landing_clearance`
  (entry/exit landings must meet code), `stair_door_collision` (doors
  on stair-bearing walls must not project onto the tread strip),
  `stair_room_access` (the containing room must have a usable door to
  another room on the same floor), and `stair_landing_egress` (a
  *straight* stair core splits into two disconnected landing strips,
  so each strip required by the stair's role on a floor — origin,
  intermediate, terminus — needs its own connection; the auto-emitted
  fix is an `opening` for residential cores and a `door` for
  commercial / ADA). For a typical 10 ft floor with 7"/11" residential
  treads the stair core needs **6 ft × ~23 ft** (16.5 ft run + 2 ×
  3 ft landings); `program_to_skeleton.mjs` uses these defaults and
  emits both landing connections on intermediate floors. See
  [`references/multi-floor.md`](references/multi-floor.md) →
  "Stair footprint and landings" for the worked example.
- **Stay within the DSL.** Door widths, materials, furniture, and
  dimensions below 0.1 units are out of scope. See
  [`references/dsl-grammar.md`](references/dsl-grammar.md) for limits.
- **Wall types and adjacency.** The DSL supports `solid`, `open`, and
  `window` wall types. Use `open` for passages, car-park boundaries, and
  any wall that should not render as a physical barrier. Use `solid` for
  structural walls. Use `window` for exterior glazing. When a room abuts
  parking or an outdoor zone, mark the shared wall `open` on the room
  side and `open` on the parking side so the renderer omits the divider.
- **Interstitial spaces.** If a source image shows a corridor, lobby, or
  open passage between two rooms (e.g. between a living room and a
  parking area), model it as an explicit `room` with `open` walls rather
  than leaving a gap. The DSL does not support negative space; every
  reachable area must be a named room.

## Scripts (all in `scripts/`)

| Script | Purpose |
| --- | --- |
| `render.mjs` | DSL → SVG + PNG via `@resvg/resvg-js` (single floor at a time) |
| `render_3d.mjs` | DSL → axonometric (iso/cabinet) SVG + PNG for 3D feedback in the agent loop, no browser required |
| `validate.mjs` | Parse + semantic validation (mirrors MCP `validate_floorplan`) |
| `analyze.mjs` | Room list, adjacency graph, areas, resolved positions |
| `modify.mjs` | Apply a JSON array of AST-based edit operations |
| `program_to_skeleton.mjs` | Brief → starter DSL (simple counts or rich schema) |
| `design_critic.mjs` | Heuristic design review (`--strict` promotes warnings to errors) |
| `suggest_improvements.mjs` | Map critic findings to concrete `modify.mjs` ops |
| `generate_variations.mjs` | Produce N candidate layouts from one brief |
| `ingest_source.py` | Rasterize PDFs/images into normalized PNGs for vision |
| `compare_visual.mjs` | SSIM + side-by-side diff between two renders |
| `mcp_parity_check.mjs` | Diff bundled-script outputs against the MCP server |

All scripts share the JSON envelope and exit-code contract documented in
[`scripts/README.md`](scripts/README.md).

## References

Read these on demand; do not front-load the whole directory.

- [`references/dsl-grammar.md`](references/dsl-grammar.md) — DSL surface,
  wall types, positioning modes, connections, sub-rooms, frontmatter.
- [`references/design-heuristics.md`](references/design-heuristics.md) —
  sensible defaults for room sizes, adjacency, plumbing, light.
- [`references/patterns-library.md`](references/patterns-library.md) —
  recurring layout patterns (central corridor, linear, L-shape, loft).
- [`references/accessibility.md`](references/accessibility.md) — corridor
  widths, turning radii, ramp slopes, within DSL limits.
- [`references/multi-floor.md`](references/multi-floor.md) — stair/lift
  conventions, plumbing stacks, egress paths, floor-to-floor height.
- [`references/image-extraction.md`](references/image-extraction.md) —
  vision protocol, confidence fields, recovery paths.
- [`references/troubleshooting.md`](references/troubleshooting.md) — common
  parser errors → fixes; "render doesn't match source image" playbook.

## Templates

Starters live in `assets/templates/`. Two flavours per program type: a
polished version meant as a seed, and a `-rough` variant intentionally
seeded with common LLM mistakes (privacy violations, non-stacking shafts,
wet walls split apart, etc.) for use as "before" states in
critique/refine demos.

| Polished | Rough variant | Notes |
| --- | --- | --- |
| `two-br.floorplan` (hero) | — | 2BR apartment ~1000 sqft (canonical, central hall) |
| `studio.floorplan` | `studio-rough.floorplan` | ~450 sqft single-room studio (compact wet-wall) |
| `studio-openplan.floorplan` | — | ~450 sqft studio with open-plan public zone, no shared kitchen-bath wall, bath off the bedroom side (counter-example to `studio.floorplan`) |
| `one-br.floorplan` | `one-br-rough.floorplan` | ~720 sqft 1BR |
| `three-br-house.floorplan` | `three-br-house-rough.floorplan` | ~1800 sqft house |
| `hotel-suite.floorplan` | `hotel-suite-rough.floorplan` | ~520 sqft single-key suite |
| `retail-shop.floorplan` | `retail-shop-rough.floorplan` | ~1100 sqft retail w/ BOH |
| `multi-floor-office.floorplan` | `multi-floor-office-rough.floorplan` | 2-floor ~3200 sqft office |
| `townhouse-two-story.floorplan` | `townhouse-two-story-rough.floorplan` | 2-floor 3BR/2.5BA ~1800 sqft townhouse with stair-core stacking and a `vertical` link (rough variant has a cantilever, missing vertical, windowless bedroom) |

Pre-rendered PNG and SVG previews of every template live in
`assets/templates/renders/`.

When picking a seed, prefer the polished version. Use a rough variant
when you want to demonstrate the critic / suggest_improvements flow or
practice fixing a flawed plan.

## Worked examples

The four examples below are end-to-end walkthroughs covering one of the
four workflows each. They are written in tutor style: every command is
shown with the JSON envelope you should expect back, and each example
calls out the recovery branches when an intermediate step fails.

You can verify the canonical DSL examples in
[`mermaid-floorplan/examples/`](#) — `RelativePositioning.floorplan` and
`StyledApartment.floorplan` are particularly useful references.

### Example 1 — Workflow A: build a 2BR apartment from a textual brief

> User: "Design a 2BR apartment, around 1000 sqft, must include a small
> in-unit laundry. Master should have an ensuite."

1. Quick brief sanity check: ask one clarifying question only if needed.
   Here the brief specifies count, area, and a must-have feature, so move on.
2. Author `brief.json` matching `scripts/program_brief.schema.json`.
   Each room is `{ name, kind, size?, walls?, ... }`; `name` is the DSL
   identifier, `kind` is the semantic role (one of `entry`, `living`,
   `kitchen`, `bedroom`, `bathroom`, `laundry`, ...).
   ```json
   {
     "title": "TwoBR",
     "unit": "ft",
     "areaUnit": "sqft",
     "targetArea": { "value": 1000 },
     "constraints": { "mustShareWetWalls": true,
                      "requireWindowInEveryBedroom": true },
     "rooms": [
       { "name": "Foyer",      "kind": "entry"    },
       { "name": "Living",     "kind": "living"   },
       { "name": "Kitchen",    "kind": "kitchen"  },
       { "name": "Bedroom2",   "kind": "bedroom",
                                "label": "Bedroom 2" },
       { "name": "Master",     "kind": "bedroom",
                                "label": "Master" },
       { "name": "HallBath",   "kind": "bathroom",
                                "label": "Hall Bath" },
       { "name": "Ensuite",    "kind": "bathroom" },
       { "name": "Laundry",    "kind": "laundry"  }
     ]
   }
   ```
3. Generate the skeleton:
   ```bash
   node scripts/program_to_skeleton.mjs --brief brief.json --out plan.floorplan
   ```
   Expect `{ success: true, data: { rooms: 8, ... } }`. If the script reports
   "no anchor room found", add `"anchor": "Foyer"` to the brief.
4. Validate immediately. A typical clean output:
   ```json
   { "success": true, "data": { "valid": true, "floors": 1, "rooms": 8 },
     "warnings": [], "errors": [] }
   ```
   If validation fails with `Overlapping connections at position X% on wall`,
   stagger the `at <n>%` percentages of the conflicting `connect` statements
   (a 30/70 split usually works).
5. Render to confirm geometry: `node scripts/render.mjs plan.floorplan
   --out plan.png --show-area --show-dimensions`. Inspect the PNG.
6. Run the critic. Suppose it returns:
   ```json
   { "data": { "findings": [
     { "rule": "wet_walls", "severity": "warning",
       "message": "Wet rooms (kitchen/bath/laundry) do not share any walls" },
     { "rule": "bathroom_privacy", "severity": "warning",
       "message": "Bathroom \"HallBath\" opens directly into a public room \"Living\"" }
   ] } }
   ```
   Pipe into `suggest_improvements.mjs`, which proposes either
   `update_walls` ops to stack wet rooms, or advisory notes when the brief
   leaves no room. Apply only the ops the user agrees with via
   `modify.mjs`, re-validate, re-render.
7. Generate alternative layouts so the user can compare:
   `node scripts/generate_variations.mjs --brief brief.json --strategies linear,l-shape,central-corridor --out-dir variations/ --name-pattern "v{n}" --render`.
   The `--name-pattern` flag accepts `{n}` (1-indexed) and `{strategy}`
   placeholders; `--render` produces a `.png` next to every `.floorplan`.
8. Present the chosen render plus a one-paragraph rationale (e.g.,
   "Kitchen and Hall Bath share a wet wall on the back; Master Ensuite
   stacks above for a tight plumbing run").

Tutor note: never silently re-jig sizes the user gave you. If a constraint
makes the brief infeasible (e.g., 1000 sqft + 4 bedrooms), surface that
to the user before generating.

### Example 2 — Workflow B: modify an existing plan

> User: "Open up the bedroom 2 / hall bath area to make a bigger primary
> suite. Steal a few feet from Bedroom 2."

1. Read the existing `plan.floorplan`.
2. Ground yourself with `node scripts/analyze.mjs plan.floorplan`. The
   relevant slice of the response:
   ```json
   { "data": {
       "rooms": [
         { "id": "Bedroom2", "size": [12,12], "position": [0,16], "kind": "bedroom" },
         { "id": "HallBath", "size": [8,12],  "position": [12,16], "kind": "bathroom" },
         { "id": "Master",   "size": [12,12], "position": [20,16], "kind": "bedroom" }
       ],
       "adjacency": [["Bedroom2","HallBath"], ["HallBath","Master"]]
   } }
   ```
3. Translate the ask into ops. The op schema is
   `{ action, target, params }` (the same shape the MCP server's
   `modify_floorplan` tool uses):
   ```json
   [
     { "action": "resize_room", "target": "Bedroom2",
       "params": { "width": 10, "height": 12 } },
     { "action": "resize_room", "target": "HallBath",
       "params": { "width": 6,  "height": 12 } },
     { "action": "resize_room", "target": "Master",
       "params": { "width": 16, "height": 12 } }
   ]
   ```
   Save as `ops.json`.
4. Apply: `node scripts/modify.mjs plan.floorplan --ops ops.json --out plan.floorplan`.
5. Re-run validate → render → critic. If the critic now reports
   `master_walk_through` (Master only reachable via Bedroom 2), add an
   `update_walls` op or insert a corridor segment via `add_room` and
   re-apply.

Tutor note: prefer chained small ops over a single hand-edited DSL paste.
The agent's edits should always go through `modify.mjs` so the AST is
re-emitted in canonical form.

### Example 3 — Workflow C: reverse-engineer from a sketch or PDF

> User uploads `sketch.pdf` (a phone photo of a hand-drawn 1BR studio
> apartment) and asks "turn this into a .floorplan".

1. Rasterize:
   ```bash
   python3 scripts/ingest_source.py sketch.pdf --out frames/ --dpi 300
   ```
   Expect `{ success: true, data: { pages: [{ path: "frames/page_1.png", ...}] } }`.
   If `ingest_source.py` reports "could not import pdf2image", confirm
   the skill's `.venv` is active (the bootstrap in `_lib.py` should pick
   it up automatically).
2. Send `frames/page_1.png` to a vision-capable model. Use the protocol
   in [`references/image-extraction.md`](references/image-extraction.md);
   it specifies what to extract per pass (room boundaries → labels →
   doors → windows → dimensions) and requires you to fill `confidence`
   on every numeric field of the brief.
3. Save the result as `brief.json`. Sample (truncated):
   ```json
   {
     "title": "ReverseEngineered",
     "unit": "ft",
     "areaUnit": "sqft",
     "targetArea": { "value": 720 },
     "rooms": [
       { "name": "Foyer",   "kind": "entry",
         "size": { "width": 6,  "height": 8,  "confidence": 0.7 } },
       { "name": "Living",  "kind": "living",
         "size": { "width": 16, "height": 12, "confidence": 0.8 } },
       { "name": "Kitchen", "kind": "kitchen",
         "size": { "width": 10, "height": 8,  "confidence": 0.7 } },
       { "name": "Bedroom", "kind": "bedroom",
         "size": { "width": 12, "height": 12, "confidence": 0.8 } },
       { "name": "Bath",    "kind": "bathroom",
         "size": { "width": 6,  "height": 8,  "confidence": 0.6 } }
     ],
     "source": { "kind": "image", "path": "frames/page_1.png",
                 "extractor": "vision-pass-v1" }
   }
   ```
4. Generate the DSL: `node scripts/program_to_skeleton.mjs --brief brief.json
   --out reconstructed.floorplan`.
5. Render and compare:
   ```bash
   node scripts/render.mjs reconstructed.floorplan --out reconstructed.png
   python3 scripts/compare_visual.py --a frames/page_1.png \
       --b reconstructed.png --out diff.png
   ```
   You will get back something like
   `{ "data": { "similarity": 0.62, "diffPixels": 42813, ... } }`. Aim for
   ≥ 0.55 for sketches; ≥ 0.70 for digital plans.
6. If the score is low or any field's `confidence` is < 0.5, rerun
   ingest with a higher `--dpi`, ask the user to confirm the dimensions
   you inferred, and refine.

Tutor note: do not hallucinate dimensions to pad the brief — leave the
field absent and lower the confidence on the parent room. Variations
generated by `generate_variations.mjs` are also a useful disambiguation
tool when a sketch is ambiguous.

### Example 4 — Workflow D: iterative natural-language refinement

> User has the rendered `plan.floorplan` from Example 1 open and types:
> 1. "Move the laundry next to the kitchen so it shares plumbing."
> 2. "Wait, swap Bedroom 2 and Master so the master is on the quiet side."
> 3. "Add a closet inside the master."

For each turn, the loop is the same — analyze → translate → modify →
validate → render → critic.

Turn 1:
- `analyze.mjs` reports laundry is currently next to the bath, not the
  kitchen.
- Op (uses absolute coordinates because `move_room` takes `x`/`y`):
  ```json
  [{ "action": "move_room", "target": "Laundry",
     "params": { "x": 24, "y": 0 } }]
  ```
  (24, 0 is the `(x,y)` calculated to sit immediately right of the
  Kitchen given its current position. The agent reads those values out
  of `analyze.mjs` and does the arithmetic — never asks the user.)
- After `modify.mjs`, the critic's `wet_walls` warning from Example 1
  should clear.

Turn 2:
- `analyze.mjs` confirms current layout. Two `move_room` operations swap
  positions. (If both rooms originally relied on `RelativePosition`
  clauses, you may also need a follow-up `convert_to_relative` op so the
  rest of the file stays clean.)
  ```json
  [
    { "action": "move_room", "target": "Bedroom2",
      "params": { "x": 20, "y": 16 } },
    { "action": "move_room", "target": "Master",
      "params": { "x": 0,  "y": 16 } }
  ]
  ```
- Re-run critic; check that the ensuite still abuts Master.

Turn 3:
- A new closet inside Master is a sibling top-level room, positioned
  with a `RelativePosition` clause so it follows the Master:
  ```json
  [{ "action": "add_room",
     "params": {
       "name": "MasterCloset",
       "kind": "closet",
       "label": "Walk-In Closet",
       "size": { "width": 4, "height": 8 },
       "relativeTo": { "direction": "right-of",
                       "reference": "Master",
                       "alignment": "top" }
     } }]
  ```
- Re-validate; the critic may now flag `bedroom_window` if the closet
  blocks the only window wall on Master. Fold that into the next turn or
  warn the user.

Tutor note: keep each turn's diff small. If a single utterance triggers
more than 3 ops, pause and confirm the bigger picture with the user
before applying.
