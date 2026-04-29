# Gap: 3D Wall Network Rebuild

**Type:** Architectural Debt  
**Area:** `floorplan-3d-core/src/wall-builder.ts`, `wall-ownership.ts`  
**Status:** Active architectural debt. The Phase 4 Z-fighting fix introduced a
secondary artifact (visible step/bump at perpendicular wall junctions, plus
residual coplanar faces) that is inherent to the per-room butt-joint approach.
The current workaround is an epsilon-embed that hides the coplanar face but
does not eliminate the underlying topology problem.

---

## Symptom

The Phase 4 Z-fighting fix (adjacency-aware corner extents) revealed a
fundamental geometric constraint in the per-room wall model: any approach using
simple box geometry faces a trilemma at every perpendicular junction.

| Approach | Corner geometry | Z-fighting | Visual artifact |
|---|---|---|---|
| Old code (extend both walls by halfT) | Volumetric overlap cube | ✗ coplanar exterior faces | shimmering |
| Butt joint (vertical shrinks to room.height − T) | Zero overlap | ✗ coplanar inner face at junction | visible step/bump |
| Epsilon embed (vertical embeds 1mm into horizontal) | Tiny hidden overlap (1mm) | ✓ none | ✓ none (for now) |

The epsilon-embed workaround currently in use hides the coplanar face but does
not change the underlying topology. At sufficiently shallow camera angles, or
with CSG subtraction at the junction, the 1 mm overlap may still produce
artifacts.

The residual concern is **bookkeeping complexity**: every new wall edge case
(T-junction, asymmetric wall thickness, curved walls, polygon rooms) requires
extending the per-room ownership + adjacency logic.

---

## Where it lives

```44:106:mermaid-floorplan/floorplan-3d-core/src/wall-builder.ts
export function calculateWallGeometry(
  wall: JsonWall,
  room: JsonRoom,
  wallThickness: number,
  allRooms: JsonRoom[] = [],
): WallGeometry { … }
```

```1:50:mermaid-floorplan/floorplan-3d-core/src/wall-ownership.ts
export function hasNeighborAtCorner(…): boolean { … }
export function analyzeWallOwnership(…): WallOwnershipResult { … }
export function computeWallSegments(…): WallSegment[] { … }
```

---

## Root cause hypotheses

The current architecture builds walls **per-room**: each room emits its own
four wall meshes, and wall ownership rules (`shouldRenderWall`) suppress
duplicate shared walls. Corner cells at the junction of two perpendicular
walls require adjacency-aware extension/shrinkage logic to avoid Z-fighting.

A wall graph would instead operate **per-edge**: collect all wall edges across
the floor, compute mitered intersections once, and emit exactly one mesh per
edge. Corner geometry becomes trivially correct — each corner mesh is emitted
by the node that owns it, with no possibility of duplicates.

---

## Suggested fix shape

Replace the per-room wall emission with a **wall-network builder**:

### Data model

```ts
interface WallNode {
  id: string;
  worldPos: THREE.Vector2;          // XZ position
  incidentEdges: WallEdge[];
}

interface WallEdge {
  id: string;
  nodeA: WallNode;
  nodeB: WallNode;
  thickness: number;
  style: MaterialStyle | undefined;
  connections: JsonConnection[];    // doors / windows on this edge
}

interface Junction {
  node: WallNode;
  miterGeometry: THREE.BufferGeometry;  // corner fill
}
```

### Build steps

1. **Collect edges**: for each room, for each wall direction, emit a
   `WallEdge` keyed on the canonical endpoint pair (sorted by world
   position). Duplicate edges (shared walls) produce one edge, not two.
2. **Compute nodes**: find all unique endpoints (corners). Each node knows
   its incident edges and their relative angles.
3. **Miter geometry**: at each node, compute the miter intersection polygons
   for all incident edges. The corner fill is the convex hull of the
   intersection polygon — no separate bookkeeping needed.
4. **Emit meshes**: one `THREE.Mesh` per edge (wall segment), one small mesh
   per corner node. Apply materials by edge ownership.
5. **Hole cutting**: CSG cutters for doors/windows operate on edge meshes
   directly; no per-room segment filtering needed.

### Prototype sketch

```ts
// Replace WallBuilder.generateWall() with:
export class WallNetworkBuilder {
  buildNetwork(floor: JsonFloor): WallNetwork;
  emitMeshes(net: WallNetwork, config: JsonConfig): THREE.Group;
}
```

---

## Pros

- **Single source of truth** — no duplicate adjacency logic; ownership is
  implicit in the graph topology.
- **Mitered corners are trivially correct** — the miter polygon eliminates
  the entire class of Z-fighting corner bugs without any per-corner bookkeeping.
- **Easier to extend** — curved walls, half-height walls, wall caps, and
  animated walls are all just `WallEdge` variants.
