# Reverse-Engineering Floor Plans from Images and PDFs

How the agent should turn a scanned or rendered floorplan (PDF, PNG,
JPG, screenshot) into an equivalent `.floorplan` DSL. Vision work is
inherently lossy; the goal is to extract enough structure that
running the bundled scripts produces a layout that visually matches
the source.

This reference is the protocol that
[`scripts/ingest_source.py`](../scripts/ingest_source.py) and any
vision-capable subagent should follow.

## Overall workflow

```
source file -> ingest -> vision pass -> structured brief -> DSL skeleton -> render -> compare -> iterate
```

1. **Ingest.** Run `python3 scripts/ingest_source.py --source X
   --out-dir Y` to normalize PDFs and images into per-page PNGs.
2. **Vision pass.** Hand the PNGs to a vision-capable model. The
   model emits a structured `program_brief.json` describing rooms,
   adjacencies, and inferred dimensions.
3. **DSL skeleton.** Run `node scripts/program_to_skeleton.mjs --brief
   Y/brief.json --out Z.floorplan`.
4. **Render.** Run `node scripts/render.mjs Z.floorplan --out
   Z.png`.
5. **Compare.** Run `python3 scripts/compare_visual.py --a
   source.png --b Z.png`. If similarity is below the threshold (~0.7
   for hand-drawn sources, ~0.9 for clean exports), iterate by
   adjusting the brief and regenerating.

## Ingest step (mechanical)

The `ingest_source.py` script:

- Accepts `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.tiff`, `.bmp`.
- Rasterizes PDFs at 200 DPI by default (`--dpi 300` for fine line
  work).
- Caps the longest dimension at 1400 px by default
  (`--max-dim 1800` for high-fidelity sources).
- Writes one PNG per source page into `--out-dir`.
- Emits a JSON envelope describing each output page.

The vision pass should consume the output PNGs, **not** the raw
source. This guarantees consistent DPI and color profile.

## Vision pass protocol

When delegating to a vision model, use this prompt skeleton:

```
You are reading an architectural floor plan. Identify every room and
emit a JSON document conforming to the schema at:
.cursor/skills/mermaid-floorplan/assets/program_brief.schema.json

Rules:
- Each room must have:
    name (PascalCase identifier),
    kind (one of: bedroom, master, bath, wc, kitchen, living, dining,
                 foyer, hall, corridor, office, study, closet,
                 laundry, garage, balcony, patio, retail, office_open,
                 stair, lift, other),
    label (the human-readable label as shown on the plan),
    size_sqft (best estimate; use null when unknown),
    confidence (number 0.0-1.0 for the inferred values).
- Identify connections between rooms (door, double-door, opening) when
  visible.
- Identify exterior walls (window vs solid) when visible.
- Identify floor levels when visible (basement, ground, first, etc.)
  and emit one entry per floor.
- Note any scale bar or dimensions present in a `scale` field. If no
  scale is present, set scale_confidence to 0 and document the
  assumed default in `notes`.
- Emit at most one program_brief per source page. Combine pages only
  when they clearly depict the same building.
```

Output validation:

- `confidence` < 0.5 on a room → mark for the agent to ask the user
  to confirm.
- `scale_confidence` < 0.3 → assume 1 grid unit = 1 ft and document
  the assumption.
- Missing `kind` → default to `other`; the design critic will warn.

## Choosing a vision model

For Cursor-hosted agents, the available subagent that supports image
input is `browser-use`. For floor-plan vision specifically, prefer
launching a model with high spatial reasoning. Concretely:

| Source quality       | Recommended model                                   |
| -------------------- | --------------------------------------------------- |
| Clean PDF export     | Default vision model, single pass                   |
| Photo of paper plan  | High-fidelity vision model, two passes (zoom + overview) |
| Hand-drawn sketch    | High-fidelity vision model, multiple passes per zone     |
| Multi-floor blueprint| One pass per floor                                  |

If the user asks for "the best vision model available", default to
Gemini 5.1 Pro (or the closest equivalent) for spatial reasoning.

## Scale handling

