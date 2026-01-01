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

The DSL SHALL support a `config` block for global rendering defaults, including theme selection, font configuration, display toggles, and both camelCase and snake_case property naming.

#### Scenario: Config block with wall thickness
- **WHEN** user writes `config { wall_thickness: 0.5 }`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** the wall thickness value SHALL be available for rendering

#### Scenario: Config block with multiple properties
- **WHEN** user writes `config { wall_thickness: 0.3, door_width: 1.0 }`
- **THEN** the parser SHALL accept multiple property definitions
- **AND** all properties SHALL be available for rendering

#### Scenario: Config block with theme
- **WHEN** user writes `config { theme: dark, wallThickness: 0.3 }`
- **THEN** the parser SHALL accept the theme property
- **AND** the dark theme SHALL be applied to rendering

#### Scenario: Config block with darkMode
- **WHEN** user writes `config { darkMode: true }`
- **THEN** the parser SHALL accept the boolean darkMode property
- **AND** the dark theme SHALL be applied to rendering

#### Scenario: Config block with font configuration
- **WHEN** user writes `config { fontFamily: "Helvetica", fontSize: 12 }`
- **THEN** the parser SHALL accept string and number values
- **AND** font settings SHALL be applied to text elements

#### Scenario: Config block with display toggles
- **WHEN** user writes `config { showLabels: true, showDimensions: false }`
- **THEN** the parser SHALL accept boolean property values
- **AND** labels SHALL be shown while dimensions are hidden

#### Scenario: All config properties together (camelCase)
- **WHEN** user writes:
  ```
  config { 
    theme: blueprint,
    darkMode: false,
    wallThickness: 0.3,
    fontFamily: "Roboto",
    fontSize: 12,
    showLabels: true,
    showDimensions: true,
    defaultUnit: m
  }
  ```
- **THEN** the parser SHALL accept all property types together
- **AND** all properties SHALL be correctly applied to rendering

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

### Requirement: Dimension Units

The DSL SHALL support specifying dimensions with explicit length units for improved clarity and real-world scale representation.

#### Scenario: Dimension with meters

- **WHEN** a user defines `room Bedroom at (0,0) size (4m x 3m) walls [...]`
- **THEN** the parser SHALL accept `m` as a valid unit
- **AND** the room size SHALL be interpreted as 4 meters by 3 meters

#### Scenario: Dimension with feet

- **WHEN** a user defines `room Bedroom at (0,0) size (12ft x 10ft) walls [...]`
- **THEN** the parser SHALL accept `ft` as a valid unit
- **AND** the room size SHALL be interpreted as 12 feet by 10 feet

#### Scenario: Dimension with centimeters

- **WHEN** a user defines `room Closet at (0,0) size (150cm x 200cm) walls [...]`
- **THEN** the parser SHALL accept `cm` as a valid unit
- **AND** the room size SHALL be interpreted as 150 centimeters by 200 centimeters

#### Scenario: Dimension with inches

- **WHEN** a user defines `room Cabinet at (0,0) size (36in x 24in) walls [...]`
- **THEN** the parser SHALL accept `in` as a valid unit
- **AND** the room size SHALL be interpreted as 36 inches by 24 inches

#### Scenario: Dimension with millimeters

- **WHEN** a user defines `room TinySpace at (0,0) size (500mm x 300mm) walls [...]`
- **THEN** the parser SHALL accept `mm` as a valid unit
- **AND** the room size SHALL be interpreted as 500 millimeters by 300 millimeters

### Requirement: Coordinate Units

The DSL SHALL support specifying coordinates with explicit length units.

#### Scenario: Coordinate with meters

- **WHEN** a user defines `room Kitchen at (5m, 10m) size (4m x 3m) walls [...]`
- **THEN** the parser SHALL accept units in coordinate values
- **AND** the position SHALL be interpreted as 5 meters, 10 meters

#### Scenario: Coordinate with feet

- **WHEN** a user defines `room Kitchen at (15ft, 20ft) size (12ft x 10ft) walls [...]`
- **THEN** the parser SHALL accept `ft` as a valid unit in coordinates
- **AND** the position SHALL be interpreted as 15 feet, 20 feet

### Requirement: Gap Units

The DSL SHALL support specifying gap values with explicit length units in relative positioning.

#### Scenario: Gap with meters

- **WHEN** a user defines `room Pantry size (2m x 2m) right-of Kitchen gap 0.5m walls [...]`
- **THEN** the parser SHALL accept unit in gap value
- **AND** the gap SHALL be interpreted as 0.5 meters

#### Scenario: Gap with feet

