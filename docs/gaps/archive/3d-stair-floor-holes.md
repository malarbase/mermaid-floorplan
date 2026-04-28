# Gap: 3D floor holes for straight stairs cover landings

**Status:** Resolved (archived) — closed by the `consolidate-scene-build-into-core` change.
**Resolution:** The interactive viewer now derives stair / lift cutouts from the actual mesh (`group.updateMatrixWorld(true); new THREE.Box3().setFromObject(stairOrLiftGroup)`), matching the headless renderer. Both rendering paths now share `buildFloorplanScene` in `floorplan-3d-core`, so any future fix to the cutout shape applies automatically to both. See `floorplan-viewer-core/test/stair-cutout-regression.test.ts` for the pinned regression coverage.
**Area:** `floorplan-3d-core` (3D rendering of vertical penetrations)
**Affects:** Multi‑floor plans with straight stairs (e.g. `examples/ImprovedTriplexVilla.floorplan`, `examples/StairConstraints.floorplan`).
**Related work:** Architectural side of stair landings is now enforced by the `stair_landing_egress` critic rule and skeleton generator updates (see `.cursor/skills/mermaid-floorplan/references/multi-floor.md` → "Both‑end egress for straight stairs"). This gap is purely about how the 3D viewer cuts the floor slab above the stair.

---

## 1. Symptom

When a straight stair is rendered between two floors, the hole that the renderer cuts in the floor slab **above** the stair extends across the **entire** stair container room, including:

- The boarding (base) landing strip — i.e. the floor area where someone steps **onto** the bottom step.
- The arrival (egress) landing strip — i.e. the floor area where someone steps **off** the top step on the upper floor.

This means on the upper floor you can see straight through to the floor below at the boarding landing, even though architecturally that landing is supposed to be a solid floor area on the lower level only.

### Expected behavior

The hole in the upper floor's slab should be cut **only directly under the actual stair geometry** (the treads / runs / mid‑landings that are part of the stair element itself). The base landing and the egress landing are floor area, not stair area, and should remain as opaque slab.

In plan view, for a typical 4 ft × 16.5 ft straight run with 3 ft landings on each end inside a 4 ft × 22.5 ft stair core:

```
Stair core (room) outline                         Desired hole on upper floor
┌──────────────────────────────┐                  ┌──────────────────────────────┐
│  egress landing  (3 ft)      │                  │  egress landing (solid)      │
│──────────────────────────────│                  │──────────────────────────────│
│                              │                  │                              │
│  stair run     (16.5 ft)     │                  │  HOLE (only here)            │
│                              │                  │                              │
│──────────────────────────────│                  │──────────────────────────────│
│  boarding landing (3 ft)     │                  │  boarding landing (solid)    │
└──────────────────────────────┘                  └──────────────────────────────┘
```

Today the hole spans all three regions instead of just the middle one.

---

## 2. Where the bug lives

There are two relevant call sites:

### 2.1 Penetration tracking — `floorplan-3d-core/src/scene-builder.ts`

```190:203:floorplan-3d-core/src/scene-builder.ts
    const currentFloorPenetrations: THREE.Box3[] = [];

    // Generate stairs
    if (showStairs && floor.stairs) {
      for (const stair of floor.stairs) {
        const stairGroup = stairGenerator.generateStair(stair);
        floorGroup.add(stairGroup);
        // Update world matrix before computing bounding box
        floorGroup.updateMatrixWorld(true);
        // Track for next floor's holes
        const stairBox = new THREE.Box3().setFromObject(stairGroup);
        currentFloorPenetrations.push(stairBox);
      }
    }
```

`new THREE.Box3().setFromObject(stairGroup)` returns a single axis‑aligned bounding box around the entire generated stair group. For straight stairs the only geometry inside the group are the treads (and optional risers / handrails), so in principle this box should be the run‑only region.

### 2.2 Slab cutting — `floorplan-3d-core/src/floor-geometry.ts`

```76:121:floorplan-3d-core/src/floor-geometry.ts
/**
 * Generate a single room's floor slab with CSG holes
 */
function generateRoomFloorSlabWithCSG(
  room: JsonRoom,
  thickness: number,
  theme: ViewerTheme | undefined,
  style: MaterialStyle | undefined,
  penetrations: THREE.Box3[],
  evaluator: any, // CSGEvaluator
): THREE.Mesh {
  const { Brush, SUBTRACTION } = getCSG();

  // Base slab
  const geometry = new THREE.BoxGeometry(room.width, thickness, room.height);
  const material = MaterialFactory.createFloorMaterial(style, theme);
  const brush = new Brush(geometry, material);

  // Position at room center
  brush.position.set(
    room.x + room.width / 2,
    -thickness / 2 + (room.elevation ?? 0),
    room.z + room.height / 2,
  );
  brush.updateMatrixWorld();

  let resultBrush = brush;

  // Cut holes
  for (const p of penetrations) {
    // Create a cutter brush
    const w = p.max.x - p.min.x;
    const d = p.max.z - p.min.z;
    const h = thickness * 4; // Make it significantly thicker

    const cutterGeom = new THREE.BoxGeometry(w, h, d);
    const cutter = new Brush(cutterGeom);
    ...
    resultBrush = evaluator.evaluate(resultBrush, cutter, SUBTRACTION);
  }
```

Each `Box3` becomes a CSG cutter the size of `(p.max.x - p.min.x) × (p.max.z - p.min.z)`.

### 2.3 Stair geometry — `floorplan-3d-core/src/stair-geometry.ts`

