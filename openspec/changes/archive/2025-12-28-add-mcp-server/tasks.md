## 1. Project Setup

- [x] 1.1 Create `mcp-server/` directory in workspace root
- [x] 1.2 Initialize package.json with dependencies:
  - @modelcontextprotocol/sdk (MCP protocol)
  - @resvg/resvg-js (SVG → PNG conversion, no browser needed)
  - zod (input validation)
- [x] 1.3 Configure TypeScript for the new package
- [x] 1.4 Add workspace entry to root package.json

## 2. Core Implementation

- [x] 2.1 Create MCP server entry point with stdio transport
- [x] 2.2 Implement `render_floorplan` tool
  - [x] 2.2.1 Accept DSL string as input
  - [x] 2.2.2 Parse using floorplans-language parser
  - [x] 2.2.3 Generate SVG using renderer logic
  - [x] 2.2.4 Convert SVG → PNG using resvg-js (for LLM vision)
  - [x] 2.2.5 Return PNG as MCP image content + room metadata
- [x] 2.3 Implement `validate_floorplan` tool
  - [x] 2.3.1 Parse DSL and return validation errors
  - [x] 2.3.2 Return structured error messages with line numbers
- [x] 2.4 Implement `modify_floorplan` tool
  - [x] 2.4.1 Parse input DSL (using regex-based string manipulation)
  - [x] 2.4.2 Implement `add_room` operation
  - [x] 2.4.3 Implement `remove_room` operation
  - [x] 2.4.4 Implement `resize_room` operation
  - [x] 2.4.5 Implement `move_room` operation
  - [x] 2.4.6 Implement `rename_room` operation
  - [x] 2.4.7 Implement `update_walls` operation
  - [x] 2.4.8 Implement `add_label` operation
  - [x] 2.4.9 Return modified DSL string with validation
- [x] 2.5 Implement `get_floorplan_schema` resource
  - [x] 2.5.1 Return DSL syntax documentation
  - [x] 2.5.2 Include examples for each construct

## 3. Integration & Packaging

- [x] 3.1 Renderer functions ported to mcp-server/src/utils/renderer.ts
- [x] 3.2 Add build script for MCP server
- [x] 3.3 Create bin entry point for npx execution
- [x] 3.4 Add MCP server config examples for Cursor and Claude Desktop

## 4. Documentation & Testing

- [x] 4.1 Add README.md with installation and configuration instructions
- [ ] 4.2 Write integration tests for MCP tools (deferred - manual testing done)
- [x] 4.3 Update root README.md with MCP server section

