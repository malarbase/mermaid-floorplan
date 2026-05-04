## ADDED Requirements

### Requirement: Wall Network Engine

The `WallBuilder` SHALL support a `'network'` engine mode that collapses shared walls to a single mesh with per-face material assignment. The engine SHALL be opt-in via `SceneBuildOptions.wallEngine`; the default SHALL remain `'legacy'`.

#### Scenario: Default engine produces legacy output

- **GIVEN** `SceneBuildOptions` does not set `wallEngine`
- **WHEN** the scene builder renders a floor
- **THEN** wall meshes SHALL be produced by the per-room legacy path
- **AND** no `wall_edge_*` named meshes SHALL appear in the output

#### Scenario: Network engine emits single mesh per shared wall

- **GIVEN** `SceneBuildOptions.wallEngine = 'network'`
- **AND** two adjacent rooms share a wall
- **WHEN** the scene builder renders the floor
- **THEN** the shared wall SHALL be represented by exactly one `WallEdge` and one emitted mesh
- **AND** both sides of the mesh SHALL carry the correct interior wall material

#### Scenario: Network engine applies CSG holes for openings

- **GIVEN** `SceneBuildOptions.wallEngine = 'network'`
- **AND** a connection (door or window) is placed on a wall edge
- **WHEN** the scene builder renders the floor
- **THEN** the wall mesh SHALL have a CSG hole cut at the connection position
- **AND** door panels or window glass SHALL be placed by `connection-geometry.ts`

#### Scenario: Network engine handles T-junctions

- **GIVEN** `SceneBuildOptions.wallEngine = 'network'`
- **AND** a corridor room abuts the middle of a longer room's wall (T-junction)
- **WHEN** the scene builder renders the floor
- **THEN** the longer wall SHALL be split at the T-junction node
- **AND** all resulting edge meshes SHALL tile without gaps

#### Scenario: Network engine parity with legacy for simple plans

- **GIVEN** a single-floor plan with three rooms connected by doors
- **WHEN** the scene is built first with `wallEngine = 'legacy'` and then with `wallEngine = 'network'`
- **THEN** the bounding boxes of the resulting wall mesh groups SHALL match within floating-point tolerance
- **AND** the total triangle count SHALL be within an acceptable delta

#### Scenario: Engine switch is idempotent within a scene build

- **GIVEN** `SceneBuildOptions.wallEngine = 'network'`
- **WHEN** `generateFloorWalls` is called twice for the same floor within one scene build
- **THEN** the second call SHALL be a no-op (network is cached)
- **AND** no duplicate meshes SHALL appear in the walls group