- **WHEN** a user defines `room Pantry size (6ft x 6ft) right-of Kitchen gap 2ft walls [...]`
- **THEN** the parser SHALL accept `ft` as a valid unit in gap
- **AND** the gap SHALL be interpreted as 2 feet

### Requirement: Height and Elevation Units

The DSL SHALL support specifying height and elevation with explicit length units.

#### Scenario: Room height with meters

- **WHEN** a user defines `room Kitchen at (0,0) size (4m x 3m) height 2.8m walls [...]`
- **THEN** the parser SHALL accept unit in height value
- **AND** the height SHALL be interpreted as 2.8 meters

#### Scenario: Room elevation with feet

- **WHEN** a user defines `room Loft at (0,0) size (10ft x 10ft) elevation 8ft walls [...]`
- **THEN** the parser SHALL accept unit in elevation value
- **AND** the elevation SHALL be interpreted as 8 feet

### Requirement: Supported Length Units

The DSL SHALL support the following length units:

| Unit | Symbol | Conversion to Meters |
|------|--------|---------------------|
| Meters | `m` | 1.0 |
| Feet | `ft` | 0.3048 |
| Centimeters | `cm` | 0.01 |
| Inches | `in` | 0.0254 |
| Millimeters | `mm` | 0.001 |

#### Scenario: All units recognized

- **WHEN** any spatial value uses `m`, `ft`, `cm`, `in`, or `mm`
- **THEN** the parser SHALL recognize each as a valid unit symbol

### Requirement: Default Unit Configuration

The DSL SHALL support a `default_unit` configuration property to specify the unit for unit-less values.

#### Scenario: Config with default unit

- **WHEN** a floorplan defines `config { default_unit: ft }`
- **AND** a room is defined with `size (10 x 8)` (no explicit unit)
- **THEN** the values SHALL be interpreted as 10 feet by 8 feet

#### Scenario: Default unit applies to all spatial values

- **GIVEN** `config { default_unit: m }` is defined
- **WHEN** a room uses `at (5, 10) size (4 x 3) height 2.8`
- **THEN** position SHALL be (5m, 10m)
- **AND** size SHALL be (4m x 3m)
- **AND** height SHALL be 2.8m

#### Scenario: Explicit unit overrides default

- **GIVEN** `config { default_unit: m }` is defined
- **WHEN** a room uses `size (10ft x 8ft)`
- **THEN** the explicit `ft` unit SHALL override the default
- **AND** size SHALL be interpreted as 10 feet by 8 feet

#### Scenario: Invalid default unit rejected

- **WHEN** a floorplan defines `config { default_unit: xyz }`
- **THEN** the system SHALL report a validation error
- **AND** the error SHALL list valid unit options

### Requirement: System Default Unit

The system SHALL use a system-wide default unit (defined in `viewer/src/constants.ts`) when no `default_unit` is configured.

#### Scenario: No config uses system default

- **GIVEN** no `config { default_unit: ... }` is defined
- **AND** system default is `m` (meters)
- **WHEN** a room uses `size (10 x 8)` (no explicit unit)
- **THEN** the values SHALL be interpreted using the system default unit

#### Scenario: System default documented in constants

- **WHEN** `viewer/src/constants.ts` is inspected
- **THEN** it SHALL contain a `DEFAULT_UNIT` constant
- **AND** the constant SHALL be one of the supported unit symbols

### Requirement: Unit-less Value Backward Compatibility

The DSL SHALL continue to accept values without explicit units for backward compatibility.

#### Scenario: Dimension without unit

- **WHEN** a user defines `room Kitchen at (0,0) size (10 x 8) walls [...]`
- **THEN** the parser SHALL accept the unit-less dimension
- **AND** the values SHALL use the effective default unit

#### Scenario: Coordinate without unit

- **WHEN** a user defines `room Kitchen at (5, 10) size (10 x 8) walls [...]`
- **THEN** the parser SHALL accept the unit-less coordinates
- **AND** the position SHALL use the effective default unit

#### Scenario: Gap without unit

- **WHEN** a user defines `right-of Kitchen gap 2`
- **THEN** the parser SHALL accept the unit-less gap
- **AND** the gap SHALL use the effective default unit

#### Scenario: Mixed unit and unit-less in same floorplan

- **WHEN** a floorplan contains both `size (10 x 8)` and `size (3m x 2m)`
- **THEN** the parser SHALL accept both formats
- **AND** unit-less values SHALL use the effective default unit

### Requirement: Unit Normalization

The system SHALL normalize all spatial values to a canonical internal unit (meters) before rendering calculations.

#### Scenario: Feet converted to meters for rendering

