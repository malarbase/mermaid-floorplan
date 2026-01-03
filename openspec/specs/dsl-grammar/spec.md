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

### Requirement: Grammar Version Declaration

The DSL SHALL support an optional version declaration to specify which grammar version the floorplan was authored for.

#### Scenario: YAML frontmatter version declaration

- **GIVEN** a floorplan file starting with YAML frontmatter
- **WHEN** the frontmatter contains `version: "1.0"`
- **THEN** the parser SHALL use grammar version 1.0 rules
- **AND** the version SHALL be accessible in the parsed AST

#### Scenario: Inline directive version declaration

- **GIVEN** a floorplan file starting with `%%{version: 1.0}%%`
- **WHEN** the file is parsed
- **THEN** the parser SHALL use grammar version 1.0 rules
- **AND** the directive SHALL be consumed (not passed to diagram content)

#### Scenario: No version declaration

- **GIVEN** a floorplan file without any version declaration
- **WHEN** the file is parsed
- **THEN** the parser SHALL assume the current (latest) grammar version
- **AND** a warning SHALL be emitted recommending explicit version declaration

### Requirement: Semantic Versioning

The grammar SHALL follow semantic versioning (MAJOR.MINOR.PATCH) where:
- MAJOR: Breaking changes that remove or alter existing syntax
- MINOR: New features that are backward compatible
- PATCH: Bug fixes and clarifications

#### Scenario: Major version breaking change

- **GIVEN** grammar version 2.0 removes the `door_width` config property
- **WHEN** a file declares `version: "2.0"` and uses `door_width`
- **THEN** the parser SHALL emit an error
- **AND** the error message SHALL reference the migration path

#### Scenario: Minor version new feature

- **GIVEN** grammar version 1.1 adds the `size` attribute to connections
- **WHEN** a file declares `version: "1.0"` and uses connection size
- **THEN** the parser SHALL accept the syntax (minor versions are backward compatible within major)

#### Scenario: Patch version compatibility

- **GIVEN** grammar versions 1.0.0 and 1.0.1
- **WHEN** a file declares `version: "1.0"` (without patch)
- **THEN** the parser SHALL use the latest patch version (1.0.1)

### Requirement: Deprecation Warnings

The system SHALL emit deprecation warnings for features scheduled for removal in a future major version.

#### Scenario: Using deprecated feature

- **GIVEN** `door_width` is deprecated in favor of `door_size`
- **WHEN** a floorplan uses `door_width` in config
- **THEN** the system SHALL emit a warning indicating deprecation
- **AND** the warning SHALL specify the replacement (`door_size`)
- **AND** the warning SHALL specify when it becomes an error (version 2.0)

#### Scenario: Deprecated feature in older version file

- **GIVEN** a file declares `version: "1.0"`
- **AND** `door_width` is deprecated in 1.1 for removal in 2.0
- **WHEN** the file is parsed
- **THEN** a deprecation warning SHALL still be emitted
- **AND** parsing SHALL succeed (feature still valid in 1.x)

### Requirement: Version Compatibility Validation

The system SHALL validate version declarations against supported grammar versions.

#### Scenario: Unsupported future version

- **GIVEN** the current grammar version is 1.2.0
- **WHEN** a file declares `version: "2.0"`
- **THEN** the parser SHALL emit an error
- **AND** the error SHALL indicate the maximum supported version

#### Scenario: Unsupported old version

- **GIVEN** grammar versions prior to 1.0 are not supported
- **WHEN** a file declares `version: "0.9"`
- **THEN** the parser SHALL emit an error
- **AND** the error SHALL recommend upgrading to a supported version

### Requirement: Migration Support

The system SHALL provide tooling to migrate floorplan files between grammar versions.

#### Scenario: Migrate command updates syntax

- **GIVEN** a floorplan file using `door_width: 3, door_height: 7`
- **WHEN** the user runs `floorplan migrate file.floorplan --to 2.0`
- **THEN** the file SHALL be updated to use `door_size: (3 x 7)`
- **AND** the version declaration SHALL be updated to `version: "2.0"`

#### Scenario: Dry run mode

- **GIVEN** a floorplan file requiring migration
- **WHEN** the user runs `floorplan migrate file.floorplan --to 2.0 --dry-run`
- **THEN** the system SHALL display proposed changes
- **AND** the file SHALL NOT be modified

#### Scenario: Migration preserves semantics

