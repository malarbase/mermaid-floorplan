## ADDED Requirements

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

#### Scenario: Full tower stair around all four walls
- **WHEN** a user defines:
  ```
  stair TowerStair shape custom entry south [
    flight 4 along StairWell.south,
    turn right winders 3,
    flight 4 along StairWell.west,
    turn right winders 3,
    flight 4 along StairWell.north,
    turn right winders 3,
    flight 4 along StairWell.east
  ] rise 16ft width 3ft
  ```
- **THEN** the stair SHALL follow the perimeter of the StairWell room

#### Scenario: Mixed aligned and unaligned flights
- **WHEN** a user defines some flights with `along` and others without
- **THEN** aligned flights SHALL position against walls
- **AND** unaligned flights SHALL position relative to the stair's anchor point

#### Scenario: Wall alignment validation
- **GIVEN** a flight aligned to `Kitchen.south`
- **AND** the Kitchen room exists on the same floor
- **WHEN** the floorplan is validated
- **THEN** validation SHALL pass

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

#### Scenario: Landing size specification
- **WHEN** a user defines `shape L-shaped entry south turn left landing (5ft x 5ft)`
- **THEN** the landing SHALL be 5 feet by 5 feet

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

#### Scenario: Mixed default and custom widths
- **WHEN** some flights specify width and others do not
- **THEN** flights with `width` SHALL use their specified value
- **AND** flights without `width` SHALL use the stair's default width

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
The DSL SHALL support specifying the climb direction for stairs.

#### Scenario: Compass direction for straight stair
- **WHEN** a user defines `shape straight direction north`
- **THEN** the stair SHALL climb toward the north

#### Scenario: Entry direction for turned stairs
- **WHEN** a user defines `shape L-shaped entry south turn left`
- **THEN** the stair entry SHALL face south and turn left (climbing toward east)

#### Scenario: Rotation direction for spiral
- **WHEN** a user defines `shape spiral rotation clockwise`
- **THEN** the spiral SHALL rotate clockwise when viewed from above

### Requirement: Lift Element Definition
The DSL SHALL support a `lift` element type for elevator shafts.

#### Scenario: Basic lift
- **WHEN** a user defines `lift MainLift at (20, 25) size (5ft x 5ft)`
- **THEN** the parser SHALL accept this as a valid lift definition
- **AND** the lift SHALL have a 5ft × 5ft footprint

#### Scenario: Lift with door specification
- **WHEN** a user defines `lift MainLift at (20, 25) size (5ft x 5ft) doors (north, south)`
- **THEN** the lift SHALL have door openings on the north and south sides

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

### Requirement: Stair Material Specification
The DSL SHALL support material specification for stair components.

#### Scenario: Tread and riser materials
- **WHEN** a user defines `stair MainStair ... material { tread: "oak", riser: "painted-white" }`
- **THEN** the stair SHALL have oak treads and white-painted risers for rendering

#### Scenario: Full material specification
- **WHEN** a user defines `material { tread: "marble", riser: "marble", stringer: "steel", handrail: "brass" }`
- **THEN** all stair components SHALL have their respective materials for 3D rendering

### Requirement: Stair Shape Turn Angles
The DSL SHALL support both 90° and 180° turns in stair configurations.

#### Scenario: 90-degree turn
- **WHEN** a turn segment specifies `turn right 90°` or `turn left 90°`
- **THEN** the stair SHALL have a quarter-turn at that segment

#### Scenario: 180-degree turn
- **WHEN** a turn segment specifies `turn right 180°` or `turn left 180°`
- **THEN** the stair SHALL have a half-turn (switchback) at that segment

#### Scenario: Default turn angle
- **WHEN** a turn segment specifies only `turn right landing (4ft x 4ft)` without explicit angle
- **THEN** the system SHALL default to a 90° turn

### Requirement: Stair Bounding Box Calculation
The system SHALL calculate the footprint bounding box for each stair shape.

#### Scenario: Straight stair footprint
- **GIVEN** a straight stair with width 3.5ft and run length 12ft
- **WHEN** the footprint is calculated
- **THEN** the bounding box SHALL be 3.5ft × 12ft oriented per the direction

#### Scenario: L-shaped stair footprint
- **GIVEN** an L-shaped stair with width 3.5ft, lower run 6ft, landing 3.5ft × 3.5ft, upper run 6ft
- **WHEN** the footprint is calculated
- **THEN** the bounding box SHALL encompass the L-shape

#### Scenario: Spiral stair footprint
- **GIVEN** a spiral stair with outer radius 4ft
- **WHEN** the footprint is calculated
- **THEN** the bounding box SHALL be 8ft × 8ft (diameter squared)

