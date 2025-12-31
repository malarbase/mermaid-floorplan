# mcp-server Specification

## Purpose
Provide a Model Context Protocol (MCP) server that enables AI assistants (Cursor, Claude Desktop, etc.) to render, validate, and modify floorplan DSL code. The server exposes tools for rendering floorplans as PNG images viewable by multimodal LLMs, validating DSL syntax with line-specific error reporting, and programmatically modifying floorplans through structured operations.
## Requirements
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

### Requirement: Floorplan Validation Tool

The MCP server SHALL provide a `validate_floorplan` tool that checks DSL syntax without generating SVG output, enabling fast feedback during iterative editing.

#### Scenario: Validation of valid DSL

- **GIVEN** a syntactically correct floorplan DSL string
- **WHEN** the `validate_floorplan` tool is invoked
- **THEN** the response SHALL contain:
  - `valid: true`
  - `errors: []` (empty array)

#### Scenario: Validation of invalid DSL with line numbers

- **GIVEN** a floorplan DSL with an error on line 3:
  ```
  floorplan
    floor f1 {
      room Office at (0,0) size (10 x 12) walls [top: invalid_type]
    }
  ```
- **WHEN** the `validate_floorplan` tool is invoked
- **THEN** the response SHALL contain:
  - `valid: false`
  - `errors` array with an entry where `line` is 3 and `message` describes the invalid wall type

---

### Requirement: Floorplan Modification Tool

The MCP server SHALL provide a `modify_floorplan` tool that accepts DSL code and a list of operations, applies the modifications, and returns the updated DSL code.

#### Scenario: Add a new room

- **GIVEN** a floorplan DSL with one room
- **WHEN** the `modify_floorplan` tool is invoked with operation:
  ```json
  {
    "action": "add_room",
    "params": {
      "name": "Kitchen",
      "position": { "x": 0, "y": 14 },
      "size": { "width": 10, "height": 8 },
      "walls": { "top": "solid", "right": "door", "bottom": "solid", "left": "window" },
      "label": "break area"
    }
  }
  ```
- **THEN** the response SHALL contain updated `dsl` with the new Kitchen room
- **AND** `changes` SHALL include an entry with `action: "add_room"`, `result: "applied"`

#### Scenario: Remove an existing room

- **GIVEN** a floorplan DSL containing a room named "Storage"
- **WHEN** the `modify_floorplan` tool is invoked with:
  ```json
  { "action": "remove_room", "target": "Storage" }
  ```
- **THEN** the response SHALL contain updated `dsl` without the Storage room

#### Scenario: Resize a room

- **GIVEN** a floorplan DSL with room "Office" of size 10x12
- **WHEN** the `modify_floorplan` tool is invoked with:
  ```json
  { "action": "resize_room", "target": "Office", "params": { "width": 15, "height": 15 } }
  ```
- **THEN** the updated `dsl` SHALL contain "Office" with `size (15 x 15)`

#### Scenario: Update wall types

- **GIVEN** a floorplan DSL with room "Office" having all solid walls
- **WHEN** the `modify_floorplan` tool is invoked with:
  ```json
  { "action": "update_walls", "target": "Office", "params": { "right": "window", "bottom": "door" } }
  ```
- **THEN** the updated `dsl` SHALL contain "Office" with right wall as window and bottom wall as door

#### Scenario: Modify non-existent room returns error

- **GIVEN** a floorplan DSL without a room named "Garage"
- **WHEN** the `modify_floorplan` tool is invoked with:
  ```json
  { "action": "resize_room", "target": "Garage", "params": { "width": 20, "height": 20 } }
  ```
- **THEN** the response SHALL contain `success: false`
- **AND** `errors` SHALL include a message indicating room "Garage" was not found

---

### Requirement: DSL Schema Resource

The MCP server SHALL expose a `floorplan://schema` resource that provides DSL syntax documentation and usage examples.

#### Scenario: Retrieve schema documentation