- **GIVEN** a valid floorplan file in version 1.0
- **WHEN** migrated to version 2.0
- **THEN** the rendered output (SVG/3D) SHALL be identical
- **AND** no functional changes SHALL occur

### Requirement: Version in Export

The grammar version SHALL be included in exported formats.

#### Scenario: JSON export includes version

- **GIVEN** a floorplan file with `version: "1.0"`
- **WHEN** exported to JSON
- **THEN** the JSON SHALL include `"grammarVersion": "1.0"`

#### Scenario: SVG includes version metadata

- **GIVEN** a floorplan file with `version: "1.0"`
- **WHEN** rendered to SVG
- **THEN** the SVG SHALL include version in metadata or comments

### Requirement: Stair Element Definition
The DSL SHALL support a `stair` element type within floors for defining vertical circulation via stairs.

#### Scenario: Basic straight stair
- **WHEN** a user defines `stair MainStair shape straight direction north rise 10ft width 3.5ft`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** the stair SHALL be available for rendering with the specified dimensions

#### Scenario: Stair with position
- **WHEN** a user defines `stair Lobby at (10, 20) shape straight direction south rise 9ft width 4ft`
- **THEN** the stair SHALL be positioned at coordinates (10, 20)

#### Scenario: Stair with relative position
- **WHEN** a user defines `stair BackStair shape straight direction north rise 9ft width 3ft right-of Kitchen`
- **THEN** the stair SHALL be positioned relative to the Kitchen room

### Requirement: Stair Shape Presets
The DSL SHALL support preset stair shapes for common configurations.

#### Scenario: L-shaped stair
- **WHEN** a user defines `stair CornerStair shape L-shaped entry south turn left runs 6, 6 rise 10ft width 3.5ft`
- **THEN** the parser SHALL accept this as a two-flight stair with one 90° turn
- **AND** the stair SHALL have 6 steps before and 6 steps after the landing

#### Scenario: U-shaped stair
- **WHEN** a user defines `stair ServiceStair shape U-shaped entry east turn right runs 8, 8 rise 12ft width 3ft`
- **THEN** the parser SHALL accept this as a two-flight stair with one 180° turn

#### Scenario: Double-L stair (three flights)
- **WHEN** a user defines `stair ThreeFlightStair shape double-L entry south turn right runs 5, 6, 5 rise 14ft width 3.5ft`
- **THEN** the parser SHALL accept this as a three-flight stair with two 90° turns
- **AND** the stair SHALL have runs of 5, 6, and 5 steps respectively

#### Scenario: Spiral stair
- **WHEN** a user defines `stair TowerSpiral shape spiral rotation clockwise outer-radius 4ft rise 10ft`
- **THEN** the parser SHALL accept this as a helical stair
- **AND** the stair SHALL use the specified outer radius

#### Scenario: Winder stair
- **WHEN** a user defines `stair CompactStair shape winder entry west turn right winders 3 runs 4, 5 rise 9ft width 2.5ft`
- **THEN** the parser SHALL accept this as a stair with triangular winder treads at the corner

### Requirement: Custom Segmented Stair
The DSL SHALL support a composable `custom` shape using flight and turn segments for arbitrary stair configurations.

#### Scenario: Custom double-L via segments
- **WHEN** a user defines:
  ```
  stair CustomStair shape custom entry south [
    flight 5,
    turn right landing (4ft x 4ft),
    flight 6,
    turn right landing (4ft x 4ft),
    flight 5
  ] rise 14ft width 3.5ft
  ```
- **THEN** the parser SHALL accept this as a valid segmented stair
- **AND** the stair SHALL have three flights with two quarter landings

#### Scenario: Tower stair with winders
- **WHEN** a user defines:
  ```
  stair TowerStair shape custom entry south [
    flight 4,
    turn right winders 3,
    flight 4,
    turn right winders 3,
    flight 4,
    turn right winders 3,
    flight 4
  ] rise 16ft width 3ft
  ```
- **THEN** the parser SHALL accept this as a four-flight stair with winder corners

#### Scenario: Mixed landing and winder turns
- **WHEN** a user defines segments mixing `landing` and `winders` turns
- **THEN** the parser SHALL accept different turn types within the same stair

### Requirement: Stair Segment Wall Alignment
The DSL SHALL support aligning stair flight segments along room walls for perimeter stairs.

#### Scenario: Single flight aligned to wall
- **WHEN** a user defines `flight 5 along StairWell.south`
- **THEN** the flight's outer edge SHALL be positioned against the south wall of StairWell
- **AND** the stair width SHALL extend inward from the wall

