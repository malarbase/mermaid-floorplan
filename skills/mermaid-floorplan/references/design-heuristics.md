# Design Heuristics for Floorplan Generation

A working library of architectural rules-of-thumb the agent should
internalize when authoring or critiquing `.floorplan` DSL. These are
the same heuristics that
[`scripts/design_critic.mjs`](../scripts/design_critic.mjs) enforces
and that
[`scripts/suggest_improvements.mjs`](../scripts/suggest_improvements.mjs)
turns into concrete edits. Use this file as the "why" companion to the
critic's "what" findings.

The goal is not to produce code-perfect drawings. It is to produce
floor plans that read as plausible to a human architect and that pass
the critic without manual hand-holding.

All units below are in feet (`config { default_unit: ft }`). Translate
to other units by reading the floorplan's config.

## Programmatic vs interpretive rules

Two flavors of heuristic appear here:

1. **Hard rules** — encoded in `design_critic`. Violations show up as
   findings. The agent should treat these as defects.
2. **Soft rules** — taste / convention. Worth following but not
   automatically flagged. Good agents will still apply them when there
   is no conflict.

Where applicable, hard rules cite the critic rule ID (e.g.
`reachability`).

## Required relationships

### Entry from outside (`entry_from_outside`, hard)

Every floorplan must contain at least one `connect ... to outside`
statement (or a wall marked `door` on the outermost perimeter). When
generating a layout from a brief, prefer wiring the `connect` from the
entry/foyer/lobby room. Multi-floor plans only need one such connection
on the ground floor.

### Reachability (`reachability`, hard)

Every habitable room must be reachable from the entry via a chain of
`connect` statements **or** through a sequence of rooms that share an
`open` wall. The critic builds a graph and runs BFS from the entry
room.

When in doubt, add an explicit `connect` rather than relying on
shared open walls.

### Bedroom-bath adjacency (`bedroom_bath_adjacency`, soft)

Every bedroom must have a bathroom within two `connect` hops, counted
through doors and open walls. The critic does a BFS from each bedroom
and flags any that exceed the limit. Master/primary bedrooms ideally
have an ensuite (1 hop); secondary bedrooms can share a hall bath
provided it sits off the same hallway.

This rule was tightened in iteration-3 after human review flagged 2BR
plans where the lone bathroom sat between the kitchen and the entry
instead of near the bedrooms.

### Bathroom not directly off the entry (`bathroom_off_entry`, soft)

Bathroom doors should not open straight onto the foyer/vestibule/lobby
or to the outside. Route them through a hallway, the master bedroom,
or a private corridor. The critic warns when the only door of a `bath`,
`ensuite`, or `powder` room lands on a room of kind `entry`/`lobby`,
or directly on `outside`.

Powder rooms in commercial / open-plan layouts are the most common
exception and can be silenced by adding `# soft-rule-exempt powder` as
a code comment near the connect statement (the agent should still ask
before suppressing).

## Dimensions and proportions

### Corridor width (`corridor_width`, hard)

Hallways, foyers, and other circulation rooms must be at least 3 ft on
their narrow dimension (4 ft for commercial / public buildings). The
critic flags rooms classified as `circulation` whose smaller dimension
is below 3 ft.

### Bedroom size (`bedroom_size`, soft)

A bedroom should be at least 8 ft × 8 ft (64 sqft). Master bedrooms
should be at least 11 ft × 12 ft (132 sqft). The critic emits a
warning rather than an error.

### Bathroom size

- Half bath / WC: 4 ft × 5 ft minimum.
- Full bath: 5 ft × 8 ft minimum.
- Master ensuite: 8 ft × 10 ft for double vanity.

### Kitchen size

- Galley: 5 ft × 10 ft minimum (counter on one side).
- L-shape: 8 ft × 10 ft.
- Open-plan with island: 12 ft × 12 ft minimum.

### Living / dining

- 1BR living: 12 ft × 14 ft.
- 2BR+ living: 14 ft × 16 ft.
- Dining alone: 10 ft × 10 ft for a 4-seat table; 12 ft × 14 ft for
  6-seat with china cabinet space.

### Aspect ratios

Avoid rooms with aspect ratios above 3:1 unless they are explicitly
circulation (hall, gallery). A 30 ft × 6 ft "bedroom" reads as a
hallway by mistake.

## Walls, openings, and privacy

### Wet walls (`wet_walls`, regional preference)

Two competing conventions exist for wet rooms (kitchen / bath / laundry):

- **Shared wet walls** — North American and European construction often
  stacks bathrooms back-to-back with the kitchen so plumbing runs share
  a single wet wall. This minimises pipe length and structural cost.
