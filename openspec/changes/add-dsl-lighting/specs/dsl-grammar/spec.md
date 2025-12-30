## ADDED Requirements

### Requirement: Light Statement Syntax
The DSL SHALL support a `light` statement for defining light sources in the scene.

#### Scenario: Directional light definition
- **WHEN** `light Sun type directional at (50, 100, 50) color "#FFFFFF" intensity 1.0` is defined
- **THEN** the parser SHALL accept this as valid syntax
- **AND** a directional light SHALL be included in the JSON export

#### Scenario: Point light in room
- **WHEN** `light Ceiling type point in Kitchen at (50%, 50%) height 2.5 color "#FFF5E6" intensity 0.6` is defined
- **THEN** the parser SHALL accept room-relative positioning
- **AND** the light position SHALL be calculated relative to the Kitchen room's bounds

#### Scenario: Spot light with target
- **WHEN** `light Accent type spot at (10, 8, 5) color "#FFE4B5" intensity 0.5 angle 30 target (10, 0, 5)` is defined
- **THEN** the parser SHALL accept the spot light with target direction
- **AND** the angle SHALL define the cone spread in degrees

#### Scenario: Ambient light definition
- **WHEN** `light RoomAmbient type ambient color "#FFFFFF" intensity 0.3` is defined
- **THEN** the parser SHALL accept ambient light without position
- **AND** ambient lights SHALL affect the entire scene uniformly

### Requirement: Light Types
The DSL SHALL support the following light types:

| Type | Position | Properties | Description |
|------|----------|------------|-------------|
| `directional` | Required (direction vector) | color, intensity | Parallel rays like sunlight |
| `point` | Required | color, intensity, distance | Omnidirectional from a point |
| `spot` | Required | color, intensity, distance, angle, target | Cone-shaped beam |
| `ambient` | Not applicable | color, intensity | Uniform scene illumination |

#### Scenario: All light types accepted
- **WHEN** each light type is defined with appropriate properties
- **THEN** the parser SHALL accept all as valid

### Requirement: Room-Relative Light Positioning
The DSL SHALL support positioning lights relative to a room using percentage coordinates.

#### Scenario: Light at room center
- **GIVEN** room "Bedroom" at (0, 0) with size (12 x 10)
- **WHEN** `light Fixture type point in Bedroom at (50%, 50%) height 2.8` is defined
- **THEN** the light position SHALL resolve to (6, 2.8, 5) in world coordinates

#### Scenario: Light at room corner
- **GIVEN** room "Office" at (10, 10) with size (8 x 8)
- **WHEN** `light Desk type point in Office at (90%, 10%) height 1.2` is defined
- **THEN** the light position SHALL resolve to (10 + 7.2, 1.2, 10 + 0.8) = (17.2, 1.2, 10.8)

### Requirement: Light Properties
The DSL SHALL support the following light properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `color` | Hex string | "#FFFFFF" | Light color |
| `intensity` | Number 0-10 | 1.0 | Brightness multiplier |
| `distance` | Number > 0 | 0 (infinite) | Max range for point/spot |
| `angle` | Number 0-90 | 60 | Cone angle for spot lights |
| `height` | Number | Room default height | Y-position for room-relative lights |
| `target` | Coordinate | (0, 0, 0) | Look-at point for spot lights |

#### Scenario: Default values applied
- **WHEN** `light Simple type point at (5, 3, 5)` is defined without optional properties
- **THEN** color SHALL default to "#FFFFFF"
- **AND** intensity SHALL default to 1.0

### Requirement: Light in Config Block
The DSL SHALL support global lighting defaults in the config block.

#### Scenario: Default ambient intensity
- **WHEN** `config { ambient_intensity: 0.4 }` is defined
- **THEN** the scene ambient light SHALL use intensity 0.4

#### Scenario: Default shadow settings
- **WHEN** `config { shadows: true, shadow_quality: high }` is defined
- **THEN** shadow mapping SHALL be enabled with high-resolution maps

### Requirement: Light Validation
The system SHALL validate light definitions at parse time.

#### Scenario: Invalid light type
- **WHEN** `light Bad type invalid` is defined
- **THEN** the system SHALL report an error indicating unknown light type

#### Scenario: Room reference not found
- **WHEN** `light Orphan type point in NonExistentRoom at (50%, 50%)` is defined
- **AND** no room named "NonExistentRoom" exists
- **THEN** the system SHALL report an error for undefined room reference

#### Scenario: Spot light without required target
- **WHEN** `light NoTarget type spot at (5, 5, 5) angle 30` is defined without a target
- **THEN** the system MAY default target to (position.x, 0, position.z) looking down
- **OR** SHALL report a warning suggesting a target be specified

