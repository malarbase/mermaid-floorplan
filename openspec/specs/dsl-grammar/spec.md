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

### Requirement: Variables and Defaults
The DSL SHALL support defining variables and global configuration defaults.

#### Scenario: Defining and using a dimension variable
- **WHEN** a user defines `define standard_bed (12 x 12)`
- **AND** uses `room Bed1 size standard_bed`
- **THEN** the room size is resolved to 12x12

#### Scenario: Global configuration
- **WHEN** `config { wall_thickness: 0.3 }` is defined
- **THEN** all walls without explicit thickness use 0.3

#### Scenario: Variable not defined error
- **WHEN** a room uses `room Bed1 size undefined_var`
- **AND** `undefined_var` is not defined
- **THEN** the system SHALL report an error indicating the undefined variable

#### Scenario: Multiple variables in same floorplan
- **WHEN** multiple variables are defined (`define small (5 x 5)`, `define medium (10 x 10)`)
- **AND** rooms use different variables
- **THEN** each room SHALL resolve to its respective variable value

### Requirement: Define Statement Syntax
The DSL SHALL support a `define` statement to create named dimension values.

#### Scenario: Define dimension variable
- **WHEN** user writes `define master_bed (15 x 12)`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** `master_bed` SHALL be available as a variable reference

#### Scenario: Define statement position
- **WHEN** `define` statements appear before `floor` definitions
- **THEN** the parser SHALL accept this ordering
- **AND** variables SHALL be accessible in all floors

### Requirement: Config Block Syntax
The DSL SHALL support a `config` block for global rendering defaults.

#### Scenario: Config block with wall thickness
- **WHEN** user writes `config { wall_thickness: 0.5 }`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** the wall thickness value SHALL be available for rendering

#### Scenario: Config block with multiple properties
- **WHEN** user writes `config { wall_thickness: 0.3, door_width: 1.0 }`
- **THEN** the parser SHALL accept multiple property definitions
- **AND** all properties SHALL be available for rendering

### Requirement: Style Block Definition
The DSL SHALL support defining named style blocks with material properties.

#### Scenario: Defining a style with colors
- **WHEN** `style Modern { floor_color: "#E0E0E0", wall_color: "#909090" }` is defined
- **THEN** the parser SHALL accept this as valid syntax
- **AND** the style "Modern" SHALL be available for room assignment

#### Scenario: Defining a style with textures
- **WHEN** `style Rustic { floor_texture: "textures/oak.jpg", wall_texture: "textures/brick.png" }` is defined
- **THEN** the parser SHALL accept texture URL references as valid

#### Scenario: Defining a style with PBR properties
- **WHEN** `style Glossy { roughness: 0.2, metalness: 0.8 }` is defined
- **THEN** the parser SHALL accept numeric PBR values between 0 and 1

#### Scenario: Combining all property types
- **WHEN** a style defines colors, textures, and PBR properties together
- **THEN** the parser SHALL accept all properties in any order

### Requirement: Style Property Types
The DSL SHALL support the following style properties:

| Property | Type | Description | Example |
|----------|------|-------------|---------|
| `floor_color` | Hex color | Floor fill color | `"#8B4513"` |
| `wall_color` | Hex color | Wall fill color | `"#D3D3D3"` |
| `floor_texture` | URL string | Floor texture path | `"textures/oak.jpg"` |
| `wall_texture` | URL string | Wall texture path | `"textures/plaster.png"` |
| `roughness` | Number 0-1 | PBR roughness | `0.7` |
| `metalness` | Number 0-1 | PBR metalness | `0.0` |

#### Scenario: All property types accepted
- **WHEN** a style defines all six supported properties
- **THEN** the parser SHALL accept all as valid

### Requirement: Room Style Assignment
The DSL SHALL support assigning a style to individual rooms.

#### Scenario: Room with explicit style
- **WHEN** `room Kitchen at (0,0) size (10 x 10) walls [...] style Modern` is defined
- **THEN** the Kitchen room SHALL use the "Modern" style properties for rendering

#### Scenario: Style clause position flexibility
- **WHEN** the `style` clause appears after the `label` clause
- **THEN** the parser SHALL still accept the room definition

### Requirement: Default Style Configuration
The DSL SHALL support defining a global default style via the config block.

#### Scenario: Room without style uses default
- **GIVEN** `config { default_style: Classic }` is defined
- **AND** style "Classic" is defined
- **AND** `room Office at (0,0) size (10 x 10) walls [...]` has no explicit style
- **WHEN** the floorplan is rendered
- **THEN** the Office room SHALL use the "Classic" style

#### Scenario: No default style configured
- **GIVEN** no `default_style` is set in config
- **AND** a room has no explicit style
- **WHEN** the floorplan is rendered
- **THEN** the system SHALL use built-in default colors (floor: #E0E0E0, wall: #909090)

### Requirement: Style Validation
The system SHALL validate style definitions and references at parse time.

#### Scenario: Reference to undefined style
- **WHEN** a room references `style UndefinedStyle`
- **AND** no style named "UndefinedStyle" is defined
- **THEN** the system SHALL report a validation error naming the undefined style

#### Scenario: Invalid color format
- **WHEN** a style contains `floor_color: "not-a-color"`
- **THEN** the system SHALL report a validation error indicating invalid hex format

#### Scenario: Roughness out of range
- **WHEN** a style contains `roughness: 1.5`
- **THEN** the system SHALL report a validation error that value must be between 0 and 1

#### Scenario: Duplicate style name
- **WHEN** two styles are defined with the same name
- **THEN** the system SHALL report a validation error for duplicate definition

