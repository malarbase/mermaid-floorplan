## ADDED Requirements

### Requirement: Connection Floor Attribution

Every `JsonConnection` emitted by the converter SHALL carry a `floorId` field identifying the floor the connection belongs to. The scene builder SHALL use `floorId` to partition connections per floor rather than inferring floor membership from room name sets.

#### Scenario: Intra-floor connection carries floorId

- **GIVEN** a floorplan with floors `ground` and `first`, each containing rooms
- **WHEN** a `connect` statement links two rooms on the same floor
- **THEN** the emitted `JsonConnection` SHALL have `floorId` set to that floor's id
- **AND** `JsonFloor.connections` for that floor SHALL contain the connection

#### Scenario: Exterior connection anchors to the non-outside floor

- **GIVEN** a `connect outside.front to LivingRoom.top` statement where `LivingRoom` is on floor `ground`
- **WHEN** the converter emits the connection
- **THEN** the `JsonConnection.floorId` SHALL be `ground`
- **AND** `JsonFloor.connections` for `ground` SHALL include the connection

#### Scenario: Cross-floor connection anchors to fromRoom floor

- **GIVEN** a `connect GroundBed.right to FirstBed.left` statement where the rooms are on different floors
- **WHEN** the converter emits the connection
- **THEN** `JsonConnection.floorId` SHALL be the floor of `GroundBed` (the `fromRoom`)

#### Scenario: Scene builder uses floorId to filter connections

- **GIVEN** a multi-floor `JsonExport` where connections have `floorId` populated
- **WHEN** the scene builder renders a floor
- **THEN** only connections whose `floorId` matches the floor id SHALL be passed to the wall builder
- **AND** connections belonging to other floors SHALL NOT appear in the rendered floor's wall network

#### Scenario: Scene builder falls back gracefully for legacy exports

- **GIVEN** a `JsonExport` where `JsonConnection.floorId` is absent (externally constructed)
- **WHEN** the scene builder renders a floor
- **THEN** it SHALL fall back to the legacy `fromRoom`-name-set lookup
- **AND** wall rendering SHALL produce the same output as before `floorId` was introduced

### Requirement: Cross-floor Connection Warning

The validator SHALL emit a `warning` diagnostic when a `connect` statement spans rooms on different floors.

#### Scenario: Connect links rooms on different floors

- **GIVEN** a `connect GroundRoom.right to FirstRoom.left` where `GroundRoom` is on `ground` and `FirstRoom` is on `first`
- **WHEN** the validator runs
- **THEN** a `warning` diagnostic SHALL be attached to the `connect` node
- **AND** the message SHALL reference both floor names and recommend the `vertical` form

#### Scenario: Valid intra-floor connect does not warn

- **GIVEN** a `connect LivingRoom.right to Kitchen.left` where both rooms are on the same floor
- **WHEN** the validator runs
- **THEN** no cross-floor warning SHALL be emitted for that connection

#### Scenario: Exterior connection does not warn

- **GIVEN** a `connect outside.front to Hallway.top` statement
- **WHEN** the validator runs
- **THEN** no cross-floor warning SHALL be emitted
