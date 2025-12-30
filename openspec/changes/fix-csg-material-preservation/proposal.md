## Why

When CSG (Constructive Solid Geometry) operations are performed on wall segments to create door/window holes, Three.js's per-face material group assignments are destroyed. The CSG library (`three-bvh-csg`) generates new geometry with different face structures, causing all faces to render with only the first material in the array instead of their intended per-face materials.

This is particularly noticeable when:
- A shared wall segment has a door connection (e.g., HomeTheatre wall facing Lobby_2)
- The wall should show the adjacent room's color on the interior face
- After CSG subtraction for the door hole, the entire segment renders with only the owner's color

## What Changes

- Investigate alternative approaches for preserving per-face materials after CSG operations
- Potential solutions to evaluate:
  1. **Post-CSG face reassignment**: Analyze resulting geometry and reassign materials based on face normals
  2. **Pre-hole geometry split**: Split wall geometry before CSG operations to preserve material boundaries
  3. **Multi-mesh approach**: Render wall faces as separate thin meshes instead of a single BoxGeometry
  4. **CSG library alternatives**: Evaluate if other CSG libraries preserve material groups

## Impact

- Affected specs: `3d-viewer`
- Affected code: `viewer/src/wall-generator.ts`, `viewer/src/materials.ts`
- This is a **known limitation** documented for future work
- Current workaround: Wall segments without holes render correctly; segments with holes show owner's color on all faces

## Current Behavior

Wall segments with CSG holes (doors/windows):
- All faces render with the first material in the array
- The interior face does NOT show the adjacent room's color

Wall segments without CSG holes:
- Per-face materials work correctly
- Interior face shows adjacent room's color as expected

## Technical Background

Three.js `BoxGeometry` uses material index groups to assign different materials to each face:
- Index 0: +X face, Index 1: -X face
- Index 2: +Y face, Index 3: -Y face  
- Index 4: +Z face, Index 5: -Z face

When `three-bvh-csg` performs a SUBTRACTION operation:
1. The resulting geometry has completely different face topology
2. Material group indices are not preserved or remapped
3. The geometry may have hundreds of new triangles with undefined material assignments