#### Scenario: Perimeter stair along three walls
- **WHEN** a user defines:
  ```
  stair PerimeterStair shape custom entry south [
    flight 5 along StairWell.south,
    turn right landing (4ft x 4ft),
    flight 6 along StairWell.west,
    turn right landing (4ft x 4ft),
    flight 5 along StairWell.north
  ] rise 14ft width 3.5ft
  ```
- **THEN** the parser SHALL accept this as a valid perimeter stair
- **AND** each flight SHALL be positioned against its specified wall
- **AND** landings SHALL be placed at wall corners

#### Scenario: Invalid wall reference
- **GIVEN** a flight aligned to `NonExistent.south`
- **AND** no room named "NonExistent" exists
- **WHEN** the floorplan is validated
- **THEN** the system SHALL report an error about the missing room reference

### Requirement: Stair Dimensional Parameters
The DSL SHALL support dimensional parameters for building code compliance.

#### Scenario: Explicit riser and tread
- **WHEN** a user defines `stair MainStair shape straight direction north rise 9ft width 3.5ft riser 7in tread 11in`
- **THEN** the stair SHALL use 7-inch risers and 11-inch treads

#### Scenario: Auto-calculated steps
- **WHEN** a user defines `stair MainStair shape straight direction north rise 9ft width 3.5ft` without riser specification
- **THEN** the system SHALL auto-calculate the number of steps to achieve compliant riser heights (≤7.75 inches)

#### Scenario: Nosing specification
- **WHEN** a user defines `stair MainStair shape straight direction north rise 9ft width 3.5ft nosing 1.25in`
- **THEN** the stair treads SHALL have 1.25-inch nosing overhang

#### Scenario: Headroom specification
- **WHEN** a user defines `stair MainStair shape straight direction north rise 9ft width 3.5ft headroom 84in`
- **THEN** the stair SHALL have 84-inch minimum headroom clearance
- **AND** this value SHALL be used for 3D rendering and validation

