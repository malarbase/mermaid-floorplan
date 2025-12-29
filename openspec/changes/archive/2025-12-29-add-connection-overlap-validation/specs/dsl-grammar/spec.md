## ADDED Requirements

### Requirement: Connection Overlap Detection

The system SHALL detect and report errors when multiple connections would render doors at physically overlapping positions on the same wall.

#### Scenario: Bidirectional connections on shared wall

- **GIVEN** two adjacent rooms "Office" and "Kitchen" that share a wall
- **WHEN** the floorplan defines both `connect Office.right to Kitchen.left door` and `connect Kitchen.left to Office.right door`
- **THEN** the system SHALL report an error indicating overlapping bidirectional connections
- **AND** the error message SHALL identify both connection statements and the shared wall

#### Scenario: Multiple connections at same position

- **GIVEN** two rooms "LivingRoom" and "Hallway" connected by a wall
- **WHEN** the floorplan defines `connect LivingRoom.top to Hallway.bottom door at 50%` and `connect LivingRoom.top to Hallway.bottom door at 50%`
- **THEN** the system SHALL report an error indicating duplicate connections at the same position
- **AND** the error message SHALL specify the wall and position percentage

#### Scenario: Overlapping position ranges

- **GIVEN** two rooms "Bedroom" and "Bathroom" sharing a wall
- **WHEN** the floorplan defines `connect Bedroom.right to Bathroom.left door at 25%` and `connect Bedroom.right to Bathroom.left double-door at 25%`
- **THEN** the system SHALL report an error indicating overlapping connections
- **AND** the validation SHALL account for door widths when checking overlap

#### Scenario: Valid separate connections

- **GIVEN** two rooms "Office" and "Kitchen" sharing a wall
- **WHEN** the floorplan defines `connect Office.right to Kitchen.left door at 25%` and `connect Office.right to Kitchen.left door at 75%`
- **THEN** validation SHALL pass
- **AND** both doors SHALL render without overlap

#### Scenario: Connection from same room different walls

- **GIVEN** a room "Office" with connections on different walls
- **WHEN** the floorplan defines `connect Office.right to Kitchen.left door` and `connect Office.bottom to Hallway.top door`
- **THEN** validation SHALL pass (different walls cannot overlap)

### Requirement: Connection Physical Overlap Calculation

The system SHALL calculate the physical position and extent of each connection on walls to detect spatial overlaps.

#### Scenario: Calculate door position on wall

- **GIVEN** a connection `connect RoomA.right to RoomB.left door at 50%`
- **AND** RoomA's right wall is 10 units long
- **WHEN** calculating the door's physical position
- **THEN** the door center SHALL be at 5 units from the wall's start point
- **AND** the door extent SHALL include its width (e.g., 1 unit on each side for standard doors)

#### Scenario: Double-door takes more space

- **GIVEN** a connection `connect RoomA.right to RoomB.left double-door at 50%`
- **AND** RoomA's right wall is 10 units long
- **WHEN** calculating the door's physical position
- **THEN** the double-door SHALL occupy a wider extent than a single door
- **AND** overlap detection SHALL use the actual double-door width

#### Scenario: Connections too close but not overlapping

- **GIVEN** a wall that is 20 units long
- **WHEN** the floorplan defines doors at 25% and 40% positions
- **AND** the door widths plus positions do not physically overlap
- **THEN** validation SHALL pass

### Requirement: Clear Connection Overlap Error Messages

The system SHALL provide actionable error messages when connection overlaps are detected.

#### Scenario: Error message identifies specific connections

- **GIVEN** overlapping connections at line 45 and line 67 of the DSL
- **WHEN** validation detects the overlap
- **THEN** the error message SHALL reference both line numbers
- **AND** SHALL show the connection statements
- **AND** SHALL explain the overlap (e.g., "Both connections render doors at position 50% on Office.right wall")

#### Scenario: Error message suggests resolution

- **GIVEN** a bidirectional connection overlap
- **WHEN** validation fails
- **THEN** the error message SHALL suggest removing one of the connections
- **AND** MAY suggest using a different position percentage if space allows