- **GIVEN** a room defined with `size (10ft x 10ft)`
- **WHEN** the floorplan is rendered
- **THEN** the system SHALL convert to 3.048m x 3.048m internally
- **AND** the rendered size SHALL reflect this conversion

#### Scenario: Mixed units normalized consistently

- **GIVEN** room A with `size (3m x 4m)` and room B with `size (10ft x 12ft)`
- **WHEN** rooms are positioned with `right-of` relationship
- **THEN** both rooms SHALL be normalized to meters before position calculation
- **AND** gap spacing SHALL use the same normalized units

#### Scenario: Coordinates and dimensions normalized together

- **GIVEN** `config { default_unit: ft }` is defined
- **AND** room A at `(0, 0) size (10 x 10)`
- **AND** room B with `right-of A gap 3`
- **WHEN** positions are calculated
- **THEN** all values SHALL be normalized to meters before calculation

### Requirement: Variable Definitions with Units

The DSL SHALL support units in variable definitions.

#### Scenario: Define variable with unit

- **WHEN** a user defines `define master_bed (15ft x 12ft)`
- **THEN** the parser SHALL accept the unit in the definition
- **AND** references to `master_bed` SHALL include the unit information

#### Scenario: Variable reference preserves units

- **GIVEN** `define small_room (3m x 3m)` is defined
- **WHEN** a room uses `size small_room`
- **THEN** the room SHALL have the dimensions 3m x 3m with unit information preserved

#### Scenario: Unit-less variable uses default unit

- **GIVEN** `config { default_unit: ft }` is defined
- **AND** `define standard (10 x 10)` is defined (no unit)
- **WHEN** a room uses `size standard`
- **THEN** the room SHALL have the dimensions 10ft x 10ft

### Requirement: Unit Consistency Warning

The system SHALL emit a warning when different unit systems are mixed within a floorplan.

#### Scenario: Mixing metric and imperial units

- **GIVEN** a floorplan with room A using `size (3m x 4m)`
- **AND** room B using `size (10ft x 12ft)`
- **WHEN** the floorplan is validated
- **THEN** the system SHALL emit a warning about mixed unit systems
- **AND** the warning SHALL be non-blocking (rendering proceeds)

#### Scenario: Consistent units no warning

- **GIVEN** a floorplan where all rooms use metric units (`m`, `cm`, `mm`)
- **WHEN** the floorplan is validated
- **THEN** no unit consistency warning SHALL be emitted

#### Scenario: Unit-less values do not trigger warning

- **GIVEN** a floorplan with all unit-less values
- **WHEN** the floorplan is validated
- **THEN** no unit consistency warning SHALL be emitted

### Requirement: Connection Size Specification

The DSL SHALL support an optional `size` attribute on connections to specify door/opening dimensions, overriding global config defaults.

#### Scenario: Connection with explicit size

- **GIVEN** a connection between two rooms
- **WHEN** the user specifies `connect Room1.bottom to Room2.top door at 50% size (3ft x 7ft)`
- **THEN** the door SHALL be rendered with width 3ft and height 7ft
- **AND** the size SHALL override any `door_size` or `door_width`/`door_height` config values

#### Scenario: Connection with full height

- **GIVEN** a connection between two rooms where Room1 has height 10ft
- **WHEN** the user specifies `connect Room1.bottom to Room2.top opening at 50% size (4ft x full)`
- **THEN** the opening SHALL be rendered with width 4ft and height equal to the room height
- **AND** the opening SHALL extend from floor to ceiling

#### Scenario: Connection size with only width specified

- **GIVEN** a connection between two rooms
- **WHEN** the user specifies `connect Room1.left to Room2.right door at 50% size (2.5ft x 7ft)`
- **THEN** the door SHALL use the specified width 2.5ft
- **AND** the door SHALL use the specified height 7ft

### Requirement: Config Size Properties

The DSL SHALL support `door_size` and `window_size` config properties using the `Dimension` type `(width x height)`.

#### Scenario: door_size in config

- **GIVEN** a floor with config `door_size: (3 x 7)`
- **WHEN** a connection is defined without explicit size
- **THEN** the connection SHALL use width=3 and height=7 from config
- **AND** the values SHALL use the floor's `default_unit`

#### Scenario: window_size in config

- **GIVEN** a floor with config `window_size: (4 x 3)` and a room with `walls [left: window]`
- **WHEN** the window is rendered without explicit size
- **THEN** the window SHALL use width=4 and height=3 from config

#### Scenario: Backward compatibility with width/height

- **GIVEN** a floor with config `door_width: 3, door_height: 7`
- **WHEN** no `door_size` is specified
- **THEN** the system SHALL use door_width and door_height values
- **AND** no deprecation warning SHALL be emitted (backward compatible)

