# mcp-server Specification

## Purpose
Provide a Model Context Protocol (MCP) server that enables AI assistants (Cursor, Claude Desktop, etc.) to render, validate, and modify floorplan DSL code. The server exposes tools for rendering floorplans as PNG images viewable by multimodal LLMs, validating DSL syntax with line-specific error reporting, and programmatically modifying floorplans through structured operations.
## Requirements
### Requirement: Floorplan Rendering Tool

The MCP server SHALL provide a `render_floorplan` tool that accepts floorplan DSL code and returns a rendered PNG image (viewable by multimodal LLMs) along with structured room metadata.

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

---

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

