## ADDED Requirements

### Requirement: Dimension Annotations
The renderer SHALL support displaying dimension annotations on room edges.

#### Scenario: Show dimensions enabled
- **GIVEN** a floorplan rendered with `showDimensions: true`
- **WHEN** the output is generated
- **THEN** dimension lines SHALL appear along room edges
- **AND** measurements SHALL be displayed in the configured unit

### Requirement: Area Labels
The renderer SHALL support displaying room area labels.

#### Scenario: Show area enabled
- **GIVEN** a floorplan rendered with `showArea: true`
- **WHEN** the output is generated
- **THEN** each room SHALL display its area inside the room
- **AND** the area unit SHALL match the configured `areaUnit`

### Requirement: Floor Summary Panel
The renderer SHALL support displaying a floor summary with aggregate metrics.

#### Scenario: Summary panel enabled
- **GIVEN** a multi-room floorplan with `showFloorSummary: true`
- **WHEN** the output is generated
- **THEN** a panel SHALL display room count, total area, and efficiency

### Requirement: Unit Normalization
The renderer SHALL normalize all dimensions to a consistent internal unit before rendering.

#### Scenario: Mixed input units
- **GIVEN** rooms defined with `m`, `ft`, and `cm` units
- **WHEN** the floorplan is rendered
- **THEN** all geometry SHALL be calculated using normalized meter values
- **AND** display labels SHALL show the requested output unit
