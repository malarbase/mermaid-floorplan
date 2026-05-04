# Gap: Critic has no door/window overlap rule; 2D renderer ignores window position

**Status:** Resolved (archived).  
**Resolution:** Both fixes landed in the same session that identified the gap.
(1) `door_window_overlap` rule added to `_critic/rules_structural.mjs` — fires as `error` when a `connect … door at N%` interval overlaps a `walls [dir: window at M% size (W x H)]` interval on the same wall; silent for whole-wall `window` types and non-overlapping specs. Mirrors the geometry of the existing `stair_door_collision` rule.
(2) `render_3d.mjs` updated: replaced `wallType()` + `wallFill()` with `wallSpec()` + `renderWallFace()`. When a wall spec has both `position` and `width` set, the face is split into up to three sub-polygons (solid | window-blue | solid) by linearly interpolating projected screen-space corners; whole-wall types keep the original single-fill behaviour. `StairConstraints.floorplan` scores 100 / allClean after both changes.  
**Area:** `skills/mermaid-floorplan/_critic/rules_structural.mjs` · `skills/mermaid-floorplan/scripts/render_3d.mjs`.  
**Affects:** Any plan that declares both a positioned `window` wall spec and a `connect … door` on the same wall.

---

## Symptom

`examples/StairConstraints.floorplan` has:

```30:30:mermaid-floorplan/examples/StairConstraints.floorplan
    room Foyer at (6, 0) size (12 x 6) walls [top: window, right: solid, bottom: solid, left: solid] label "Foyer"
```

with a door to outside on the same `top` wall:

```47:47:mermaid-floorplan/examples/StairConstraints.floorplan
  connect Foyer.top to outside door at 50%
```

The critic reported a perfect score (100 / allClean: true). However:

1. There was no critic rule that checked whether a `connect … door at N%` position overlaps a
   `walls [<dir>: window at N% size (W x H)]` range on the same wall. If an author placed a
   positioned window directly behind a door, the geometry would be malformed in 3D with no warning.

2. The 2D axonometric renderer (`render_3d.mjs`) rendered every `window`-typed wall as a solid
   colour fill for the entire face, regardless of whether the wall spec carried an `at N%` position.
   A wall that is `window at 30% size (4 x 4)` looked identical to a whole-wall `window` in the
   script output, making positioned windows invisible in the headless render loop.

---

## Discovered by

Conversation-driven exploration of `StairConstraints.floorplan` while verifying that `entry_from_outside` was satisfied. The review identified that:

- `connect Foyer.top to outside door at 50%` and `walls [top: window]` coexist on the same wall.
- The critic correctly accepts a door inside a window wall (architecturally valid: glazed facades
  with entry doors are common). But the question was raised: *what prevents a door from landing
  exactly on a positioned window opening?*
- Checking the grammar and converter confirmed that positioned windows (`at N% size W x H`) are
  already first-class DSL syntax and are threaded through to the 3D renderer — the gap was
  exclusively in the critic and 2D script renderer.

---

## Where it lives

### Grammar — already implemented before this fix

```169:176:mermaid-floorplan/floorplan-language/src/diagrams/floorplans/floorplans.langium
WallSpec:
    '[' specifications+=WallSpecification (',' specifications+=WallSpecification)* ']';

WallSpecification:
    direction=WallDirection ':' type=WallType 
    ('at' position=NUMBER unit=('%')?)?
    ('size' size=Dimension)?
    ('height' height=NUMBER)?;
```

### JSON converter — already implemented before this fix

```473:476:mermaid-floorplan/floorplan-language/src/diagrams/floorplans/json-converter.ts
            position: spec.position,
            isPercentage: spec.unit === '%',
            width: spec.size?.width?.value,
            height: spec.size?.height?.value,
```

### 3D CSG hole carving — already implemented before this fix

```1133:1140:mermaid-floorplan/floorplan-3d-core/src/wall-network.ts
  // Default to centred. Per the explicitType field doc, undefined isPercentage
  // is treated as percentage to match the historical DSL convention.
  let ratio = 0.5;
  if (explicit.position !== undefined) {
    if (explicit.isPercentage === false) {
      ratio = explicit.position / Math.max(length, NETWORK_EPSILON);
    } else {
      ratio = explicit.position / 100;
```

### Critic rule — **fixed**

`door_window_overlap` added to `_critic/rules_structural.mjs`. For each `door` connection it
computes the door's absolute centre using the same overlap-aware geometry as `stair_door_collision`
(shared-edge overlap for room-to-room, full wall for outside connections), then checks every
positioned window spec on the same wall for interval intersection.

`roomBounds` added to the import from `./geometry.mjs`.

Rule is per-floor (not a `MULTI_FLOOR_RULE`) and fires as `error`.

### 2D axonometric renderer — **fixed**

`render_3d.mjs` changes:

- `wallSpec(room, direction)` replaces `wallType()` — returns the full `JsonWall` object.
- `lerp2d(p0, p1, t)` — linearly interpolates two projected screen points.
- `renderWallFace(p0, p1, p2, p3, spec, wallLength, side)` — when `spec.position` and `spec.width`
  are both set, splits the face into solid | window | solid sub-polygons by lerping along the wall
  axis; otherwise falls through to the original single-fill behaviour.
- `renderRoomBox` updated to call `renderWallFace` for the front (bottom) and right walls.

---

## Root cause

1. **Positioned windows are a newer DSL feature than the critic rules.** The `stair_door_collision`
   rule (a 1D interval overlap check on a wall) existed; no analogous rule existed for window specs.

2. **The 2D script renderer was intentionally simplified.** `render_3d.mjs` traded geometric
   fidelity for fast axonometric previews. Position-aware partial window rendering was never added
   because the 3D viewer already handled it correctly.

3. **The critic context already carried the position data.** Both `ctx.rooms[n].walls` and
   `ctx.connections` carry `position` and `isPercentage`. No schema or converter changes were needed.

---

## Acceptance criteria — all met

- [x] `door_window_overlap` rule fires as `error` when a `connect … door at N%` interval overlaps
  a `walls [dir: window at M% size (W x H)]` interval on the same wall of the same room.
- [x] Rule is silent when: (a) the window has no `position` (whole-wall type), (b) the door and
  window are on different walls, (c) the intervals do not overlap.
- [x] `render_3d.mjs` renders `walls [dir: window at N% size (W x H)]` as a partial hatch
  (solid | window-blue | solid sub-polygons), not a full-wall fill.
- [x] `StairConstraints.floorplan` continues to score 100 / allClean (whole-wall `window` with no
  `position` — rule is silent).

---

## Out of scope (unchanged)

- Making window specs first-class selectable entities in the entity bridge.
- Multiple windows per wall (overlap check extends naturally; renderer partial-fill for N windows
  is a follow-on).
- `connect … doorType window` (glazed sliding doors via connections) — separate renderer path.
- Changing the DSL grammar or the JSON converter.

---

## Related docs

- [`language-primitive-registry-codegen.md`](../language-primitive-registry-codegen.md) — the
  primitive registry gap; windows with position/size are an example of a field that exists in the
  grammar and 3D renderer but is invisible to the descriptor/UI/annotation layer.
- [`references/dsl-grammar.md`](../../skills/mermaid-floorplan/references/dsl-grammar.md) — documents
  `walls [dir: window at N% size (W x H)]` syntax under "Walls (WallSpec)".
- [`_critic/rules_stairs.mjs`](../../skills/mermaid-floorplan/scripts/_critic/rules_stairs.mjs) — the
  `stair_door_collision` rule is the structural analogue: a 1D interval overlap check for doors on
  stair-bearing walls.
