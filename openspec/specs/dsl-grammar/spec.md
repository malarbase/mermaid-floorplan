# dsl-grammar Specification

## Purpose
Defines the floorplan DSL grammar extensions for relative positioning. Enables users to position rooms relative to other rooms (e.g., `right-of Kitchen`) instead of requiring absolute coordinates, with support for gap spacing and edge alignment.
## Requirements
### Requirement: Relative Position Clause
The DSL SHALL support an optional relative position clause for rooms that specifies position relative to another room, as an alternative to explicit `at (x,y)` coordinates.

#### Scenario: Room positioned right of another room
- **GIVEN** a floor with room "Kitchen" at explicit coordinates
- **WHEN** a user defines "Pantry" with `right-of Kitchen`
- **THEN** Pantry's left edge SHALL be placed at Kitchen's right edge
- **AND** Pantry's top edge SHALL align with Kitchen's top edge (default alignment)

#### Scenario: Room positioned below with gap
- **GIVEN** a floor with room "LivingRoom" at explicit coordinates
- **WHEN** a user defines "Basement" with `below LivingRoom gap 2`
- **THEN** Basement's top edge SHALL be placed 2 units below LivingRoom's bottom edge
- **AND** Basement's left edge SHALL align with LivingRoom's left edge (default alignment)

#### Scenario: Room positioned with explicit alignment
- **GIVEN** a floor with room "MainBedroom" of size (20 x 15) at coordinates (0, 0)
- **WHEN** a user defines "Closet" of size (5 x 8) with `right-of MainBedroom align bottom`
- **THEN** Closet's left edge SHALL be at x=20
- **AND** Closet's bottom edge SHALL align with MainBedroom's bottom edge
- **AND** Closet SHALL be at resolved position (20, 7) since 15 - 8 = 7

### Requirement: Position Direction Keywords
The DSL SHALL support the following position direction keywords:
- `right-of` - Place room to the right of reference
- `left-of` - Place room to the left of reference
- `above` - Place room above reference
- `below` - Place room below reference
- `above-right-of` - Place room above and to the right
- `above-left-of` - Place room above and to the left
- `below-right-of` - Place room below and to the right
- `below-left-of` - Place room below and to the left

#### Scenario: All cardinal directions work correctly
- **GIVEN** a floor with room "Center" at (10, 10) with size (5 x 5)
- **WHEN** rooms are defined using each cardinal direction
- **THEN** `right-of Center` SHALL resolve to (15, 10)
- **AND** `left-of Center` SHALL resolve to (x - width, 10) where x aligns left edges
- **AND** `above Center` SHALL resolve to (10, y - height) where y aligns top
- **AND** `below Center` SHALL resolve to (10, 15)

### Requirement: Gap Specification
The DSL SHALL support an optional `gap N` clause where N is a non-negative number specifying the spacing between rooms.

#### Scenario: Gap adds spacing between rooms
- **GIVEN** room "A" at (0, 0) with size (10 x 10)
- **WHEN** room "B" is defined with `right-of A gap 3`
- **THEN** B's left edge SHALL be at x = 10 + 3 = 13

#### Scenario: Default gap is zero
- **GIVEN** room "A" at (0, 0) with size (10 x 10)
- **WHEN** room "B" is defined with `right-of A` (no gap specified)
- **THEN** B's left edge SHALL be at x = 10 (flush with A's right edge)

### Requirement: Alignment Specification
The DSL SHALL support an optional `align` clause with values: `top`, `bottom`, `left`, `right`, `center`.

#### Scenario: Center alignment
- **GIVEN** room "Wide" at (0, 0) with size (20 x 10)
- **WHEN** room "Narrow" of size (10 x 5) is defined with `below Wide align center`
- **THEN** Narrow's horizontal center SHALL align with Wide's horizontal center
- **AND** Narrow SHALL be at (5, 10)

### Requirement: Position Resolution Order
The system SHALL resolve room positions in dependency order, processing rooms with explicit coordinates first, then rooms whose references are already resolved.

#### Scenario: Chain of relative positions
- **GIVEN** room "A" at (0, 0) with size (5 x 5)
- **AND** room "B" with `right-of A` and size (5 x 5)
- **AND** room "C" with `right-of B` and size (5 x 5)
- **WHEN** positions are resolved
- **THEN** A SHALL be at (0, 0)
- **AND** B SHALL be at (5, 0)
- **AND** C SHALL be at (10, 0)

### Requirement: Circular Dependency Detection
The system SHALL detect and report circular dependencies in relative positioning.

#### Scenario: Direct circular reference
- **GIVEN** room "A" with `right-of B`
- **AND** room "B" with `right-of A`
- **WHEN** positions are resolved
- **THEN** the system SHALL report an error indicating circular dependency
- **AND** the error SHALL name the rooms involved

### Requirement: Missing Reference Detection
The system SHALL detect and report missing room references in relative positioning.

#### Scenario: Reference to non-existent room
- **GIVEN** room "A" with `right-of NonExistent`
- **AND** no room named "NonExistent" exists
- **WHEN** positions are resolved
- **THEN** the system SHALL report an error indicating the missing reference
- **AND** the error SHALL include the name "NonExistent"

### Requirement: Overlap Warning
The system SHALL detect overlapping rooms after position resolution and emit a warning.

#### Scenario: Rooms overlap after resolution
- **GIVEN** room "A" at (0, 0) with size (10 x 10)
- **AND** room "B" at (5, 5) with size (10 x 10)
- **WHEN** positions are validated
- **THEN** the system SHALL emit a warning about overlapping rooms
- **AND** rendering SHALL proceed (warning is non-blocking by default)

