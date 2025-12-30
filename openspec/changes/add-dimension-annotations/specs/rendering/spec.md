## ADDED Requirements

### Requirement: Room Area Metrics
The system SHALL compute and include area metrics for each room in the JSON export.

#### Scenario: Room area computed
- **GIVEN** a room with width 10 and height 12
- **WHEN** the floorplan is exported to JSON
- **THEN** the room object includes `area: 120`

#### Scenario: Room volume computed when height specified
- **GIVEN** a room with width 10, height 12, and roomHeight 3.5
- **WHEN** the floorplan is exported to JSON
- **THEN** the room object includes `area: 120` and `volume: 420`

### Requirement: Floor Metrics
The system SHALL compute and include aggregate metrics for each floor in the JSON export.

#### Scenario: Floor metrics computed
- **GIVEN** a floor with 3 rooms of areas 100, 150, and 200 sq units
- **AND** the floor bounding box is 30 × 20
- **WHEN** the floorplan is exported to JSON
- **THEN** the floor includes `metrics.netArea: 450`
- **AND** `metrics.boundingBox.area: 600`
- **AND** `metrics.roomCount: 3`
- **AND** `metrics.efficiency: 0.75`

### Requirement: Floorplan Summary Metrics
The system SHALL compute and include summary metrics for the entire floorplan in the JSON export.

#### Scenario: Summary metrics computed
- **GIVEN** a floorplan with 2 floors
- **AND** floor 1 has net area 450 with 3 rooms
- **AND** floor 2 has net area 300 with 2 rooms
- **WHEN** the floorplan is exported to JSON
- **THEN** the export includes `summary.grossFloorArea: 750`
- **AND** `summary.totalRoomCount: 5`
- **AND** `summary.floorCount: 2`

### Requirement: SVG Area Annotations
The SVG renderer SHALL optionally display room area inside each room.

#### Scenario: Area shown in room
- **GIVEN** `showArea: true` render option
- **AND** a room with area 120
- **WHEN** the SVG is rendered
- **THEN** the room displays "[120 sq ft]" below the size text

#### Scenario: Area unit configurable
- **GIVEN** `showArea: true` and `areaUnit: 'sqm'` render options
- **AND** a room with area 120
- **WHEN** the SVG is rendered
- **THEN** the room displays "[120 sqm]"

### Requirement: Floor Summary Panel
The SVG renderer SHALL optionally display a summary panel below the floor layout.

#### Scenario: Summary panel rendered
- **GIVEN** `showFloorSummary: true` render option
- **WHEN** the SVG is rendered
- **THEN** a panel appears below the floor showing:
  - Bounding box dimensions and area
  - Net area and room count
  - Efficiency percentage

### Requirement: Linear Dimension Lines
The SVG renderer SHALL optionally display dimension lines along room edges.

#### Scenario: Width dimension line rendered
- **GIVEN** `showDimensions: true` render option
- **AND** a room with width 10
- **WHEN** the SVG is rendered
- **THEN** a dimension line with tick marks appears along the room's horizontal edge
- **AND** the measurement "10" is displayed above the line

#### Scenario: Height label rendered
- **GIVEN** `showDimensions: true` and `dimensionTypes: ['height']` render options
- **AND** a room with roomHeight 3.5
- **WHEN** the SVG is rendered
- **THEN** "h: 3.5" appears inside the room