- **WHEN** a client requests the `floorplan://schema` resource
- **THEN** the response SHALL contain markdown documentation including:
  - Basic floorplan structure syntax
  - Room definition syntax with all properties
  - Wall type options (solid, door, window, open)
  - Sub-room/composed syntax
  - At least one complete example

---

### Requirement: MCP Server Transport

The MCP server SHALL support stdio transport for integration with local AI assistants (Cursor, Claude Desktop).

#### Scenario: Server starts with stdio transport

- **WHEN** the MCP server is started via command line
- **THEN** it SHALL communicate via stdin/stdout using JSON-RPC messages
- **AND** it SHALL respond to MCP protocol handshake

#### Scenario: Server lists available tools

- **WHEN** a client sends a `tools/list` request
- **THEN** the server SHALL respond with tool definitions for `render_floorplan`, `validate_floorplan`, and `modify_floorplan`

#### Scenario: Server lists available resources

- **WHEN** a client sends a `resources/list` request
- **THEN** the server SHALL include the `floorplan://schema` resource

### Requirement: Schema Synchronization with Grammar

The MCP server's Zod validation schemas MUST remain synchronized with the DSL grammar type definitions. When the grammar (`floorplans.langium`) is modified to add, remove, or change type unions, the corresponding MCP server schemas MUST be updated in the same change.

#### Scenario: New wall type added to grammar

- **GIVEN** the grammar `WallType` rule is extended with a new type (e.g., `'glass'`)
- **WHEN** the change is implemented
- **THEN** `mcp-server/src/tools/modify.ts` `WallsSchema` MUST include the new type
- **AND** the `modify_floorplan` tool MUST accept rooms with the new wall type
- **AND** tests MUST verify the new type is accepted

#### Scenario: New relative direction added to grammar

- **GIVEN** the grammar `RelativeDirection` rule is extended (e.g., `'diagonal-of'`)
- **WHEN** the change is implemented
- **THEN** `RelativePositionSchema` in `modify.ts` MUST include the new direction
- **AND** the `add_room` operation MUST accept the new direction in `relativePosition`

#### Scenario: Grammar type removed

- **GIVEN** a type is removed from a grammar union (e.g., deprecating `'open'` wall type)
- **WHEN** the change is implemented
- **THEN** the MCP server schema MUST also remove the type
- **AND** the change MUST be marked as **BREAKING** in the proposal

---

### Requirement: Grammar Type Mapping Documentation

The following grammar type unions have corresponding Zod schemas in the MCP server that MUST be kept in sync:

| Grammar Rule | Generated Type | MCP Server Schema Location |
|--------------|----------------|---------------------------|
| `WallType` | `WallType` | `modify.ts`: `WallsSchema` |
| `RelativeDirection` | `RelativeDirection` | `modify.ts`: `RelativePositionSchema.direction` |
| `AlignmentDirection` | `AlignmentDirection` | `modify.ts`: `RelativePositionSchema.alignment` |
| `WallDirection` | `WallDirection` | `modify.ts`: `WallsSchema` keys |

#### Scenario: Audit reveals schema mismatch

- **GIVEN** a grammar change was made without updating MCP schemas
- **WHEN** the `modify_floorplan` tool receives DSL with the new syntax
- **THEN** validation SHOULD fail with a clear error (Zod validation error)
- **AND** the fix MUST update the MCP schema to match grammar

#### Scenario: OpenSpec change includes both grammar and MCP updates

- **GIVEN** an OpenSpec change proposal modifies any of the grammar types listed above
- **WHEN** the change affects types used by MCP tools
- **THEN** the proposal MUST include a delta spec for `mcp-server`
- **AND** the `tasks.md` MUST include updating MCP server schemas

---

### Requirement: MCP Schema Source of Truth

The DSL grammar (`floorplans.langium`) is the source of truth for type definitions. MCP server schemas are derived consumers that MUST mirror the grammar.

#### Scenario: Discrepancy resolution

- **GIVEN** a discrepancy is found between grammar types and MCP schemas
- **WHEN** determining which is correct
- **THEN** the grammar definition SHALL be considered authoritative
- **AND** the MCP schema MUST be updated to match

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