```134:222:floorplan-3d-core/src/stair-geometry.ts
  private generateStraightStair(group: THREE.Group, stair: JsonStair): void {
    const rise = stair.rise;
    const riserHeight = stair.riser ?? 0.18;
    const treadDepth = stair.tread ?? 0.28;
    const width = stair.width ?? 1.0;

    const stepCount = Math.round(rise / riserHeight);
    const actualRiser = rise / stepCount;
    ...
    // Create steps
    for (let i = 0; i < stepCount; i++) {
      const stepGroup = new THREE.Group();

      // Tread
      const treadGeom = new THREE.BoxGeometry(width, 0.05, treadDepth);
      ...
      stepGroup.position.z = -(i * treadDepth) - treadDepth / 2;
      group.add(stepGroup);
    }
    ...
```

A `straight` stair only emits tread / riser / handrail meshes — there is **no** landing geometry in the group. So in theory the bbox should already exclude the landings.

---

## 3. Root cause hypotheses (to verify in the debug session)

The fact that the rendered hole still appears to cover the landings means one or more of these is true. The fix should pick one and validate it on the example floorplans below.

1. **Stair `x`/`z` already include a landing offset.** When the skeleton generator (or `floorplan-language` JSON normalizer) emits `stair { x, z, width, height }`, the `(x, z)` may correspond to the **top‑left corner of the stair container rectangle** (run + 2× landing) instead of the **first riser**. In that case the bbox `setFromObject` covers the full container, not the run.
   - Inspect: log `stairBox.min` and `stairBox.max` for `ImprovedTriplexVilla.floorplan` and compare with the stair's `x, z, width, height` coming out of the JSON.
2. **Handrails extend past the treads.** Handrails are built from `(0, 0, 0) → (-totalDepth, totalHeight, 0)` (or rotated equivalents). If the start/end points are slightly extended (e.g., for a top railing that overhangs the landing), the bbox grows.
3. **Group rotation + `normalizeGeometryOrigin` interaction.** `generateStraightStair` applies `group.rotation.y` *before* `normalizeGeometryOrigin` shifts the group so its world‑space min corner is at `(0, 0)`. If `setFromObject` is called when world matrices are stale, the box may pick up the un‑shifted axis‑aligned bounds of the rotated geometry, which is wider than the actual footprint.
   - Inspect: confirm `floorGroup.updateMatrixWorld(true)` runs *after* the stair has been added and rotated, and confirm we are reading the bbox in floor‑group space, not in world space across floors.
4. **The cutter is positioned in slab‑local Z but the bbox is in world Z.** The cutter does
   ```ts
   const cx = p.min.x + w / 2;
   const cz = p.min.z + d / 2;
   ```
   while the slab is positioned at `room.x + room.width / 2, _, room.z + room.height / 2`. If `floorGroup.position` already adds a Y offset and any X/Z shift, the bbox `p.min.x/z` may be in floor‑group‑local coordinates and the cutter ends up oversized in world space because subsequent floors are offset.

The most likely culprit, given the visual symptom of "hole spans the whole stair core room", is **(1)** — the stair element's `x, z, width, height` in the runtime JSON model represents the **container** (boarding strip + run + arrival strip), not the run only.

---

## 4. Suggested fix shape (for the debug session)

Replace the bbox‑of‑group approach with an explicit footprint computed from the stair's geometric model. The skill scripts already have a `computeStairFootprint(stair)` helper — see:

- `.cursor/skills/mermaid-floorplan/scripts/_critic_lib.mjs` — `computeStairFootprint`, `requiredLanding`, `bottomStepLandingStrip`, `topStepLandingStrip`.

A sketch:

1. Add a `computeStairRunFootprint(stair: JsonStair): { x, z, width, depth }` helper in `floorplan-3d-core/src/stair-geometry.ts` (or a shared module) that returns the **run‑only** rectangle:
   - For `straight`: width = `stair.width`, depth = `stepCount * treadDepth`, anchored at the boarding edge (skipping the boarding landing strip).
   - For `L` / `U`: union of the per‑run rectangles (excluding mid‑landing if it sits over a wall the user wants visually solid; otherwise include it).
   - For `spiral`: bounding circle of the treads only.
2. In `scene-builder.ts`, replace
   ```ts
   const stairBox = new THREE.Box3().setFromObject(stairGroup);
   ```
   with a `Box3` constructed from `computeStairRunFootprint(stair)` so landings are explicitly excluded.
3. Keep the lift case as‑is — for lifts, the entire shaft footprint is the correct cutout.

### Acceptance criteria

- For a straight stair in a `2W × (2L + 2 × 3 ft)` container, the rendered upper floor shows opaque slab at both 3 ft landings and a hole only over the run.
- For an L‑shaped stair, the hole covers both runs and (optionally) the mid‑landing — but never the entry/exit landings.
- For a spiral stair, the hole is a circle inscribed inside the stair `width × height` footprint.
- All existing visual regression / golden‑image tests for `examples/*Stair*.floorplan` still pass after the fix.

---

## 5. Repro

```bash
# From the repo root, render one of these in the 3D viewer / app:
examples/ImprovedTriplexVilla.floorplan       # 3-story, multiple straight stairs
examples/StairConstraints.floorplan           # purpose-built for stair edge cases
.cursor/skills/mermaid-floorplan/assets/templates/StairLandingEgress-rough.floorplan
```

Look at the upper floor's slab from below: today the hole reaches the full `StairCore` room footprint instead of stopping at the run.

---

## 6. Out of scope for this gap

- Architectural correctness of the landings themselves — already covered by the `stair_landing_egress` and `stair_landing_clearance` critic rules.
- Door / opening placement on landing strips — already covered by `stair_door_collision` and `stair_room_access`.
- Lift shafts — current full‑footprint cutout is correct for lifts.
