# Accessibility & Universal Design (within DSL limits)

The mermaid-floorplan DSL only encodes coarse spatial relationships
(rooms, walls, doors, openings). It cannot express the full breadth of
a real accessibility code (lever handles, contrast strips, threshold
heights). This reference focuses on what the agent **can** check and
adjust within the DSL, mapped to common code targets so the floorplan
output is at least plausibly accessible.

When the user asks for an "accessible" or "ADA" floorplan, apply the
hard rules below by default. When in doubt, escalate ambiguous design
decisions to the user with the question prompts at the end.

## Out of scope (DSL cannot represent)

The DSL has **no** notion of:

- Door hardware (lever vs knob).
- Threshold heights, ramp slopes, riser heights at thresholds.
- Floor surface friction, contrast strips, tactile indicators.
- Reach ranges for switches, outlets, controls.
- Audio/visual alarms.

Document any such requirement as a brief note in the `.floorplan`
comment header or as advisory output from
`scripts/suggest_improvements.mjs`. Do not invent DSL syntax to
encode it.

## Hard targets the DSL can express

### Corridor and circulation widths

| Target            | Default  | Notes                                                       |
| ----------------- | -------- | ----------------------------------------------------------- |
| Hallway width     | ≥ 36 in  | Minimum residential. Use ≥ 44 in for accessible plans.      |
| Wheelchair pass   | ≥ 32 in  | One-way pinch points at door openings.                      |
| Wheelchair turn   | ≥ 60 in  | Turning radius for a 360° wheelchair turn.                  |
| Two-way passage   | ≥ 60 in  | Two wheelchairs passing in opposite directions.             |

The critic's `corridor_width` rule already checks 36 in (3 ft). For
accessible plans, regenerate with a wider hallway and rerun the
critic.

### Door clear opening widths

The DSL's `connect ... size (W x H)` clause sets the rough opening
width. Use these sizes for the `W` value:

| Target                       | Width  | DSL                              |
| ---------------------------- | ------ | -------------------------------- |
| Standard residential door    | 32 in  | `size (32in x 80in)`             |
| Accessible single-leaf door  | 36 in  | `size (36in x 80in)`             |
| Accessible double-leaf door  | 60 in  | `size (60in x 80in)`             |
| Accessible bath / WC door    | 36 in  | `size (36in x 80in)`             |

When converting feet, remember 3 ft = 36 in. The DSL accepts both
`size (36in x 80in)` and `size (3ft x 7ft)` — use whichever is more
readable for the rest of the file.

### Bathroom maneuvering clearance

Accessible bathrooms need either:

- A 60 in × 60 in clear turning circle inside the room, or
- A 60 in × 78 in T-shaped clear space.

The DSL doesn't model fixtures, but it does model the room footprint.
Generate at minimum:

- Half bath / WC accessible: 60 in × 84 in (5 ft × 7 ft).
- Full bath accessible: 90 in × 90 in (7.5 ft × 7.5 ft) for in-line
  layout, 96 in × 60 in (8 ft × 5 ft) for compact layouts.

### Bedroom maneuvering clearance

Accessible bedrooms need:

- 36 in clear path to one side of the bed.
- 60 in × 60 in turning circle.

The footprint should be at least 11 ft × 12 ft (132 sqft) to allow
both clearances around a queen-size bed.

### Kitchen maneuvering clearance

Accessible kitchens need:

- 60 in clear floor space at appliances and primary work area.
- 40 in minimum aisle for U-shaped layouts; 48 in for galley.

Footprint guidance:

- Galley accessible: 60 in × 144 in (5 ft × 12 ft).
- U-shape accessible: 144 in × 144 in (12 ft × 12 ft).
- Open-plan accessible with island: 192 in × 192 in (16 ft × 16 ft).

### Entry / ramp handling

The DSL cannot model ramp slopes. Express the architectural intent
through:

- A dedicated room labeled "Ramp" or "Entry Vestibule" sized at least
  60 in wide and as long as the slope requires.
- A `connect` statement with `door` from the ramp to outside and
  another `door` (or `opening`) from the ramp to the foyer.
- A comment in the `.floorplan` header noting target rise and run for
  downstream design tools.

Example:

```text
room EntryRamp at (0,0) size (5 x 20) walls [top: open, right: solid, bottom: door, left: solid] label "Ramp"
room Foyer size (8 x 8) walls [top: solid, right: solid, bottom: solid, left: open] right-of EntryRamp align top label "Entry"

connect EntryRamp.bottom to outside door at 50%
connect EntryRamp.right to Foyer.left opening at 50%
```

The comment header should describe the slope target (e.g. 1:12
maximum for ADA, 1:20 preferred for stroke-recovery patients).

### Elevator and stair sizing

Use the `lift` and `stair` elements with these minimums:

| Element                        | DSL                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Accessible passenger elevator  | `lift Elevator size (5ft x 7ft) doors (bottom)`                                                      |
| Accessible commercial stair    | `stair Stair shape U-shaped from bottom turn left runs 8,8 landing (5ft x 5ft) rise 10ft width 4ft`  |

The grammar's `stair_code` config option (`residential`,
`commercial`, `ada`, `none`) hints to the renderer what code is
targeted. Set `stair_code: ada` for accessible plans.

## Soft conventions worth applying

- Place an accessible bathroom adjacent to the master bedroom on the
  ground floor.
- When generating a multi-floor plan with `accessibility` mentioned,
  ensure at least one bedroom and one bathroom exist on the ground
  floor.
- Avoid placing critical rooms (kitchen, primary bathroom) more than
  one corridor away from the accessible entry.
- Provide a turnaround circle in the foyer and at every corridor
  junction.

## Defaults applied by tooling

`scripts/program_to_skeleton.mjs` and `scripts/generate_variations.mjs`
do **not** automatically apply accessibility expansions. To get an
accessible starter:

1. Edit the `program_brief.json` to set bedroom min size 132 sqft,
   bathroom min size 56 sqft, hallway min width 4 ft.
2. Add a `notes` field requesting accessible layout.
3. Run `scripts/program_to_skeleton.mjs --strategy rows`.
4. Run `scripts/design_critic.mjs --strict` and resolve all warnings.
5. Manually review door sizes; expand any `connect ... size (...)`
   that's narrower than 36 in.
6. Add an entry ramp room or a level threshold note to the comment
   header.

## Questions to ask the user when "accessible" is in the brief

- Which standard? (ADA Standards for Accessible Design, IBC, local
  building code, in-house standard?)
- How many wheelchair users will use the space?
- Are children, seniors, or specific disabilities a primary concern?
  (Affects bedroom layout, door swings, contrast.)
- Is the entry at grade or above grade? (Determines whether a ramp,
  vestibule, or simple threshold is needed.)
- Does the plan need a fully accessible bedroom on every floor, or is
  the ground floor sufficient?

## When to escalate beyond the DSL

If the brief calls for fixture layouts, reach ranges, hardware, or
finish surfaces, note in the response that the DSL only models
spatial geometry and recommend that the resulting floorplan be passed
to a CAD or BIM tool for the next level of accessibility detailing.
