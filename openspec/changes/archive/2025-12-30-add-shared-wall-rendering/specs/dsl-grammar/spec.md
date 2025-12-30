# dsl-grammar Specification Delta

## ADDED Requirements

### Requirement: Shared Wall Conflict Detection
The system SHALL detect and warn about conflicting configurations on shared walls between adjacent rooms.

#### Scenario: Wall type mismatch warning
- **GIVEN** Room A at (0, 0) with `right: solid`
- **AND** Room B at (10, 0) with `left: window`
- **WHEN** the floorplan is validated
- **THEN** the system SHALL emit a warning indicating wall type mismatch
- **AND** the warning SHALL identify both rooms and their conflicting wall types
- **AND** rendering SHALL proceed (warning is non-blocking)

#### Scenario: Wall type match passes silently
- **GIVEN** Room A at (0, 0) with `right: solid`
- **AND** Room B at (10, 0) with `left: solid`
- **WHEN** the floorplan is validated
- **THEN** no wall type warning SHALL be emitted

#### Scenario: Open wall type compatibility
- **GIVEN** Room A at (0, 0) with `right: open`
- **AND** Room B at (10, 0) with `left: open`
- **WHEN** the floorplan is validated
- **THEN** no wall type warning SHALL be emitted
- **AND** neither room renders a wall at that boundary

#### Scenario: Open vs solid wall mismatch
- **GIVEN** Room A at (0, 0) with `right: open`
- **AND** Room B at (10, 0) with `left: solid`
- **WHEN** the floorplan is validated
- **THEN** the system SHALL emit a warning about wall type mismatch
- **AND** the warning SHALL explain that one room expects open space while the other has a wall

### Requirement: Wall Height Mismatch Detection
The system SHALL detect and warn when adjacent rooms have different wall heights at shared boundaries.

#### Scenario: Height mismatch warning
- **GIVEN** Room A at (0, 0) with height 3.0
- **AND** Room B at (10, 0) with height 4.0
- **AND** the rooms share a wall
- **WHEN** the floorplan is validated
- **THEN** the system SHALL emit a warning indicating height mismatch
- **AND** the warning SHALL include both room names and their heights
- **AND** rendering SHALL proceed using each room's specified height

#### Scenario: Matching heights pass silently
- **GIVEN** Room A at (0, 0) with height 3.0
- **AND** Room B at (10, 0) with height 3.0
- **AND** the rooms share a wall
- **WHEN** the floorplan is validated
- **THEN** no height mismatch warning SHALL be emitted

#### Scenario: Default heights are compared
- **GIVEN** Room A at (0, 0) with no explicit height (uses default 3.35)
- **AND** Room B at (10, 0) with explicit height 4.0
- **AND** the rooms share a wall
- **WHEN** the floorplan is validated
- **THEN** the system SHALL emit a warning comparing 3.35 vs 4.0

### Requirement: Clear Shared Wall Warning Messages
The system SHALL provide actionable warning messages for shared wall conflicts.

#### Scenario: Warning identifies shared boundary
- **GIVEN** a wall type mismatch between Room A and Room B
- **WHEN** the warning is generated
- **THEN** the message SHALL specify which walls are in conflict (e.g., "A.right and B.left")
- **AND** SHALL explain the conflict type

#### Scenario: Warning suggests resolution
- **GIVEN** a wall type mismatch (solid vs window)
- **WHEN** the warning is generated
- **THEN** the message MAY suggest making wall types consistent
- **OR** using a connection statement if a door/window is intended

