# Troubleshooting

Quick reference of failure signatures, root causes, and the exact
script to run to fix or diagnose them.

Every script in this skill emits a JSON envelope with a top-level
`success` flag. When `success` is `false`, look at `errors[].type`
and the `data` payload — the rows below match against those.

## Parser / validation errors

### `parse: Expecting token of type 'floorplan' but found ...`

The DSL is missing the top-level `floorplan` keyword. Common when the
agent forgot the keyword or wrote `floorplan { ... }` (which is also
wrong — there are no braces around the top-level body).

Fix: ensure the file looks like

```text
%%{version: 1.0}%%
floorplan
  config { ... }
  floor GroundFloor { ... }
  ...
```

### `connection: Connection from "X.right" to "Y.left" specifies non-adjacent walls`

A `connect` statement points at walls that are not actually touching.
Either the rooms are not adjacent at all, or you have the wall sides
swapped.

Run `node scripts/analyze.mjs <file>` and inspect the `adjacency`
list. Use the reported `sharedWall` value to pick the correct wall
sides for the `connect`.

### `missing_reference: Room "X" referenced from "Y" is not defined`

A `RelativePosition` clause points at a room that doesn't exist on
the same floor (room IDs are case-sensitive).

Fix: confirm the reference room is declared earlier in the same
`floor` block, with the exact ID.

### `circular_dependency: Room "A" depends on "B" which depends on "A"`

Two rooms reference each other in their `RelativePosition` clauses.
Pick one to use absolute `at (x, y)` and let the other depend on it.

### `no_position: Room "X" has neither absolute nor relative position`

Every room needs at least one of `at (x, y)` or a `RelativePosition`
clause.

### `undefined_variable: Variable "X" is not defined`

A `define` referenced via `size <Name>` was never declared. Either
add the `define` block at the top of the file or replace the
reference with an inline dimension.

### `duplicate_definition: Room "X" defined multiple times`

A room ID appears more than once on the same floor. Rename one or
remove the duplicate.

### `connection: Overlapping connections at position N% on wall`

Two `connect` statements target the same wall at the same percentage.
Stagger the percentages (e.g. 30 and 70) or split the rooms apart.

### `connection: Connection from "X.right" to "Y.left" connects walls that don't share a boundary`

The two walls are not actually adjacent because the rooms' positions
do not align. Run `analyze.mjs` to inspect each room's resolved
`position` and `size`. Fix the position or pick the correct wall sides.

### `parse: Expecting: one of ... [door] [double-door] [opening] but found 'window'`

`window` is **not** a valid `connect` type. Connections are
`door`, `double-door`, or `opening` only. Windows are declared at the
wall level (`walls [right: window]`).

## Cross-floor / multi-room name conflicts

### `connection: Overlapping connections at position N% on wall` across floors

Same room ID appears on both floors and `connect` statements lose the
floor context. Rename the rooms so each floor has unique IDs (e.g.
`StairCore` on Ground and `UpperCore` on Upper). Stair / lift IDs may
remain the same across floors if a `vertical` declaration links them.

## Rendering errors

### `render: Failed to load resvg`

`@resvg/resvg-js` failed to load. This package is in
`node_modules` of the monorepo root. Run scripts from the monorepo
root, not from `.cursor/skills/mermaid-floorplan/scripts/`.

Recovery:

```bash
cd <monorepo-root>
node .cursor/skills/mermaid-floorplan/scripts/render.mjs <file>
```

### `runtime: Cannot find module '@resvg/resvg-js'`

Same as above — Node could not resolve the module. Check the working
directory.

### Output PNG is blank / white

Either the floorplan has zero rooms, or every room is positioned at
identical coordinates. Run `node scripts/analyze.mjs <file>` and
confirm `summary.totalRooms > 0` and that each room has distinct
`position`.

### Dimension labels render as `6undefined` / `12undefined`

The DSL is missing a `config` block, so the renderer has no
`default_unit` and concatenates `<value>undefined` in the label.

`render.mjs` will still produce a PNG (it now defaults to `ft`/`sqft`
and emits a `config_missing_default_unit` warning), but you should add
the config block so any other tooling has the unit too:

```text
%%{version: 1.0}%%
floorplan

  config {
    default_unit: ft,
    area_unit: sqft
  }

  floor GroundFloor { ... }
```

If you see this in an old render that was produced before the fix,
re-render with the latest `render.mjs` after adding the config.

