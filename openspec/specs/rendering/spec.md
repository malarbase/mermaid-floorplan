<!-- PROPRIETARY - See openspec/LICENSE -->

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
The system SHALL render door swing arcs according to the specified swing direction, accounting for wall orientation perspective.

#### Scenario: Left swing door
- **WHEN** a connection specifies `swing: left`
- **THEN** the door arc curves to the left of the door opening

#### Scenario: Right swing door
- **WHEN** a connection specifies `swing: right`
- **THEN** the door arc curves to the right of the door opening

#### Scenario: Opens-into room direction
- **WHEN** a connection specifies `opens into Kitchen`
- **THEN** the door arc direction indicates opening toward the Kitchen room

#### Scenario: Right wall swing inversion
- **WHEN** a door is on a right wall (vertical, positive X-facing)
- **THEN** the swing direction is inverted from left wall to match "facing from inside" perspective
- **AND** left swing on right wall opens upward (toward min Y/top)
- **AND** right swing on right wall opens downward (toward max Y/bottom)

### Requirement: Multi-Floor Rendering
The system SHALL support rendering multiple floors from a single floorplan document using the visibleFloors API. Legacy options floorIndex and renderAllFloors are deprecated but still functional for backward compatibility.

#### Scenario: Default single floor rendering
- **WHEN** a floorplan contains multiple floors and no floor visibility options are specified
- **THEN** only the first floor is rendered (backward compatible via deprecated floorIndex default of 0)

#### Scenario: Specific floor selection (deprecated)
- **WHEN** `RenderOptions.floorIndex` is set to 1
- **THEN** the second floor (index 1) is rendered
- **AND** a deprecation warning is logged recommending visibleFloors usage

#### Scenario: All floors stacked view (deprecated)
- **WHEN** `RenderOptions.renderAllFloors` is true with layout `stacked`
- **THEN** all floors are rendered vertically with floor labels
- **AND** a deprecation warning is logged recommending visibleFloors usage

#### Scenario: All floors side-by-side view (deprecated)
- **WHEN** `RenderOptions.renderAllFloors` is true with layout `sideBySide`
- **THEN** all floors are rendered horizontally with floor labels
- **AND** a deprecation warning is logged recommending visibleFloors usage

#### Scenario: visibleFloors takes precedence over deprecated options
- **WHEN** both `visibleFloors` and deprecated options (floorIndex/renderAllFloors) are specified
- **THEN** `visibleFloors` is used and deprecated options are ignored
- **AND** no deprecation warning is logged (user is using new API)

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

### Requirement: 3D Door/Window Mesh Generation
The 3D rendering system SHALL generate Three.js mesh geometry for door and window connections.

#### Scenario: Door mesh with hinge-based pivot
- **GIVEN** a door connection with width 1.0 and height 2.1
- **WHEN** the 3D renderer generates door geometry
- **THEN** a BoxGeometry is created with dimensions (1.0 x 2.1 x 0.05)
- **AND** the geometry pivot point is positioned at the hinge edge

#### Scenario: Window mesh with transparency
- **GIVEN** a window connection
- **WHEN** the 3D renderer generates window geometry
- **THEN** a MeshStandardMaterial is created with transparency enabled
- **AND** the material has opacity between 0.5 and 0.7

#### Scenario: Connection material from theme
- **GIVEN** a floorplan with theme "dark"
- **WHEN** door/window meshes are created
- **THEN** materials use the dark theme color palette

### Requirement: 3D Connection Position Calculation
The 3D renderer SHALL calculate precise 3D coordinates for door/window placement based on room geometry and wall direction.

#### Scenario: Door position on horizontal wall
- **GIVEN** a connection on a top wall with `at 50%` position
- **AND** room with x=0, z=0, width=10
- **WHEN** the position is calculated
- **THEN** holeX = 5 (center of room width)
- **AND** holeZ = 0 (at top wall)

#### Scenario: Door position on vertical wall
- **GIVEN** a connection on a right wall with `at 25%` position
- **AND** room with x=0, z=0, height=12
- **WHEN** the position is calculated
- **THEN** holeX = room.x + room.width (right edge)
- **AND** holeZ = 3 (25% of 12-unit height)

#### Scenario: Window elevation offset
- **GIVEN** a window connection with no elevationOffset specified
- **AND** config `window_sill: 0.9`
- **WHEN** the window position is calculated
- **THEN** holeY = roomElevation + 0.9 + (windowHeight / 2)

### Requirement: 3D Rendering Consistency Across Contexts
The 3D rendering output SHALL be consistent between the browser viewer, MCP server PNG generation, and CLI scripts.

#### Scenario: MCP server 3D PNG includes doors
- **GIVEN** a floorplan with door connections
- **WHEN** the MCP server generates a 3D PNG via Puppeteer
- **THEN** the output image includes visible door meshes
- **AND** door positions match the browser viewer

#### Scenario: CLI script 3D images include windows
- **GIVEN** a floorplan with window connections
- **WHEN** `generate-3d-images.ts` is run
- **THEN** the output PNG files include window meshes
- **AND** windows are semi-transparent

#### Scenario: Viewer and MCP server produce identical geometry
- **GIVEN** the same floorplan JSON data
- **WHEN** rendered in both the browser viewer and MCP server
- **THEN** door hinge positions are identical
- **AND** door swing angles are identical
- **AND** window elevations are identical

### Requirement: Floor Visibility API
The rendering system SHALL accept an array of floor IDs to control which floors are rendered in the output.

#### Scenario: Render specific floors by ID
- **WHEN** `RenderOptions.visibleFloors` is set to `["f1", "f3"]`
- **THEN** only floors with IDs "f1" and "f3" are rendered
- **AND** floors "f2" and any others are excluded from the output

#### Scenario: Empty visibleFloors array
- **WHEN** `RenderOptions.visibleFloors` is set to `[]`
- **THEN** an empty SVG is rendered (no floors visible)

#### Scenario: Undefined visibleFloors renders all
- **WHEN** `RenderOptions.visibleFloors` is undefined
- **AND** deprecated options are not set
- **THEN** all floors are rendered (backward compatible default)

#### Scenario: Single floor in visibleFloors
- **WHEN** `RenderOptions.visibleFloors` contains exactly one floor ID
- **THEN** that floor is rendered using single-floor layout
- **AND** no floor labels are displayed

#### Scenario: Multiple floors in visibleFloors
- **WHEN** `RenderOptions.visibleFloors` contains multiple floor IDs
- **THEN** those floors are rendered using multi-floor layout
- **AND** floor labels are displayed for each floor
- **AND** layout respects `multiFloorLayout` setting (stacked or sideBySide)

