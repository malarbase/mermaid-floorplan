## ADDED Requirements

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