The DSL has no native scale concept beyond `default_unit`. The agent
should:

1. Look for a scale bar or printed dimensions in the source.
2. If found, compute pixels-per-foot and convert all measured rooms.
3. If not found, ask the user for the total floor area or one
   reference room's dimensions.
4. If still ambiguous, assume 1 grid unit = 1 foot, set
   `scale_confidence: 0.2` in the brief, and document the assumption
   in the comment header of the generated `.floorplan`.

## Confidence-driven escalation

The brief schema requires a per-room `confidence` field. Use it to
gate the workflow:

- All rooms `confidence` ≥ 0.8 → proceed to skeleton without asking.
- Any room `confidence` < 0.8 → ask the user to confirm those rooms
  before generating the skeleton.
- Any `confidence` < 0.4 → mark as `kind: other` and label the room
  with the inferred name in quotes; the design critic will surface a
  warning.
- Overall scale confidence < 0.5 → display assumption to the user
  before rendering.

## Iteration loop

After the first render, run `compare_visual.py`:

- Similarity ≥ 0.95 → done.
- Similarity 0.7-0.95 → review the diff PNG, identify rooms whose
  position or size diverges most, and:
  - For position errors: edit the `.floorplan` to update the room's
    `at (x, y)` clause.
  - For size errors: edit the room's `size (W x H)` clause.
  - For missing rooms: add them via `scripts/modify.mjs add_room`.
  - Re-render and re-compare.
- Similarity < 0.7 → the vision pass likely missed structural
  features. Restart from the vision step, possibly with a
  zoom-on-region pass for the zones that diverge most.

## Mandatory post-recovery checks (added iteration-3)

Vision-extracted DSL is notorious for missing the things a human draws
implicitly. Before returning the recovered file, **always** run:

```bash
node scripts/validate.mjs recovered.floorplan
node scripts/design_critic.mjs recovered.floorplan
```

Fix every `error`-severity finding before continuing. The two
recurring offenders are:

1. **`entry_from_outside`** — the source diagram shows a door symbol on
   the perimeter, but the recovered DSL forgot the
   `connect <Entry>.<wall> to outside door at 50%` statement. Always
   add at least one such connection on the ground floor.
2. **`reachability`** — a room shows up in the layout but has no door
   or open wall to its neighbours. Add an explicit `connect` statement
   instead of relying on visual proximity.

These both cost the recovered plan a structural integrity check that no
amount of rendering similarity can compensate for.

## Round-trip validation

Smoke test: a render that's already in DSL form should round-trip to
itself.

```bash
node scripts/render.mjs templates/two-br.floorplan --out /tmp/src.png
python3 scripts/ingest_source.py --source /tmp/src.png --out-dir /tmp/ing
python3 scripts/compare_visual.py --a /tmp/src.png --b /tmp/ing/page_1.png
```

If the round-trip similarity is < 1.0 on identical inputs, something
is wrong with the ingest pipeline (resize, color profile, etc.).

## Failure modes

- **Bad scale.** The whole layout is right but every room is too big
  or too small. Ask the user for one reference dimension.
- **Misclassified rooms.** A study labeled as a bedroom changes the
  critic's verdict. Re-run with `--label-overrides` once that flag is
  added (or edit the `.floorplan` manually).
- **Missed open-plan walls.** Living + kitchen come back as separate
  rooms when they're actually one open volume. Manually edit the
  walls between them to `open` and re-run the critic.
- **Stair with no riser count.** The vision pass cannot determine
  riser height; assume 7.75 in residential / 7 in commercial.

## When to give up

Decline the request and explain to the user when:

- The source is rotated or distorted beyond the model's ability to
  parse.
- The source contains predominantly non-floor-plan content (a site
  plan, a perspective rendering, an MEP overlay) and the DSL cannot
  represent the dominant features.
- The source's scale is unrecoverable and the user cannot provide a
  reference.

In these cases, surface what was extracted, mark it as advisory, and
ask the user to provide a clearer source or to author the
`.floorplan` directly with this skill's text-driven workflow instead.
