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