### Output PNG looks correct but rooms overlap

A `RelativePosition` chain produced overlapping positions because
the upstream room's size is wider than the alignment expected. Fix
options:

1. Switch to absolute `at (x, y)` for the overlapping room.
2. Add a `gap N` to the `RelativePosition`.
3. Regenerate from a brief using
   `node scripts/program_to_skeleton.mjs --strategy rows`, which uses
   absolute positions throughout.

## Multi-floor 3D rendering issues

These show up when you open a multi-floor plan in the floorplan-viewer
(or run `make export-3d` / `make export-3d-perspective`). They do **not**
manifest in `render.mjs` (2D) or in the bundled `render_3d.mjs`
(axonometric stacker, no CSG), so always confirm in the full Three.js
viewer before chasing them.

### Top-floor stair appears to dead-end into the roof / no exit hole visible

The 3D scene builder cuts a hole through the slab of the floor *above*
each stair and lift, so a stair on the topmost declared `floor` has no
slab to punch through and visually terminates in mid-air.

Fix: declare an explicit roof slab as its own `floor` block whose single
room covers every top-floor stair / lift footprint. Open the perimeter
walls so the deck is unenclosed:

```text
floor Roof {
  room GrandFoyer at (0, 0) size (36 x 25)
       walls [top: open, right: open, bottom: open, left: open]
       label "Grand Foyer Roof"
}
```

The Roof room's `at (x, y)` + `size` must contain the union of all
top-floor stair and lift bounding boxes. The simplest robust choice is
to match the floor below's perimeter. No `height`, no circulation, and
no `vertical` link to the Roof are required — `vertical` only chains
stair/lift elements, and the Roof has none. See
[`multi-floor.md`](./multi-floor.md) → §2b "Roof slab cutouts above
stairs and lifts" for the full pattern, including when to leave the
Roof out (rooftop deliberately out-of-scope).

### Cutouts look right in `make export-3d` but solid in `make viewer-dev`

If the headless render shows holes and the dev viewer doesn't, the
viewer is on a stale build that pre-dates the `initCSG()` wiring in
`BaseViewer.loadFloorplan`. Rebuild the core packages and clear Vite's
module cache:

```bash
npm run --workspace floorplan-3d-core build
npm run --workspace floorplan-viewer-core build
rm -rf node_modules/.vite floorplan-viewer/node_modules/.vite
# restart the viewer dev server
```

If holes are still missing after a clean rebuild, the floor above each
stair / lift is probably not declared (see the previous entry) — the
viewer and the headless renderer share the same scene-build code, so
geometry-level missing cutouts reproduce in both.

## Critic findings

### `corridor_width`: hallway too narrow

Run `node scripts/suggest_improvements.mjs <file> --apply`. The
suggester emits a `resize_room` op that grows the narrow dimension
to 4 ft. For commercial / accessible plans, manually bump to 5 ft.

### `bedroom_size`: bedroom under 64 sqft

Either the brief's bedroom is genuinely tiny (e.g. a kid's bedroom)
or the inference was wrong. Confirm with the user; if intentional,
add a `notes` annotation in the `.floorplan` header and rerun the
critic with `--skip bedroom_size`.

### `windowless_habitable`: a habitable room has no daylight

Find the room's exterior walls in the analyzer's `floors[].rooms[]`
list. Update the wall facing outside from `solid` to `window` via
`node scripts/modify.mjs update_walls --room X --side bottom --type window`.

If no wall faces outside, the room is buried — either move it to the
perimeter or open up an internal wall to a daylit neighbor.

### `entry_from_outside`: no path to outside

Add the missing connection:

```bash
node scripts/modify.mjs <file> '{"action":"add_connection","params":{"from":"Foyer.top","to":"outside","doorType":"door","at":50}}'
```

### `reachability`: a room is unreachable from the entry

Run `node scripts/analyze.mjs <file>` and inspect the `connections`
plus `adjacency` data. Add a `connect` statement linking the
unreachable room to the nearest hallway / public room, or change a
shared wall to `open` if the rooms are meant to be open-plan.

### `bedroom_bath_adjacency`: bedroom has no bathroom on path

Add a `connect` from the relevant hallway to a bathroom, or move the
bedroom adjacent to an existing bath.

### `bathroom_privacy`: bathroom door faces a public room

Change the bathroom's connection to use a hallway side, or rotate
the bathroom by swapping its wall directions.

