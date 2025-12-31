## ADDED Requirements

### Requirement: Floorplan Analysis Tool

The MCP server SHALL provide an `analyze_floorplan` tool that computes and returns structured metrics for a floorplan without rendering. This enables efficient spatial analysis workflows where LLMs need numerical data for reasoning.

#### Scenario: Analyze valid floorplan returns metrics

- **GIVEN** a valid floorplan DSL with 2 floors and 5 rooms
- **WHEN** the `analyze_floorplan` tool is invoked
- **THEN** the response SHALL contain:
  - `success: true`
  - `summary` object with `floorCount: 2`, `totalRooms: 5`, `grossFloorArea` (sum of floor net areas)
  - `floors` array with per-floor metrics
  - `rooms` array with per-room metrics

#### Scenario: Analyze returns per-floor metrics

- **GIVEN** a valid floorplan DSL with a floor containing rooms totaling 500 sqft in a 600 sqft bounding box
- **WHEN** the `analyze_floorplan` tool is invoked
- **THEN** each floor in the `floors` array SHALL include:
  - `id`: floor identifier
  - `roomCount`: number of rooms on this floor
  - `netArea`: sum of room areas (500)
  - `boundingBox`: { width, height, area: 600 }
  - `efficiency`: netArea / boundingBox.area (0.833...)

#### Scenario: Analyze returns per-room metrics

- **GIVEN** a valid floorplan DSL with a room "Kitchen" of size 12x14 with height 10
- **WHEN** the `analyze_floorplan` tool is invoked
- **THEN** the `rooms` array SHALL include an entry with:
  - `name`: "Kitchen"
  - `floor`: parent floor id
  - `area`: 168 (12 × 14)
  - `dimensions`: { width: 12, height: 14 }
  - `volume`: 1680 (12 × 14 × 10) when room has explicit height

#### Scenario: Analyze with metric area units

- **GIVEN** a valid floorplan DSL with a room of 100 sqft area
- **WHEN** the `analyze_floorplan` tool is invoked with `areaUnit: 'sqm'`
- **THEN** the area values SHALL be converted to square meters (approximately 9.29 sqm)

#### Scenario: Analyze invalid DSL returns errors

- **GIVEN** an invalid floorplan DSL with syntax errors
- **WHEN** the `analyze_floorplan` tool is invoked
- **THEN** the response SHALL contain:
  - `success: false`
  - `errors` array with error details

---

## MODIFIED Requirements

### Requirement: Floorplan Rendering Tool

The MCP server SHALL provide a `render_floorplan` tool that accepts floorplan DSL code and returns a rendered PNG image (viewable by multimodal LLMs) along with structured room metadata. The tool SHALL support optional annotation parameters for displaying room areas, dimension lines, and floor summaries.

#### Scenario: Successful render of valid DSL

- **GIVEN** a valid floorplan DSL string:
  ```
  floorplan
    floor f1 {
      room Office at (0,0) size (10 x 12) walls [top: solid, right: window, bottom: door, left: solid] label "main workspace"
    }
  ```
- **WHEN** the `render_floorplan` tool is invoked with this DSL
- **THEN** the response SHALL contain:
  - MCP image content with `type: "image"`, `mimeType: "image/png"`, and base64-encoded `data`
  - `rooms` array with one entry containing name "Office", position {x: 0, y: 0}, size {width: 10, height: 12}, label "main workspace"
- **AND** the PNG image SHALL be viewable by multimodal LLMs (GPT-4o, Claude 3.5 Sonnet)

#### Scenario: Render with nested sub-rooms

- **GIVEN** a floorplan DSL with composed rooms:
  ```
  floorplan
    floor f1 {
      room FlexArea at (0,0) size (20 x 20) walls [top: open, right: solid, bottom: open, left: solid] composed of [
        sub-room Booth1 at (2,2) size (3 x 3) walls [top: solid, right: solid, bottom: door, left: solid]
      ]
    }
  ```
- **WHEN** the `render_floorplan` tool is invoked
- **THEN** the `rooms` array SHALL include FlexArea with a `subRooms` array containing Booth1

#### Scenario: Render with invalid DSL returns errors

- **GIVEN** an invalid floorplan DSL string with syntax errors
- **WHEN** the `render_floorplan` tool is invoked
- **THEN** the response SHALL contain:
  - `success: false`
  - `errors` array with at least one error object containing `message` and optionally `line` and `column`

#### Scenario: Render with room area annotations

- **GIVEN** a valid floorplan DSL with a room of size 10 x 12
- **WHEN** the `render_floorplan` tool is invoked with `showArea: true`
- **THEN** the rendered image SHALL display the room area (120 sqft by default) inside the room
- **AND** the area label SHALL be positioned below the room name and size

#### Scenario: Render with area annotations in metric units

- **GIVEN** a valid floorplan DSL with a room of size 10 x 12
- **WHEN** the `render_floorplan` tool is invoked with `showArea: true` and `areaUnit: 'sqm'`
- **THEN** the rendered image SHALL display the room area in square meters

#### Scenario: Render with dimension lines

- **GIVEN** a valid floorplan DSL with a room of size 10 x 12
- **WHEN** the `render_floorplan` tool is invoked with `showDimensions: true`
- **THEN** the rendered image SHALL display dimension lines showing:
  - Width dimension (10ft) above or to the side of the room
  - Depth dimension (12ft) to the side of the room
- **AND** dimension lines SHALL include tick marks at endpoints

#### Scenario: Render with dimension lines in metric units

- **GIVEN** a valid floorplan DSL
- **WHEN** the `render_floorplan` tool is invoked with `showDimensions: true` and `lengthUnit: 'm'`
- **THEN** dimension labels SHALL display values with 'm' suffix

#### Scenario: Render with floor summary panel

- **GIVEN** a valid floorplan DSL with multiple rooms
- **WHEN** the `render_floorplan` tool is invoked with `showFloorSummary: true`
- **THEN** the rendered image SHALL display a floor summary panel showing:
  - Number of rooms
  - Net area (sum of room areas)
  - Bounding box dimensions
  - Efficiency percentage (net area / bounding box area)

#### Scenario: Render all floors with annotations

- **GIVEN** a multi-floor floorplan DSL
- **WHEN** the `render_floorplan` tool is invoked with `renderAllFloors: true`, `showArea: true`, and `showFloorSummary: true`
- **THEN** each floor in the rendered image SHALL display:
  - Room areas inside each room
  - Floor summary panel for each floor