#### Scenario: door_size takes precedence

- **GIVEN** a floor with config `door_size: (3 x 7), door_width: 4`
- **WHEN** a connection is rendered
- **THEN** the system SHALL use door_size values (width=3, height=7)
- **AND** the system MAY emit a warning about conflicting properties

### Requirement: Full Height Keyword

The DSL SHALL support the keyword `full` as a height value in connection size specification, indicating the opening extends to the ceiling.

#### Scenario: Full height opening in 3D viewer

- **GIVEN** a room with height 3.35m
- **WHEN** a connection specifies `size (4ft x full)`
- **THEN** the 3D viewer SHALL cut a hole from floor to ceiling (height=3.35m)
- **AND** no lintel or header SHALL be rendered above the opening

#### Scenario: Full height with door type

- **GIVEN** a connection with `door at 50% size (3ft x full)`
- **WHEN** the door is rendered
- **THEN** the door frame SHALL extend to ceiling height
- **AND** a door leaf of standard height MAY be rendered with transom above

### Requirement: Size Validation

The system SHALL validate connection size dimensions against physical constraints.

#### Scenario: Size exceeds wall length

- **GIVEN** a shared wall segment of 5ft width
- **WHEN** a connection specifies `size (6ft x 7ft)`
- **THEN** the system SHALL emit a warning that size exceeds shared wall length
- **AND** rendering SHALL proceed with the specified size (may overlap)

#### Scenario: Height exceeds room height

- **GIVEN** a room with height 8ft
- **WHEN** a connection specifies `size (3ft x 10ft)`
- **THEN** the system SHALL emit a warning that height exceeds room height
- **AND** the system MAY clamp height to room height

### Requirement: Theme Selection Configuration

The DSL SHALL support a `theme` property in the config block for selecting rendering theme presets.

#### Scenario: Theme specified in config
- **WHEN** `config { theme: dark }` is defined
- **THEN** the renderer SHALL use the "dark" theme colors and styles
- **AND** all SVG elements SHALL use dark theme CSS classes

#### Scenario: Blueprint theme selection
- **WHEN** `config { theme: blueprint }` is defined
- **THEN** the renderer SHALL use blue background with light blue lines
- **AND** text elements SHALL use light colors for contrast

#### Scenario: Default theme when not specified
- **GIVEN** no `theme` property is set in config
- **WHEN** the floorplan is rendered
- **THEN** the "default" theme SHALL be applied (beige floor, black walls)

#### Scenario: Unknown theme warning
- **WHEN** `config { theme: nonexistent }` is defined
- **AND** no theme named "nonexistent" is registered
- **THEN** the system SHALL emit a validation warning about unknown theme
- **AND** rendering SHALL proceed with the default theme

### Requirement: Dark Mode Toggle

The DSL SHALL support a `darkMode` boolean property matching Mermaid.js configuration schema for quick theme switching.

#### Scenario: Dark mode enabled
- **WHEN** `config { darkMode: true }` is defined
- **THEN** the renderer SHALL use the "dark" theme preset
- **AND** this SHALL be equivalent to `config { theme: dark }`

#### Scenario: Dark mode disabled explicitly
- **WHEN** `config { darkMode: false }` is defined
- **THEN** the renderer SHALL use the default (light) theme

#### Scenario: Theme takes precedence over darkMode
- **WHEN** `config { theme: blueprint, darkMode: true }` is defined
- **THEN** the `theme` property SHALL take precedence
- **AND** the blueprint theme SHALL be applied (not dark)
- **AND** a validation warning MAY be emitted about conflicting settings

### Requirement: Naming Convention Normalization

The DSL SHALL support both camelCase (Mermaid convention) and snake_case (existing DSL convention) for configuration property names.

#### Scenario: camelCase config accepted
- **WHEN** `config { wallThickness: 0.3, fontFamily: "Roboto" }` is defined
- **THEN** the parser SHALL accept camelCase property names
- **AND** values SHALL be correctly applied to rendering

#### Scenario: snake_case config accepted (backward compatibility)
- **WHEN** `config { wall_thickness: 0.3, font_family: "Roboto" }` is defined
- **THEN** the parser SHALL accept snake_case property names
- **AND** values SHALL be correctly applied to rendering

#### Scenario: Mixed naming conventions
- **WHEN** `config { wallThickness: 0.3, door_width: 1.0 }` is defined
- **THEN** the parser SHALL accept both conventions in the same block
- **AND** all values SHALL be normalized internally to camelCase

