# Mermaid-Floorplan DSL Grammar Reference

Authoritative cheatsheet for the `mermaid-floorplan` DSL. Any time you
modify or generate a `.floorplan` file, validate against the rules here
and then run `node scripts/validate.mjs <file>` to confirm.

The grammar source of truth lives in
[`floorplan-language/src/diagrams/floorplans/floorplans.langium`](../../../../floorplan-language/src/diagrams/floorplans/floorplans.langium).
Keep this reference in sync with the grammar file when the language
evolves.

## File structure

```
[ frontmatter | %%{version: ...}%% ]   # optional
floorplan
  [ define <Name> (<W>x<H>) ]*         # optional, reusable size constants
  [ style <Name> { ... } ]*            # optional, material palette
  [ config { ... } ]?                  # optional, global options
  [ floor <Id> [ height <h> ] { rooms, stairs, lifts } ]+
  [ connect <Wall> to <Wall> <doorType> ... ]*
  [ vertical <Floor>.<Element> to <Floor>.<Element> ... ]*
```

Lines starting with `#` are comments. Block comments use `/* ... */`.

## Frontmatter / version

Two equivalent forms; either is optional.

```text
---
version: 1.0
title: My Apartment
description: 2BR demo
author: Architect
---
```

```text
%%{version: 1.0}%%
```

The version directive accepts both quoted (`"1.0"`) and bare numbers
(`1.0`).

## `define` (variables)

Reusable dimensions referenced by name.

```text
define Standard (10 x 10)

room Bedroom1 size Standard walls [...]
```

A `Room`'s `size` accepts either an inline `(W x H)` `Dimension` or an
`ID` referring to a previously declared `define`.

## `style`

Material palette referenced by `style <Name>` on rooms / stairs / lifts.

```text
style Wood {
  floor_color: "#A98B6F",
  wall_color: "#FFFFFF",
  roughness: 0.6,
  metalness: 0.05
}
```

Allowed property keys:
`floor_color`, `wall_color`, `floor_texture`, `wall_texture`,
`roughness`, `metalness`.

## `config`

```text
config {
  default_unit: ft,
  area_unit: sqft,
  wall_thickness: 0.5,
  default_height: 9ft,
  door_width: 3ft,
  door_height: 7ft,
  window_width: 4ft,
  window_height: 4ft,
  window_sill: 3ft,
  default_style: Wood,
  theme: blueprint,
  showLabels: true,
  showDimensions: false,
  stair_code: residential
}
```

Keys come in `snake_case` (legacy) and `camelCase` (Mermaid-aligned)
flavors; either is accepted.

- `default_unit`: one of `m`, `ft`, `cm`, `in`, `mm`. Numbers without an
  explicit unit inherit this.
- `area_unit`: `sqft` or `sqm`.
- `theme`: `default`, `dark`, or `blueprint`.
- `stair_code`: `residential`, `commercial`, `ada`, or `none`.

## `floor`

```text
floor <Id> [ height <value>[<unit>] ] {
  <room>*
  <stair>*
  <lift>*
}
```

The first floor declared is `index 0`. Floor IDs must be unique. If
`height` is omitted, `config.default_height` is used.

## `room`

```text
room <Id>
    [ at (<x>, <y>) ]
    size (<W> x <H>) | <SizeRef>
    [ height <v>[<unit>] ]
    [ elevation <v>[<unit>] ]
    walls [<WallSpec>, <WallSpec>, ...]
    [ <RelativePosition> ]
    [ label "<text>" ]
    [ composed of [ <sub-room>* ] ]
    [ style <StyleRef> ]
```

`sub-room` shares the same shape as `room` and is intended for
composing complex rooms (e.g. a master bedroom with closet sub-rooms).

### Position: absolute vs relative

A room must have either an `at` clause **or** a `RelativePosition`
clause **or** both. Pick exactly one default rule:

- For programmatic / script generated layouts → use `at (x, y)`. This
  is what `program_to_skeleton.mjs` and `generate_variations.mjs`
  produce.
- For human-authored or natural-language refinement layouts → relative
  positioning reads better and is more robust to small size changes.

### `RelativePosition`

```text
<direction> <referenceRoomId> [ gap <v>[<unit>] ] [ align <alignment> ]
```

- `direction`: `right-of`, `left-of`, `above`, `below`,
  `above-right-of`, `above-left-of`, `below-right-of`, `below-left-of`.
- `align`: `top`, `bottom`, `left`, `right`, `center`. Default depends
  on direction.
- `gap`: numeric, optionally with unit. Default is 0.

### Walls (`WallSpec`)

A `walls [...]` block lists each side that has a non-default treatment.
Sides not listed default to `solid`.

```text
walls [top: solid, right: window, bottom: window, left: open]
```

