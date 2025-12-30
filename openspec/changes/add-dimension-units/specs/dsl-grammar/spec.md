## ADDED Requirements

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