#### Scenario: Normalization mapping
- **GIVEN** the following key mappings:
  | snake_case | camelCase |
  |------------|-----------|
  | `wall_thickness` | `wallThickness` |
  | `font_family` | `fontFamily` |
  | `font_size` | `fontSize` |
  | `show_labels` | `showLabels` |
  | `show_dimensions` | `showDimensions` |
  | `dark_mode` | `darkMode` |
- **WHEN** either naming convention is used
- **THEN** the value SHALL be accessible via the camelCase normalized key

### Requirement: Font Configuration

The DSL SHALL support `fontFamily` and `fontSize` properties in the config block for text rendering customization.

#### Scenario: Custom font family (camelCase)
- **WHEN** `config { fontFamily: "Roboto, sans-serif" }` is defined
- **THEN** all text elements (room labels, dimension annotations) SHALL use the specified font

#### Scenario: Custom font family (snake_case)
- **WHEN** `config { font_family: "Roboto, sans-serif" }` is defined
- **THEN** all text elements SHALL use the specified font

#### Scenario: Custom font size
- **WHEN** `config { fontSize: 14 }` is defined
- **THEN** the base font size SHALL be 14 (in SVG user units)

#### Scenario: Default font values
- **GIVEN** no `fontFamily` or `fontSize` is specified
- **WHEN** the floorplan is rendered
- **THEN** fontFamily SHALL default to "Arial, sans-serif"
- **AND** fontSize SHALL default to 0.8 (SVG user units)

### Requirement: Label Display Toggle

The DSL SHALL support a `showLabels` boolean property to toggle room label display.

#### Scenario: Hide room labels
- **WHEN** `config { showLabels: false }` is defined
- **THEN** room name text elements SHALL NOT be rendered in SVG output
- **AND** room size text elements SHALL NOT be rendered

#### Scenario: Show labels by default
- **GIVEN** no `showLabels` property is set in config
- **WHEN** the floorplan is rendered
- **THEN** room labels SHALL be displayed (default: true)

### Requirement: Dimension Display Toggle in Config

The DSL SHALL support a `showDimensions` boolean property in the config block to enable dimension annotations.

#### Scenario: Enable dimension annotations via config
- **WHEN** `config { showDimensions: true }` is defined
- **THEN** dimension annotation lines and values SHALL be rendered on room boundaries

#### Scenario: Dimensions disabled by default
- **GIVEN** no `showDimensions` property is set in config
- **WHEN** the floorplan is rendered
- **THEN** dimension annotations SHALL NOT be displayed (default: false)

### Requirement: YAML Frontmatter Configuration

The DSL SHALL support an optional YAML frontmatter block at the beginning of the diagram for configuration, following Mermaid.js v10.5.0+ conventions.

#### Scenario: Frontmatter with title
- **GIVEN** a floorplan with frontmatter:
  ```
  ---
  title: Villa Layout
  ---
  floorplan
    floor Ground { ... }
  ```
- **WHEN** the floorplan is parsed
- **THEN** the title "Villa Layout" SHALL be extracted as metadata

#### Scenario: Frontmatter with camelCase config (Mermaid-style)
- **GIVEN** a floorplan with frontmatter:
  ```
  ---
  config:
    theme: blueprint
    wallThickness: 0.5
    fontFamily: "Roboto"
  ---
  floorplan
    floor Ground { ... }
  ```
- **WHEN** the floorplan is parsed
- **THEN** the theme SHALL be set to "blueprint"
- **AND** wallThickness SHALL resolve to 0.5
- **AND** fontFamily SHALL be "Roboto"

#### Scenario: Frontmatter merges with inline config
- **GIVEN** a floorplan with frontmatter `config: { theme: dark }` and inline `config { theme: blueprint }`
- **WHEN** the floorplan is parsed
- **THEN** the inline config SHALL take precedence
- **AND** theme SHALL resolve to "blueprint"

#### Scenario: Frontmatter only (no inline config)
- **GIVEN** a floorplan with frontmatter config but no `config { }` block
- **WHEN** the floorplan is parsed
- **THEN** frontmatter config values SHALL be applied

### Requirement: Boolean Config Values

The DSL SHALL support boolean values (`true`, `false`) for config properties that require them.

#### Scenario: Boolean true value
- **WHEN** `config { showLabels: true }` is defined
- **THEN** the parser SHALL accept `true` as a valid boolean value

#### Scenario: Boolean false value
- **WHEN** `config { showDimensions: false }` is defined
- **THEN** the parser SHALL accept `false` as a valid boolean value

#### Scenario: Invalid boolean value
- **WHEN** `config { showLabels: yes }` is defined
- **THEN** the parser SHALL report a syntax error
- **AND** the error SHALL indicate expected `true` or `false`