- **Separated wet rooms** — Vāstu, certain South Asian, and ritual/
  cleanliness traditions (and some homeowners' personal preference)
  deliberately keep the kitchen and bathroom from sharing any wall, on
  the grounds of food/sanitation separation.

Because both conventions are valid, the critic emits **`info`** (not
`warning`) when no wet rooms share a wall. Authors who explicitly
require a shared wet wall should add it as a constraint to the program
brief and run the critic with `--strict` to escalate the info finding.
Authors who prefer separation should ignore the info finding (or pass
`--skip wet_walls`).

When generating from a brief, ask the user which preference they want
before placing the bath.

### Bathroom privacy (`bathroom_privacy`, soft)

Bathroom doors should not face directly into a public room (living,
dining, kitchen) when there's a hallway alternative. Avoid placing a
toilet directly visible from the entry.

### Door openings (`door_opening`, hard)

Every doorway must have a corresponding `connect` statement with door
type `door`, `double-door`, or `opening`. Walls marked `door` without
a `connect` produce critic findings.

### Windowless habitable rooms (`windowless_habitable`, hard)

Bedrooms, living rooms, dining rooms, kitchens, and offices must have
at least one window or one fully open wall to a room that has a
window. The critic walks the open-wall graph to verify natural light
reach.

Bathrooms, closets, laundry, and corridors are exempt.

## Layout idioms

### Hallway as backbone (use sparingly)

For 2BR+ residential plans, a single horizontal or L-shaped hallway
that connects the public zone (kitchen / living) to the private zone
(bedrooms) is a clean, well-known idiom. Doors off the hallway should
be roughly evenly spaced, with public rooms on one side and private
rooms on the other when possible.

**Caveat:** small apartments (≤1000 sqft, ≤2BR) often feel claustrophobic
when ~10–15 % of the floor is dedicated to a hallway. Prefer the open-plan
public zone (below) for tight footprints, and reserve the backbone hall
for plans where it serves at least three private rooms (bedrooms + bath).
The critic flags hallways that connect ≤2 distinct rooms via the
`corridor_only_hallway` rule.

### No corridor-only hallways (`corridor_only_hallway`, hard)

A hallway whose entire purpose is to bridge two rooms is dead floor
area. The critic flags any room of kind `hallway` whose distinct
neighbour count is ≤ 2 and whose area is ≥ 30 sqft, and suggests
replacing it with a direct doorway or an open-plan transition.

### Open-plan public zone

Foyer → living → dining → kitchen often share an open volume. Use
`open` walls between them and a single perimeter of windows. Place the
kitchen with at least two solid walls (for cabinetry) and the living
room with at least two windows.

For studios and 1BR plans, prefer this idiom over a hallway: the
private rooms (bedroom, bath) hang off the open-plan public zone via
short doorways. See `assets/templates/studio-openplan.floorplan` for
a reference layout that intentionally avoids both a hallway *and*
shared kitchen-bath walls.

### Master suite cluster

Group master bedroom, ensuite, and walk-in closet at one corner of
the private zone. Share a wet wall between the ensuite and the hall
bathroom whenever possible.

### Service stack

Stack stairs, elevators, and wet rooms vertically across floors so
plumbing and structure align. The
[`multi-floor.md`](./multi-floor.md) reference covers the alignment
rules.

## Wall-type defaults by room kind

Use these defaults when generating a starter layout. They match
[`scripts/_layout_lib.mjs::DEFAULT_WALLS_BY_KIND`](../scripts/_layout_lib.mjs).

| Kind                | Default walls                                                         |
| ------------------- | --------------------------------------------------------------------- |
| `bedroom`, `master` | `[top: solid, right: solid, bottom: window, left: solid]`             |
| `living`            | `[top: window, right: open, bottom: solid, left: open]`               |
| `kitchen`           | `[top: window, right: solid, bottom: solid, left: open]`              |
| `dining`            | `[top: solid, right: open, bottom: solid, left: window]`              |
| `bath`, `wc`        | `[top: solid, right: solid, bottom: solid, left: solid]`              |
| `foyer`, `entry`    | `[top: door, right: open, bottom: solid, left: solid]`                |
| `hall`, `corridor`  | `[top: solid, right: solid, bottom: solid, left: solid]`              |
| `office`, `study`   | `[top: solid, right: solid, bottom: window, left: solid]`             |
| `closet`, `laundry` | `[top: solid, right: solid, bottom: solid, left: solid]`              |

The actual openings come from `connect` statements, not from wall
types — except for `open` walls, which represent open-plan spaces.

## Defaults the agent should apply when the brief is silent

- Anchor the entry / foyer at `(0, 0)`.
- Use 1 unit = 1 foot.
- Pack public rooms in the top row, hallway in the middle, private
  rooms in the bottom row when the program brief has 4+ rooms.
- Default to a single floor unless the brief explicitly requests more.
- Add at least one window to the kitchen, living, dining, and every
  bedroom.
- Wire one `connect ... to outside door at 50%` from the entry room.

## Open questions for the user

When the brief leaves room kinds, square footage, or accessibility
requirements ambiguous, the agent should ask before guessing:

- Is this single-family residential, multi-family residential, hotel
  suite, retail, or office?
- Total approximate gross floor area? (used as the size budget)
- Number of bedrooms and bathrooms? Master ensuite or hall bath?
- Open-plan kitchen / dining / living, or compartmented?
- Single floor or multi-floor?
- ADA / accessibility requirements? (See [`accessibility.md`](./accessibility.md))
- Garage, balcony, patio, or other outdoor adjacencies?
- **Wet-wall preference?** Are shared kitchen/bath walls acceptable, or
  should they be kept apart? (See *Wet walls* above.)
- **Layout preference?** Open-plan public zone, or central-hallway
  backbone? (See *Hallway as backbone* and *Open-plan public zone*.)
