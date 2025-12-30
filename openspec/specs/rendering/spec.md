# rendering Specification

## Purpose
Defines how the floorplan DSL renders visual elements to SVG, including connections between rooms, door types (single/double), swing directions, and multi-floor layout options.
## Requirements
### Requirement: Connection Rendering

The system SHALL render connection statements as door symbols positioned at the wall intersection between connected rooms.

#### Scenario: Basic connection between adjacent rooms
- **WHEN** a floorplan contains `connect Office.right to Kitchen.left door`
- **THEN** a door symbol is rendered at the shared wall between Office and Kitchen

#### Scenario: Connection with position percentage
- **WHEN** a connection specifies `at 50%`
- **THEN** the door symbol is centered at 50% along the wall length

#### Scenario: Connection with custom position
- **WHEN** a connection specifies `at 25%`
- **THEN** the door symbol is positioned at 25% from the start of the wall

### Requirement: Double-Door Rendering

The system SHALL render `double-door` connections as two mirrored door arcs with a center gap.

#### Scenario: Double-door on horizontal wall
- **WHEN** a connection specifies `double-door` on a top or bottom wall
- **THEN** two door arcs are rendered, opening in opposite directions

#### Scenario: Double-door on vertical wall
- **WHEN** a connection specifies `double-door` on a left or right wall
- **THEN** two door arcs are rendered, opening in opposite directions

### Requirement: Door Swing Direction

The system SHALL render door swing arcs according to the specified swing direction.

#### Scenario: Left swing door
- **WHEN** a connection specifies `swing: left`
- **THEN** the door arc curves to the left of the door opening

#### Scenario: Right swing door
- **WHEN** a connection specifies `swing: right`
- **THEN** the door arc curves to the right of the door opening

#### Scenario: Opens-into room direction
- **WHEN** a connection specifies `opens into Kitchen`
- **THEN** the door arc direction indicates opening toward the Kitchen room

### Requirement: Multi-Floor Rendering

The system SHALL support rendering multiple floors from a single floorplan document.

#### Scenario: Default single floor rendering
- **WHEN** a floorplan contains multiple floors and no floor index is specified
- **THEN** only the first floor is rendered (backward compatible)

#### Scenario: Specific floor selection
- **WHEN** `RenderOptions.floorIndex` is set to 1
- **THEN** the second floor (index 1) is rendered

#### Scenario: All floors stacked view
- **WHEN** `RenderOptions.renderAllFloors` is true with layout `stacked`
- **THEN** all floors are rendered vertically with floor labels

#### Scenario: All floors side-by-side view
- **WHEN** `RenderOptions.renderAllFloors` is true with layout `sideBySide`
- **THEN** all floors are rendered horizontally with floor labels

### Requirement: Floor Labels

The system SHALL display floor identifiers when rendering multiple floors.

#### Scenario: Floor label positioning
- **WHEN** multiple floors are rendered
- **THEN** each floor displays its ID (e.g., "Floor: f1") above the floor diagram

### Requirement: 3D Data Export
The system SHALL provide a mechanism to export floorplan data into a machine-readable JSON format suitable for 3D rendering.

#### Scenario: Export 3D Data
- **WHEN** the export command is run with a floorplan file
- **THEN** a JSON file is generated containing:
    - Floor dimensions and elevations.
    - Room coordinates (x, z).
    - Wall specifications (locations, types).

### Requirement: Style-Based SVG Rendering
The SVG renderer SHALL apply style colors to room elements.

#### Scenario: Room floor color applied
- **GIVEN** style "Warm" with `floor_color: "#F5DEB3"` is defined
- **AND** room "Bedroom" uses `style Warm`
- **WHEN** the floorplan is rendered to SVG
- **THEN** the Bedroom floor polygon SHALL have fill="#F5DEB3"

#### Scenario: Room wall color applied
- **GIVEN** style "Dark" with `wall_color: "#2F2F2F"` is defined
- **AND** room "Studio" uses `style Dark`
- **WHEN** the floorplan is rendered to SVG
- **THEN** the Studio wall strokes SHALL use color #2F2F2F

#### Scenario: Texture property graceful degradation in SVG
- **GIVEN** a style defines `floor_texture: "textures/oak.jpg"` but no `floor_color`
- **WHEN** rendering to SVG
- **THEN** a default neutral color (#E0E0E0) SHALL be used
- **AND** the texture property SHALL be ignored

### Requirement: Style Export in JSON
The JSON export SHALL include style definitions and room style assignments.

#### Scenario: Styles exported in JSON
- **GIVEN** a floorplan with two styles "A" and "B" defined
- **WHEN** the floorplan is exported to JSON
- **THEN** the JSON SHALL contain a `styles` array with both style definitions

#### Scenario: Room style reference in JSON
- **GIVEN** room "Kitchen" uses `style Rustic`
- **WHEN** the floorplan is exported to JSON
- **THEN** the Kitchen room object SHALL contain `"style": "Rustic"`

