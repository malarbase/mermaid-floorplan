## ADDED Requirements

### Requirement: 3D PNG Rendering
The MCP server SHALL support rendering floorplans as 3D PNG images.

#### Scenario: Render 3D isometric view
- **GIVEN** a valid floorplan DSL
- **WHEN** the render_floorplan tool is called with `format: "3d-png"`
- **THEN** an isometric 3D PNG image SHALL be returned

#### Scenario: Custom camera position
- **GIVEN** a render request with `cameraPosition: {x: 10, y: 20, z: 30}`
- **WHEN** the 3D render is generated
- **THEN** the camera SHALL be positioned at the specified coordinates

### Requirement: Floorplan Analysis Metrics
The MCP server SHALL provide detailed metrics when analyzing floorplans.

#### Scenario: Area metrics returned
- **GIVEN** a valid floorplan
- **WHEN** the analyze_floorplan tool is called
- **THEN** the response SHALL include total area, net area, and efficiency percentage

#### Scenario: Per-room breakdown
- **GIVEN** a floorplan with multiple rooms
- **WHEN** analyze_floorplan is called with `includeRoomDetails: true`
- **THEN** each room's dimensions and area SHALL be included