- **CSG batching** — all holes on one edge can be CSG-subtracted in a single
  pass, reducing GPU upload overhead for dense floorplans.
- **Material assignment** is a simple edge-lookup rather than a per-segment,
  per-face adjacency scan.
- **Unlocks complex room shapes** — see below.

## Cons

- **~600–1000 LOC rewrite** — `wall-builder.ts` (~830 lines) and
  `wall-ownership.ts` (~400 lines) both need a full rebuild.
- **Every consumer of `WallBuilder` is affected** — `scene-builder.ts`,
  `wall-geometry.ts`, and all browser-rendering paths must be re-plumbed to
  the new API.
- **Hole re-derivation** — `createExplicitHole` and `createConnectionHole`
  must be re-mapped from per-room-wall coordinates to per-edge coordinates.
  Position ratios (`wall.position`, `connection.position`) are defined as
  fractions of the room edge, not the network edge — a mapping step is needed.
- **Tests require a full rebuild** — all existing `wall-builder.test.ts` and
  `wall-corner-geometry.test.ts` tests exercise the per-room API and would
  need to be rewritten or supplemented.
- **Material assignment becomes graph-colouring** — for shared edges with
  asymmetric per-face materials (interior face vs exterior face), the graph
  colouring must be consistent across the floor. Currently each room owns its
  own face materials.
- **CSG batching strategy changes** — currently each wall brush is subtracted
  individually; batching by edge changes the evaluator call pattern.

---

## Acceptance criteria

1. Visual parity with the Phase 4 result (`ImprovedTriplexVilla.floorplan`
   renders identically or better).
2. All existing tests pass (or updated equivalents pass).
3. No performance regression on the example floorplans (measured by scene
   build time and mesh count).
4. `wall-corner-geometry.test.ts` overlap assertions still pass.

---

## Out of scope

- Curved walls (separate gap)
- Half-height walls or parapet walls
- Wall-segment annotations (labels, hatching)
- Multi-floor wall stacks (each floor is independent in the current model)

---

---

## Relationship to `add-complex-room-shapes`

The `openspec/changes/add-complex-room-shapes` proposal adds polygon rooms,
composite (CSG union/difference) rooms, and door connections on non-rectangular
wall segments. The wall-network rebuild is effectively a **prerequisite** for
doing that work cleanly.

### Polygon rooms

The current system assumes walls are one of four axis-aligned directions
(`top`, `bottom`, `left`, `right`) and generates a `BoxGeometry` for each. An
angled wall (e.g. the `(10,0) → (12,5)` edge from the proposal's polygon
example) has no representation in this model.

A `WallEdge` is just `nodeA → nodeB` with a thickness — direction is derived,
not assumed. Angled walls become just another edge. The miter geometry at each
`WallNode` naturally handles arbitrary angles.

### Composite rooms (L-shapes, unions)

An L-shaped room defined as `union(rect(12×20), rect(8×8))` today would
require bespoke logic to determine which of the 8 candidate wall sides are
interior (suppressed) vs exterior, and how to handle the notch corner.

With a wall network, the union operation cancels interior edges automatically.
The outline of the composite polygon is collected as a sequence of `WallEdge`
entries. Corner nodes handle the geometry — no special-case suppression rules
needed.

### Door connections on complex shapes

The proposal's motivating example is a door between `Lobby` and an L-shaped
`Terrace` where the overlap only exists because of the L extension. Today,
`computeWallSegments` finds overlapping axis-aligned ranges between rectangular
rooms — it has no concept of a non-rectangular room boundary.

In a wall-network, a door connection is a hole cut in a specific `WallEdge`.
Finding the right edge is a geometric query on the polygon outlines of the two
rooms — a well-understood computational geometry operation that works for any
shape.

### Net effect

Implementing complex room shapes **without** the network rebuild means bolting
polygon support onto a system that hard-codes rectangles at every layer
(`language/src`, `viewer/src`, `wall-builder.ts`, `wall-ownership.ts`,
`scene-builder.ts`). The blast radius is wide precisely because the rectangle
assumption is pervasive.

Doing the network rebuild first reduces the complex-shapes change to:
- Emit polygon outline edges as `WallEdge` entries (instead of 4 directional walls)
- Derive union/difference outlines in the parser/exporter
- Door placement: find the edge, cut the hole — no new rendering logic

---

## Cross-links

- Phase 4 fix that motivated this document: `floorplan-3d-core/src/wall-builder.ts`
  (`adjustSegmentsForCorners`, `calculateWallGeometry`)
- Related: `wall-ownership.ts` `hasNeighborAtCorner` (the bookkeeping that
  would be eliminated by the network rebuild)
- Downstream: `openspec/changes/add-complex-room-shapes` — the network rebuild
  is a prerequisite for implementing complex shapes without wide blast radius