### `wet_walls`: bathroom and kitchen far apart

Soft warning. Acceptable if the brief calls for a separated
public/private zone. Otherwise, swap the bathroom and a neighboring
private room so the wet walls share a stack with the kitchen.

## `modify.mjs` operation pitfalls

### `rename_room` leaves dangling references

The current AST editor renames the room declaration but does **not**
rewrite references in `RelativePosition` clauses or `connect`
statements. After a `rename_room`, validate immediately and fix any
`missing_reference` / `circular_dependency` errors by hand or with a
text-level find-and-replace. A safer workflow:

1. Run `analyze.mjs` first to list everything that references the
   room.
2. Apply `rename_room`.
3. Either: (a) use `update_walls` / new `connect` statements that use
   the new name; or (b) post-process with a regex replace and re-run
   `validate.mjs`.

### Operation schema

Operations are `{ "action": "<op>", "target": "<RoomId>", "params": { ... } }`.
The `params` keys per `action`:

| action | params |
| --- | --- |
| `add_room` | `{ name, kind?, size: {width,height}, position?, ... }` |
| `remove_room` | (none) |
| `resize_room` | `{ width, height }` |
| `move_room` | `{ x, y }` |
| `rename_room` | `{ newName }` |
| `update_walls` | `{ top?, right?, bottom?, left? }` (each a wall type) |
| `add_label` | `{ label }` |
| `convert_to_relative` | `{ anchorRoom, alignmentTolerance?, targetRooms? }` |

## Round-trip / parity issues

### `compare_visual.py`: similarity unexpectedly < 1.0 on identical inputs

The two PNGs differ in size. Add `--resize auto` (default) so the
script aligns them before comparison. If similarity is still < 1.0,
the input PNGs differ in color profile; re-render both with
`scripts/render.mjs` from the same DSL to confirm.

### `mcp_parity_check.mjs`: validate mismatch

The bundled `validate.mjs` and the MCP server's `validate_floorplan`
report different errors. Either:

- The MCP server is older than the bundled scripts. Rebuild the MCP
  server: `npm run build -w floorplan-mcp-server`.
- The bundled scripts are out of date with the language. Pull latest
  from the floorplan-language package.

### `mcp_parity_check.mjs`: render mismatch (similarity < threshold)

Both surfaces use the same `floorplan-language` `render` function,
so a mismatch points at:

- Different SVG-to-PNG widths. The script uses 900px, MCP defaults
  to 800px. Pass `--width 800` to align them.
- Different `fitTo` modes. Both use `mode: 'width'`; if you've
  customized the bundled renderer, restore it.

### `mcp_parity_check.mjs`: fails with `Could not load MCP server build`

The MCP server hasn't been compiled. From the monorepo root:

```bash
npm run build -w floorplan-mcp-server
```

Then rerun the parity check.

## Vision / ingest issues

### `ingest_source.py`: `Missing Python dependency 'PIL'`

The skill ships a virtualenv at
`.cursor/skills/mermaid-floorplan/.venv` and `_lib.py` auto-rexecs
into it. If you see this error, the venv is missing or broken.
Recreate it:

```bash
python3 -m venv .cursor/skills/mermaid-floorplan/.venv
.cursor/skills/mermaid-floorplan/.venv/bin/pip install -r \
    .cursor/skills/mermaid-floorplan/scripts/requirements.txt
```

### `ingest_source.py`: PDF rasterization fails

`pdf2image` requires a system-level Poppler install. On macOS:

```bash
brew install poppler
```

On Debian/Ubuntu:

```bash
sudo apt-get install poppler-utils
```

### Vision pass returns wrong room kinds

The model misclassified rooms. Two recovery paths:

1. Manually edit the `program_brief.json` to fix room kinds, then
   rerun `program_to_skeleton.mjs`.
2. Drop the brief and write the `.floorplan` directly using the
   pattern library and the source image as visual reference.

## "It's slow" complaints

- `render.mjs` is bottlenecked on resvg. 900px renders should
  complete in ~150 ms; if it's much slower, you may have an
  unusually large floorplan (>50 rooms).
- `design_critic.mjs` runs in O(rooms²) due to adjacency. For plans
  with >50 rooms, consider running a subset via `--floor`.
- `ingest_source.py` PDF rasterization is the slowest stage; it's
  proportional to DPI × pages. Drop DPI from 200 to 150 if you only
  need rough geometry.
