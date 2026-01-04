## ADDED Requirements

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

### Requirement: Shared Geometry Calculations
The 2D (SVG) and 3D renderers SHALL use identical geometry calculation functions for connection positioning to ensure consistent placement across output formats.

#### Scenario: Wall overlap calculation consistency
- **GIVEN** two adjacent rooms with shared wall segment
- **WHEN** connection position is calculated
- **THEN** the `calculateWallOverlap` function is used by both 2D and 3D renderers
- **AND** both renderers produce the same wall overlap coordinates

#### Scenario: Position fallback calculation consistency
- **GIVEN** a connection with `at 50%` position specification
- **WHEN** the connection is rendered in SVG and 3D
- **THEN** both renderers use `calculatePositionWithFallback`
- **AND** the door/window appears at the same relative position in both outputs

#### Scenario: Geometry utilities are framework-agnostic
- **GIVEN** the `floorplan-common` package
- **WHEN** imported by `floorplans-language` (SVG renderer)
- **THEN** no Three.js dependencies are transitively included
- **AND** the package size remains minimal