#### Scenario: Default headroom
- **WHEN** a user defines a stair without explicit headroom
- **THEN** the system SHALL use 80 inches (6'8") as the default headroom

### Requirement: Per-Segment Width Override
The DSL SHALL support width overrides on individual flight segments in custom stairs.

#### Scenario: Flight with custom width
- **WHEN** a user defines `flight 8 width 6ft` within a custom stair
- **THEN** that flight SHALL use 6-foot width regardless of the stair's default width

#### Scenario: Grand stair with varying widths
- **WHEN** a user defines:
  ```
  stair GrandStair shape custom entry south [
    flight 8 width 6ft,
    turn right landing (6ft x 6ft),
    flight 6 width 4ft
  ] rise 12ft width 4ft
  ```
- **THEN** the first flight SHALL be 6 feet wide
- **AND** the second flight SHALL be 4 feet wide
- **AND** the landing SHALL be 6 feet by 6 feet

### Requirement: Stringer Style Configuration
The DSL SHALL support stringer style specification for controlling riser appearance.

#### Scenario: Open stringers (floating treads)
- **WHEN** a user defines `stair ModernStair ... stringers open`
- **THEN** the stair SHALL be rendered without solid risers
- **AND** 3D rendering SHALL show visible side stringers and floating treads

#### Scenario: Closed stringers (default)
- **WHEN** a user defines `stair TraditionalStair ... stringers closed`
- **THEN** the stair SHALL be rendered with solid risers between treads

#### Scenario: Glass stringers
- **WHEN** a user defines `stair GlassStair ... stringers glass`
- **THEN** the stair SHALL be rendered with translucent/glass risers
- **AND** 3D rendering SHALL use appropriate transparent material

#### Scenario: Default stringer style
- **WHEN** a user defines a stair without explicit stringers style
- **THEN** the system SHALL default to `closed` (solid risers)

### Requirement: Building Code Compliance Configuration
The DSL SHALL support optional building code compliance validation via config.

#### Scenario: Residential code (IRC)
- **WHEN** config specifies `stair_code: residential`
- **AND** a stair has riser height greater than 7.75 inches
- **THEN** the system SHALL emit a warning about non-compliant riser height

#### Scenario: Commercial code (IBC)
- **WHEN** config specifies `stair_code: commercial`
- **AND** a stair has width less than 44 inches
- **THEN** the system SHALL emit a warning about non-compliant stair width

#### Scenario: ADA compliance
- **WHEN** config specifies `stair_code: ada`
- **AND** a stair has tread depth less than 11 inches
- **THEN** the system SHALL emit a warning about non-compliant tread depth

#### Scenario: No code validation
- **WHEN** config specifies `stair_code: none` or omits stair_code
- **THEN** no building code validation warnings SHALL be emitted

#### Scenario: Code validation is non-blocking
- **WHEN** a stair fails code validation
- **THEN** the system SHALL emit warnings
- **AND** rendering SHALL proceed (warnings are non-blocking)

### Requirement: Stair Handrail Configuration
The DSL SHALL support handrail specification for stairs.

#### Scenario: Single-side handrail
- **WHEN** a user defines `stair MainStair ... handrail (right)`
- **THEN** the stair SHALL have a handrail on the right side only

#### Scenario: Both-side handrail
- **WHEN** a user defines `stair MainStair ... handrail (both)`
- **THEN** the stair SHALL have handrails on both sides

#### Scenario: Inner/outer handrail for curved stairs
- **WHEN** a user defines `stair SpiralStair shape spiral ... handrail (outer)`
- **THEN** the spiral stair SHALL have a handrail on the outer edge only

### Requirement: Stair Direction Specification
The DSL SHALL support specifying the climb direction for stairs using view-relative terminology consistent with wall directions.

#### Scenario: View-relative direction for straight stair
- **WHEN** a user defines `shape straight toward top`
- **THEN** the stair SHALL climb toward the top of the view (equivalent to wall direction "top")

#### Scenario: View-relative direction alternatives
- **WHEN** a user defines `shape straight toward bottom`
- **THEN** the stair SHALL climb toward the bottom of the view
- **AND** `toward left` SHALL climb toward the left
- **AND** `toward right` SHALL climb toward the right

#### Scenario: Entry direction for turned stairs
- **WHEN** a user defines `shape L-shaped from bottom turn left`
- **THEN** the stair entry SHALL face the bottom of the view and turn left (climbing toward the right)

#### Scenario: Rotation direction for spiral
- **WHEN** a user defines `shape spiral rotation clockwise`
- **THEN** the spiral SHALL rotate clockwise when viewed from above

### Requirement: Stair Material Specification
The DSL SHALL support material specification for stair components.

#### Scenario: Tread and riser materials
- **WHEN** a user defines `stair MainStair ... material { tread: "oak", riser: "painted-white" }`
- **THEN** the stair SHALL have oak treads and white-painted risers for rendering

#### Scenario: Full material specification
- **WHEN** a user defines `material { tread: "marble", riser: "marble", stringer: "steel", handrail: "brass" }`
- **THEN** all stair components SHALL have their respective materials for 3D rendering

### Requirement: Lift Element Definition
The DSL SHALL support a `lift` element type for elevator shafts.

#### Scenario: Basic lift
- **WHEN** a user defines `lift MainLift at (20, 25) size (5ft x 5ft)`
- **THEN** the parser SHALL accept this as a valid lift definition
- **AND** the lift SHALL have a 5ft × 5ft footprint

#### Scenario: Lift with door specification
- **WHEN** a user defines `lift MainLift at (20, 25) size (5ft x 5ft) doors (top, bottom)`
- **THEN** the lift SHALL have door openings on the top and bottom sides of the lift shaft

#### Scenario: Lift with relative position
- **WHEN** a user defines `lift ServiceLift size (4ft x 4ft) right-of StairLanding`
- **THEN** the lift SHALL be positioned relative to StairLanding

#### Scenario: Lift with label and style
- **WHEN** a user defines `lift Elevator size (5ft x 5ft) label "Main Elevator" style Circulation`
- **THEN** the lift SHALL have the specified label and style for rendering

### Requirement: Vertical Connection Statement
The DSL SHALL support `vertical` statements to link circulation elements across floors.

#### Scenario: Two-floor stair connection
- **WHEN** a user defines `vertical GroundFloor.MainStair to FirstFloor.MainStair`
- **THEN** the system SHALL record a vertical link between these stair elements

#### Scenario: Multi-floor lift connection
- **WHEN** a user defines `vertical GroundFloor.Elevator to FirstFloor.Elevator to SecondFloor.Elevator`
- **THEN** the system SHALL record a chain of vertical links through all three floors

#### Scenario: Vertical connection validation
- **GIVEN** `stair MainStair` on GroundFloor at position (10, 20)
- **AND** `stair MainStair` on FirstFloor at position (10, 20)
- **WHEN** `vertical GroundFloor.MainStair to FirstFloor.MainStair` is validated
- **THEN** validation SHALL pass (positions match)

#### Scenario: Misaligned vertical connection warning
- **GIVEN** `stair MainStair` on GroundFloor at position (10, 20)
- **AND** `stair MainStair` on FirstFloor at position (15, 20)
- **WHEN** `vertical GroundFloor.MainStair to FirstFloor.MainStair` is validated
- **THEN** the system SHALL emit a warning about position mismatch

### Requirement: Floor Element Arrays
The DSL SHALL include stairs and lifts as floor-level element arrays.

#### Scenario: Floor with rooms and stairs
- **WHEN** a user defines:
  ```
  floor GroundFloor height 12 {
    room Living at (0, 0) size (15 x 20) walls [...]
    stair MainStair at (15, 0) shape straight direction north rise 12ft width 4ft
  }
  ```
- **THEN** the parser SHALL accept both room and stair within the same floor

#### Scenario: Floor with multiple circulation elements
- **WHEN** a floor contains multiple stairs and lifts
- **THEN** the parser SHALL accept all circulation elements as valid floor children

### Requirement: Stair Dimensional Defaults
The system SHALL apply sensible defaults for stair dimensions when not explicitly specified.

#### Scenario: Default riser height calculation
- **GIVEN** a stair with `rise 9ft` but no explicit riser height
- **WHEN** the stair is processed
- **THEN** the system SHALL calculate risers to achieve ≤7.75" (residential) or ≤7" (commercial) per step

#### Scenario: Default tread depth
- **GIVEN** a stair without explicit tread specification
- **WHEN** the stair is processed
- **THEN** the system SHALL use 11 inches as the default tread depth (meets both IRC and IBC minimums)

#### Scenario: Default width
- **GIVEN** a stair without explicit width
- **WHEN** the stair is processed
- **THEN** the system SHALL use 36 inches (3 feet) as the default width

#### Scenario: Default nosing
- **GIVEN** a stair without explicit nosing
- **WHEN** the stair is processed
- **THEN** the system SHALL use 1 inch as the default nosing overhang

### Requirement: Building Code Reference Table
The system SHALL validate against the following building code parameters:

| Parameter | Residential (IRC) | Commercial (IBC) | ADA |
|-----------|-------------------|------------------|-----|
| Max Riser Height | 7.75" (196mm) | 7" (178mm) | 7" (178mm) |
| Min Tread Depth | 10" (254mm) | 11" (279mm) | 11" (279mm) |
| Min Width | 36" (914mm) | 44" (1118mm) | 48" (1219mm) |
| Min Headroom | 80" (2032mm) | 80" (2032mm) | 80" (2032mm) |
| Max Nosing | 1.25" (32mm) | 1.25" (32mm) | 1.5" (38mm) |

#### Scenario: Residential validation thresholds
- **WHEN** `stair_code: residential` is configured
- **THEN** the system SHALL warn if riser > 7.75" or tread < 10" or width < 36"

#### Scenario: Commercial validation thresholds
- **WHEN** `stair_code: commercial` is configured
- **THEN** the system SHALL warn if riser > 7" or tread < 11" or width < 44"

#### Scenario: ADA validation thresholds
- **WHEN** `stair_code: ada` is configured
- **THEN** the system SHALL warn if riser > 7" or tread < 11" or width < 48"

### Requirement: View Direction Terminal
The DSL grammar SHALL define a `ViewDirection` terminal with values `top`, `bottom`, `left`, `right` for stair and lift orientation.

#### Scenario: ViewDirection in grammar
- **WHEN** the grammar is parsed
- **THEN** `ViewDirection` SHALL be defined as `'top' | 'bottom' | 'left' | 'right'`
- **AND** this SHALL be distinct from `WallDirection` (used for wall specifications)
- **AND** `ViewDirection` SHALL be used with prepositions `toward` and `from` for semantic clarity

### Requirement: Stair Direction Prepositions
The DSL SHALL use the preposition `toward` for climb direction and `from` for entry direction to semantically distinguish movement from position.

#### Scenario: Toward preposition for climb direction
- **WHEN** a user defines a straight stair
- **THEN** the syntax SHALL be `shape straight toward <ViewDirection>`
- **AND** "toward" indicates the direction of ascent

#### Scenario: From preposition for entry direction
- **WHEN** a user defines a turned stair (L-shaped, U-shaped, etc.)
- **THEN** the syntax SHALL be `shape <type> from <ViewDirection> turn <left|right>`
- **AND** "from" indicates where the user enters the stair

