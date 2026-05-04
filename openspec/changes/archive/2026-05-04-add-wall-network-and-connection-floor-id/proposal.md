## Why

The 3D scene builder previously identified per-floor connections through an ad-hoc `fromRoom`-name lookup: it built a `Set` of room names on the current floor and filtered the flat `connections` array against it. This approach broke silently for exterior connections and cross-floor `connect` statements, and made it impossible to efficiently attribute a connection to its floor from any consumer other than the renderer.

Separately, wall rendering used a per-room ownership model that emitted each shared wall once per adjacent room. This produced duplicate meshes at room boundaries and made it structurally impossible to assign a single correct material to a shared wall face.

Both problems shared the same root cause: the data model lacked first-class per-floor and per-edge identity.

## What Changed

### 1. Connection floor attribution (`floorId` — Stage 1)

`JsonConnection` in both `floorplan-language` and `floorplan-3d-core` gained a `floorId: string` field that records which floor a connection belongs to.

- `json-converter.ts` builds a `roomToFloor` map (walking `floor.rooms` and recursing into `subRooms`) once per export, then populates `floorId` on every emitted `JsonConnection`. Exterior connections (`outside` endpoint) anchor to the floor of the non-`outside` room. Cross-floor connections anchor to the `fromRoom`'s floor.
- `JsonFloor.connections` was added as an optional derived per-floor view of the flat `JsonExport.connections`, pre-filtered by `floorId`. Per-floor consumers (e.g. the upcoming visibility tree) no longer have to re-partition.
- `unit-normalizer.ts` passes `floorId` through `normalizeConnection` unchanged.
- `scene-builder.ts` replaced the name-based lookup with a three-tier fallback: `floor.connections` first, then `c.floorId === floor.id`, then the legacy name set (for externally-constructed exports without `floorId`).
- A new `checkConnectionFloorConsistency` validator (severity `warning`) fires when a `connect` statement spans rooms on different floors, pointing authors at the `vertical` form. Cross-floor connections are grammatically valid but silently dropped by the renderer.

### 2. Wall network engine (Phases 1–5)

A new `wall-network.ts` module introduced a per-edge wall data model that collapses shared walls to a single `WallEdge` with two `EdgeRoomBinding` face descriptors.

- **Phase 1** — `buildWallNetwork` constructs nodes and edges from room geometry; `routeConnectionsToEdges` maps each connection to its wall edge by direction; `splitTJunctionEdges` inserts T-junction nodes so abutting walls share a vertex.
- **Phase 2** — `mitreNodes` computes per-side insets (`startCut.leftA` / `startCut.rightA`) so adjacent walls tile corner cells without gaps; the dominant/subordinate split at L-corners mirrors legacy geometry.
- **Phase 3** — `emitEdgeMesh` and `emitNetworkMeshes` build per-edge wall meshes with CSG hole subtraction for openings, attach per-side materials, and place door panels and window glass via the existing `connection-geometry.ts` helper.
- **Phase 4** — `WallBuilder` gained `setEngine('legacy' | 'network')` / `getEngine()` and a `generateFloorWalls` entry point. The default remains `'legacy'`; callers opt in via `SceneBuildOptions.wallEngine = 'network'`. A `WeakMap`-keyed `networkCache` ensures idempotent re-emission within a scene build.
- **Phase 5** — Parity tests between the two engines cover simple rooms, L-shaped corridors, T-junction rooms, multi-floor plans, exterior connections, and connections on the non-owning side of a shared wall.

## Capabilities

### New Capabilities

- Every `JsonConnection` now carries `floorId` — consumers can attribute connections to floors without re-parsing or re-walking room ASTs.
- `JsonFloor.connections` provides a ready-made per-floor view for visibility tree, headless renderer, and similar consumers.
- The network wall engine is available behind `SceneBuildOptions.wallEngine = 'network'`, enabling single-mesh shared walls and correct per-face material assignment. The engine is not yet the default.
- A new `checkConnectionFloorConsistency` validator warns authors when a `connect` statement silently spans floors.

### Modified Capabilities

- `rendering`: per-floor connection filtering is now `floorId`-based with a legacy name-lookup fallback. Behavior is unchanged for valid plans; cross-floor connections continue to be dropped silently (validator warning added).
- `3d-viewer`: `WallBuilder` engine can be switched without rebuilding the scene; `generateFloorWalls` returns the built `WallNetwork` for test introspection.
