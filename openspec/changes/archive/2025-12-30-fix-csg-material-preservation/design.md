## Context

When CSG (Constructive Solid Geometry) operations create door/window holes in wall segments, Three.js material group assignments are destroyed. The `three-bvh-csg` library generates new geometry with different face topology, causing all faces to render with only the first material instead of their intended per-face materials.

This is problematic for shared walls where:
- Interior face should show owner room's wall_color
- Exterior face should show adjacent room's wall_color

### Research Sources

- [GitHub Issue #48](https://github.com/gkjohnson/three-bvh-csg/issues/48) - Discusses need for utilities to handle separated geometry
- [CSGManager.js](https://github.com/zalo/PhysicsWorkshop/blob/feat-sphere-packing/src/CSGManager.js) - Shows manifold-3d alternative approach

## Goals / Non-Goals

**Goals:**
- Preserve per-face material assignments after CSG operations
- Maintain visual correctness for shared walls with holes
- Minimize performance impact

**Non-Goals:**
- Changing CSG library (manifold-3d requires WASM, larger refactor)
- Supporting non-axis-aligned walls (current walls are always axis-aligned)
- Texture coordinate preservation (not currently used on walls)

## Decisions

### Decision: Post-CSG Normal-Based Material Reassignment

After CSG operations, iterate through all faces and reassign materials based on face normal direction.

**Rationale:**
1. Minimal code changes - works within existing pipeline
2. Reliable for axis-aligned walls - normals clearly indicate face direction
3. Good performance - single pass O(n) through faces
4. No new dependencies

**Alternatives Considered:**

| Alternative | Pros | Cons | Verdict |
|-------------|------|------|---------|
| Multi-mesh (6 planes) | Perfect material preservation | 6x more meshes, draw calls, edge seams | Rejected |
| manifold-3d library | Robust CSG, decompose islands | WASM dependency, still needs reassignment | Future option |
| Custom vertex attribute | Uses library features | Complex preprocessing, interpolation issues | Rejected |
| Skip CSG on shared walls | Simple, no perf impact | Visual workaround, doesn't fix root cause | Rejected |

## Implementation

### Algorithm

```
For each face in CSG result geometry:
  1. Get face normal (nx, ny, nz)
  2. Find dominant axis (largest absolute component)
  3. Map to material index:
     - +X → 0, -X → 1
     - +Y → 2, -Y → 3
     - +Z → 4, -Z → 5
  4. Add geometry group for this face
```

### BoxGeometry Face Convention

```
Index 0: +X (right face)
Index 1: -X (left face)
Index 2: +Y (top face)
Index 3: -Y (bottom face)
Index 4: +Z (front face)
Index 5: -Z (back face)
```

### Code Location

- `viewer/src/wall-generator.ts`:
  - `normalToMaterialIndex()` - Maps normal to material index
  - `reassignMaterialsByNormal()` - Rebuilds geometry groups
  - `performCSGWithMaterialArray()` - Calls reassignment after CSG

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Hole inner faces may get unexpected colors | Normal detection assigns based on dominant axis - acceptable for axis-aligned holes |
| Performance overhead per wall segment | Merged consecutive faces with same material to minimize group count |
| Non-axis-aligned faces (angled cuts) | Not applicable - all walls are axis-aligned in current implementation |

## Open Questions

None - implementation complete.

