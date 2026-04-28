# Known gaps

Short, self‑contained write‑ups of issues we've identified but not yet
addressed. Each file is structured so that a future debugging or feature
session can pick it up without re‑deriving the context.

| File | Type | Area |
|---|---|---|
| [`ui-selection-agent-context.md`](./ui-selection-agent-context.md) | Feature | `floorplan-app` ↔ `floorplan-viewer-core` — selection (rooms, walls, stairs, lifts, connections) isn't passed as structured context to the agent. |
| [`ui-render-layer-toggles.md`](./ui-render-layer-toggles.md) | Feature | `floorplan-viewer-core` / `floorplan-viewer` / `floorplan-app` — scene builder already supports `showWalls` / `showFloors` / `showStairs` / `showLifts` / `showConnections`, but no UI exposes them; should slot into the View section alongside Theme & Exploded View. |
| [`3d-wall-network-rebuild.md`](./3d-wall-network-rebuild.md) | Architectural Debt | `floorplan-3d-core` — replace per-room wall emission with a floor-level wall graph that computes mitered intersections once, eliminating the need for adjacency-aware per-corner bookkeeping introduced by the Phase 4 Z-fighting fix. |

## Archived

| File | Type | Area | Resolution |
|---|---|---|---|
| [`archive/3d-stair-floor-holes.md`](./archive/3d-stair-floor-holes.md) | Bug | `floorplan-3d-core` / `floorplan-viewer-core` — floor slab CSG cuts the boarding/arrival landings, not just the stair run. | Closed by `consolidate-scene-build-into-core`: viewer now uses mesh-derived `Box3.setFromObject(stairOrLiftGroup)` cutouts (matching the headless renderer), and both paths share `buildFloorplanScene` from `floorplan-3d-core`. |
| [`archive/3d-wall-zfight-polygon-offset-attempt.md`](./archive/3d-wall-zfight-polygon-offset-attempt.md) | Failed Attempt | `floorplan-3d-core` / `floorplan-viewer-core` — attempted to eliminate residual Z-fighting at wall corners and shadow acne via `shadow.bias` + `polygonOffset` on horizontal wall materials. | Reverted. Tests passed (252/252) but artifacts remained visible in the viewer. `polygonOffset` is unreliable with `logarithmicDepthBuffer: true` at oblique angles. Root fix requires the wall-network rebuild. |

Conventions for new entries:

- One file per gap. Filename is kebab‑case and area‑prefixed.
- Use sections: **Symptom / Where it lives / Root cause hypotheses /
  Suggested fix shape / Acceptance criteria / Out of scope**.
- Cite code with `startLine:endLine:filepath` blocks so the next session
  can jump straight to the relevant lines.
- Cross‑link sibling gaps when they overlap (e.g. UI selection ↔ 3D
  rendering both touch stairs but are independent fixes).