Each wall specification can optionally pin a position and a custom
opening size:

```text
walls [right: window at 50% size (4 x 4) height 5]
```

- `direction`: `top`, `right`, `bottom`, `left`.
- `type`: `solid`, `door`, `window`, `open`.
- `at <n>%`: position along the wall (only meaningful for `door` /
  `window`).
- `size (W x H)`: explicit opening size, overrides config default.
- `height <n>`: opening height, overrides config default.

Use `open` only when two rooms are truly a single open-plan volume
(foyer + living room, kitchen + dining). `connect` statements
themselves carve `door` and `window` openings; do **not** also mark a
wall as `door` or `window` if you have a `connect` for it.

## `connect`

```text
connect <FromWall> to <ToWall> <DoorType>
        [ at <n>% ]
        [ size (<W>[<unit>] x (<H>[<unit>] | full)) ]
        [ door opens into <RoomId> | opens into <RoomId> ]
        [ swing : <left|right> ]
```

- `<FromWall>` is `<RoomId>[.<wall>]`. The wall is optional but
  recommended for clarity.
- `<ToWall>` is `<RoomId>[.<wall>]` or the literal keyword `outside`.
- `DoorType` is `door`, `double-door`, or `opening` (a doorless
  archway).
- `at <n>%` positions the opening along the from-wall (0 = left/top,
  100 = right/bottom).
- `size (W x H)` overrides the config default. Use `full` as the
  height to make the opening reach the ceiling.

Examples:

```text
connect Foyer.top to outside door at 50%
connect Hall.bottom to Bedroom2.top door at 15%
connect Kitchen.right to Patio.left double-door at 40% size (6ft x full)
connect LivingRoom.right to Kitchen.left opening at 50%
```

## `stair`

```text
stair <Id>
    [ at (<x>, <y>) ]
    shape <StairShape>
    rise <v>[<unit>]
    [ width <v>[<unit>] ]
    [ riser <v>[<unit>] ]
    [ tread <v>[<unit>] ]
    [ nosing <v>[<unit>] ]
    [ headroom <v>[<unit>] ]
    [ handrail (<HandrailSpec>) ]
    [ stringers <open|closed|glass> ]
    [ material { tread: "...", riser: "...", stringer: "...", handrail: "..." } ]
    [ <RelativePosition> ]
    [ label "<text>" ]
    [ style <StyleRef> ]
```

Shapes: `straight`, `L-shaped`, `U-shaped`, `double-L`, `spiral`,
`curved`, `winder`, `custom` (segmented).

Examples:

```text
stair Main shape straight toward top rise 10ft width 4ft
stair Service shape L-shaped from bottom turn left runs 5,5 rise 10ft width 3ft
stair Grand shape spiral rotation clockwise outer-radius 5ft rise 12ft handrail (outer)
stair Custom shape custom from bottom [
    flight 5 width 5ft,
    turn right landing (5ft x 5ft),
    flight 6 width 4ft
] rise 12ft width 4ft
```

## `lift`

```text
lift <Id>
    [ at (<x>, <y>) ]
    size (<W> x <H>)
    [ doors (<dir> [, <dir>]*) ]
    [ <RelativePosition> ]
    [ label "<text>" ]
    [ style <StyleRef> ]
```

`doors` accepts one or more of `top`, `bottom`, `left`, `right`.

## `vertical` (multi-floor stacking)

Links circulation elements across floors so the renderer / analyzer
recognizes them as one continuous shaft.

```text
vertical GroundFloor.MainStair to FirstFloor.MainStair
vertical GroundFloor.MainElevator to FirstFloor.MainElevator to Penthouse.GlassElevator
```

The element name on each side must reference an actual `stair` or
`lift` declared on that floor. Vertical alignment is checked by the
analyzer; mis-aligned shafts produce warnings.

## Comments and formatting

- Single-line: `# this is a comment`
- Block: `/* this is a block comment */`
- Whitespace is insignificant; align inputs as you like.

## Identifier rules

`ID` matches `/[_a-zA-Z][\w]*/`. Use `PascalCase` for floor / room /
stair / lift IDs by convention. The `outside` literal is reserved.

## Common idioms used by this skill's tooling

- Always anchor at least one room with `at (0,0)`. Most algorithms
  expect a deterministic origin.
- Keep `Foyer` (or equivalent entry) as the anchor when present.
- Order `define` → `style` → `config` → `floor`s → `connect`s →
  `vertical`s. The grammar accepts other orderings, but tooling assumes
  this canonical layout.
- Walls between rooms should usually be `solid` even when there's a
  door — the door comes from a `connect` statement. Use `open` only
  for genuine open-plan spaces.
- Never leave a room without at least one `door`, `opening`, or `open`
  wall on a path that reaches `outside`. The design critic flags this.
