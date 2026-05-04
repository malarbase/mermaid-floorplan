## Stage 1 — Connection floor attribution

### 1. JSON shape

- [x] 1.1 Add `floorId?: string` to `JsonConnection` in `floorplan-3d-core/src/types.ts` with doc comment explaining fallback behavior
- [x] 1.2 Add `connections?: JsonConnection[]` to `JsonFloor` in `floorplan-3d-core/src/types.ts` as an optional per-floor derived view

### 2. Converter

- [x] 2.1 Add `buildRoomToFloorMap(floorplan)` helper in `floorplan-language/src/diagrams/floorplans/json-converter.ts` that recurses into `subRooms`
- [x] 2.2 Add `resolveConnectionFloorId(fromRoom, toRoom, roomToFloor)` helper that handles exterior (`outside`) connections and cross-floor fallback
- [x] 2.3 Populate `floorId` on every emitted `JsonConnection` during the conversion pass
- [x] 2.4 Populate `JsonFloor.connections` (derived per-floor view) alongside the flat `JsonExport.connections`

### 3. Unit normalizer

- [x] 3.1 Pass `floorId` through `normalizeConnection` in `floorplan-3d-core/src/unit-normalizer.ts`

### 4. Scene builder filter

- [x] 4.1 Add `pickFloorConnections(data, floor, rooms)` helper in `floorplan-3d-core/src/scene-builder.ts` with three-tier fallback: `floor.connections` → `c.floorId === floor.id` → legacy name-set lookup
- [x] 4.2 Replace inline filter in the `showWalls` path with `pickFloorConnections`
- [x] 4.3 Replace inline filter in the `showConnections && !showWalls` path with `pickFloorConnections`

### 5. Validator

- [x] 5.1 Add `buildRoomToFloorMap` private helper in `FloorplansValidator`
- [x] 5.2 Implement `checkConnectionFloorConsistency` (severity `warning`) for cross-floor `connect` statements
- [x] 5.3 Register `checkConnectionFloorConsistency` in `registerValidationChecks`

### 6. Tests

- [x] 6.1 Add `floorId` assertions to `floorplan-language/test/json-converter.test.ts` for intra-floor, exterior, and cross-floor connections; assert `JsonFloor.connections` partitioning
- [x] 6.2 Add `connection-floor-validator.test.ts` covering warning-fires and warning-suppressed cases
- [x] 6.3 Update `floorplan-3d-core/test/scene-builder.test.ts` fixtures to include `floorId`; assert per-floor partitioning is correct under the new filter

## Stage 2 — Wall network engine (Phases 1–5)

### Phase 1 — Network construction

- [x] 1.1 Implement `WallNode` and `WallEdge` types in `floorplan-3d-core/src/wall-network.ts`
- [x] 1.2 Implement `buildWallNetwork(floor, rooms)` — derives nodes from room corners and edges from direction pairs
- [x] 1.3 Implement `routeConnectionsToEdges(network, connections)` — maps each connection to its wall edge by `fromWall` direction
- [x] 1.4 Implement `splitTJunctionEdges(network)` — inserts T-junction nodes at abutting-wall midpoints

### Phase 2 — Mitre geometry

- [x] 2.1 Implement `mitreNodes(network, wallThickness)` — computes per-side `leftA` / `rightA` insets at each node
- [x] 2.2 Dominant/subordinate split at L-corners matches legacy flat-end-cap geometry
- [x] 2.3 T-junction edges get a flat cap on the through-wall and chevron tips on the side walls

### Phase 3 — Mesh emission

- [x] 3.1 Implement `emitEdgeMesh(edge, config, materials, wallsGroup, connectionsGroup, onWallMesh?)` with CSG hole subtraction for openings
- [x] 3.2 Implement `emitNetworkMeshes(network, config, materials, wallsGroup, connectionsGroup, onWallMesh?)` driving all edges in one pass
- [x] 3.3 Door panels and window glass placed via existing `connection-geometry.ts` helper

### Phase 4 — Engine flag and plumb-through

- [x] 4.1 Add `engine: 'legacy' | 'network'` field (default `'legacy'`) and `networkCache: WeakMap<JsonFloor, WallNetwork>` to `WallBuilder`
- [x] 4.2 Add `setEngine` / `getEngine` methods to `WallBuilder`
- [x] 4.3 Implement `generateFloorWalls(floor, connections, wallsGroup, connectionsGroup, config, onWallMesh?)` entry point on `WallBuilder`
- [x] 4.4 Add `wallEngine?: 'legacy' | 'network'` to `SceneBuildOptions` in `scene-builder.ts`
- [x] 4.5 Plumb `wallEngine` from `SceneBuildOptions` to `wallBuilder.setEngine` before per-floor rendering

### Phase 5 — Parity tests

- [x] 5.1 Add `wall-network-parity.test.ts` covering simple rooms, L-shaped corridors, T-junction rooms, multi-floor plans, exterior connections, and connections on the non-owning side
- [x] 5.2 Add `wall-network-engine.test.ts` covering `setEngine`/`getEngine`, `SceneBuildOptions.wallEngine`, and legacy-default byte-equivalence

### Supporting changes

- [x] S.1 Add `reassignMaterialsByNormal` helpers to `floorplan-3d-core/src/csg-utils.ts` for per-face material assignment post-CSG
- [x] S.2 Add `MaterialFactory` class to `floorplan-3d-core/src/materials.ts` for per-edge material set construction; cover in `materials.test.ts`
- [x] S.3 Update `floorplan-3d-core/test/wall-corner-geometry.test.ts` fixtures for new mitre geometry
- [x] S.4 Update `floorplan-3d-core/test/wall-slab-embed.test.ts` for any scene-builder fixture changes
- [x] S.5 Update `floorplan-viewer/test/unit-normalizer.test.ts` to cover `floorId` passthrough
- [x] S.6 Update `docs/gaps/README.md` to link new gap doc
- [x] S.7 Update `skills/mermaid-floorplan/scripts/_critic/rules_structural.mjs` with cross-floor connection rule
- [x] S.8 Update `skills/mermaid-floorplan/scripts/render_3d.mjs` for network-engine opt-in path
- [x] S.9 Update `examples/StairConstraints.floorplan` to demonstrate stair constraint patterns
