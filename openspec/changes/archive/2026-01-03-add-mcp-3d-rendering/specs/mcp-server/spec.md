## ADDED Requirements

### Requirement: 3D PNG Rendering Format

The MCP server SHALL support rendering floorplans as 3D PNG images with configurable camera perspectives and projection modes.

#### Scenario: Render floorplan as 3D PNG with isometric view

- **GIVEN** a valid floorplan DSL with multiple rooms
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the response SHALL contain:
  - MCP image content with `type: "image"`, `mimeType: "image/png"`, and base64-encoded `data`
  - The PNG image SHALL show a 3D isometric view (default) of the floorplan
  - Walls SHALL be rendered as vertical extrusions
  - Floors SHALL be rendered as horizontal slabs
- **AND** the image SHALL be viewable by multimodal LLMs (GPT-4o, Claude 3.5 Sonnet)

#### Scenario: Render 3D PNG with perspective camera

- **GIVEN** a valid floorplan DSL
- **WHEN** the `render_floorplan` tool is invoked with:
  - `format: "3d-png"`
  - `projection: "perspective"`
  - `cameraPosition: [50, 30, 50]`
  - `cameraTarget: [0, 0, 0]`
  - `fov: 60`
- **THEN** the response SHALL contain a 3D PNG rendered from the specified camera position
- **AND** the camera SHALL look at the target point with the specified field of view

#### Scenario: 3D rendering applies style-based materials

- **GIVEN** a floorplan DSL with a style defining `floor_color: "#8B4513"` and `wall_color: "#D2B48C"`
- **AND** a room using that style
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the rendered 3D image SHALL display the room floor in the specified floor color
- **AND** the room walls SHALL use the specified wall color

#### Scenario: 3D rendering with textures

- **GIVEN** a floorplan DSL with a style defining `floor_texture: "textures/oak.jpg"`
- **AND** the texture file exists and is accessible
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the rendered 3D image SHALL apply the texture to the floor surface

#### Scenario: 3D rendering with PBR material properties

- **GIVEN** a floorplan DSL with a style defining `roughness: 0.8` and `metalness: 0.2`
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the rendered materials SHALL use the specified roughness and metalness values

#### Scenario: Multi-floor 3D rendering

- **GIVEN** a floorplan DSL with 2 floors
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"` and `renderAllFloors: true`
- **THEN** the response SHALL contain a 3D image showing all floors vertically stacked
- **AND** each floor SHALL be positioned at its correct elevation

#### Scenario: 3D rendering includes stairs

- **GIVEN** a floorplan DSL with a stair element
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the stair geometry SHALL be visible in the rendered 3D image

#### Scenario: 3D rendering includes lifts

- **GIVEN** a floorplan DSL with a lift element
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the lift geometry SHALL be visible in the rendered 3D image

#### Scenario: 3D rendering error handling

- **GIVEN** the headless GL context fails to initialize
- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the response SHALL contain:
  - `success: false`
  - `errors` array with a message describing the 3D rendering failure
  - Guidance on platform requirements or missing dependencies

### Requirement: 3D Camera Configuration Schema

The MCP server SHALL accept camera configuration options for 3D rendering through the `render_floorplan` tool schema.

#### Scenario: Isometric projection mode

- **WHEN** the `render_floorplan` tool is invoked with `projection: "isometric"`
- **THEN** an orthographic camera SHALL be used
- **AND** the camera SHALL be positioned at a 30° angle from horizontal
- **AND** the scene SHALL be automatically framed to show all geometry

#### Scenario: Perspective projection mode

- **WHEN** the `render_floorplan` tool is invoked with `projection: "perspective"`
- **THEN** a perspective camera SHALL be used
- **AND** user-provided `cameraPosition` and `cameraTarget` SHALL be applied

#### Scenario: Default camera behavior

- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"` without specifying `projection`
- **THEN** isometric projection SHALL be used by default
- **AND** the camera SHALL automatically frame the entire floorplan

#### Scenario: Field of view configuration

- **WHEN** the `render_floorplan` tool is invoked with `projection: "perspective"` and `fov: 75`
- **THEN** the perspective camera SHALL use a field of view of 75 degrees

### Requirement: 3D Rendering Tool Schema

The `render_floorplan` tool schema SHALL include fields for configuring 3D rendering parameters.

#### Scenario: Schema includes 3D format option

- **WHEN** a client inspects the `render_floorplan` tool definition
- **THEN** the `format` field SHALL accept enum values: `"png"`, `"svg"`, `"3d-png"`

#### Scenario: Schema includes projection field

- **WHEN** a client inspects the `render_floorplan` tool definition
- **THEN** the schema SHALL include an optional `projection` field with enum values: `"isometric"`, `"perspective"`

#### Scenario: Schema includes camera position fields

- **WHEN** a client inspects the `render_floorplan` tool definition
- **THEN** the schema SHALL include:
  - Optional `cameraPosition` field as array of 3 numbers [x, y, z]
  - Optional `cameraTarget` field as array of 3 numbers [x, y, z]
  - Optional `fov` field as number (default 50)

### Requirement: 3D Rendering Backward Compatibility

The addition of 3D rendering SHALL NOT break existing 2D rendering functionality or change default behavior.

#### Scenario: Default format unchanged

- **WHEN** the `render_floorplan` tool is invoked without specifying `format`
- **THEN** the default format SHALL remain `"png"` (2D top-down view)
- **AND** the rendering behavior SHALL be identical to pre-3D implementation

#### Scenario: 2D rendering with explicit format

- **WHEN** the `render_floorplan` tool is invoked with `format: "png"` or `format: "svg"`
- **THEN** 2D rendering SHALL be used (not affected by 3D implementation)

#### Scenario: 2D rendering ignores 3D options

- **WHEN** the `render_floorplan` tool is invoked with `format: "png"` and 3D options like `projection: "isometric"`
- **THEN** the 3D options SHALL be ignored
- **AND** standard 2D rendering SHALL be performed

### Requirement: 3D Rendering Metadata

The MCP server SHALL include 3D-specific metadata in the response when rendering 3D images.

#### Scenario: Metadata includes rendering mode

- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the text response SHALL include:
  - `format: "3d-png"`
  - `projection: "isometric"` or `"perspective"` (whichever was used)

#### Scenario: Metadata includes camera information

- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"` and `projection: "perspective"`
- **THEN** the text response SHALL include:
  - `cameraPosition`: actual camera position used
  - `cameraTarget`: actual camera target used
  - `fov`: field of view used

#### Scenario: Metadata includes scene bounds

- **WHEN** the `render_floorplan` tool is invoked with `format: "3d-png"`
- **THEN** the text response SHALL include:
  - `sceneBounds`: bounding box dimensions { min: [x,y,z], max: [x,y,z], center: [x,y,z] }

