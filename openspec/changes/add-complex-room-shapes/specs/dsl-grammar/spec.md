## ADDED Requirements

### Requirement: Polygon Rooms
The DSL SHALL support defining rooms by a list of vertex coordinates.

#### Scenario: Polygon definition
- **WHEN** `room Angled polygon [(0,0), (10,0), (12,5), (0,5)]` is defined
- **THEN** a room with that specific shape is generated

### Requirement: Composite Rooms
The DSL SHALL support defining rooms as a union or difference of other shapes.

#### Scenario: L-shaped room
- **WHEN** `room Living shape union(rect(12x20), rect(8x8) at (12,0))` is defined
- **THEN** a single L-shaped floor mesh is generated

### Requirement: Door Connections on Complex Shapes
The rendering engine SHALL support door placement on any wall segment of a complex-shaped room where an overlapping segment exists with an adjacent room.

#### Scenario: L-shaped wrap-around enables door
- **GIVEN** `Lobby` is a rectangular room at (0, 22) size 13x10
- **AND** `Terrace` is defined as `shape union(rect(20x40) at (0,10), rect(12x10) at (-7,0))`
- **AND** `Terrace` is positioned such that its left arm shares y-coordinates with `Lobby`
- **WHEN** `connect Lobby.right to Terrace.left door at 50%` is specified
- **THEN** a door is rendered on the overlapping wall segment

