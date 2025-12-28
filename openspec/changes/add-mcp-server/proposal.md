## Why

LLMs struggle to visualize spatial layouts when iterating on floorplan DSL code. By providing an MCP server that renders the DSL to SVG and returns it alongside parsed metadata, AI assistants can "see" the floorplan and make more informed suggestions for modifications.

## What Changes

- Add new MCP server package that exposes floorplan tools to AI assistants
- Implement `render_floorplan` tool that parses DSL and returns PNG image + metadata
- Implement `validate_floorplan` tool for syntax checking without full render
- Implement `modify_floorplan` tool for AI-assisted DSL edits (add/remove/resize rooms)
- Implement `get_floorplan_schema` resource for DSL documentation
- Package as standalone npm package for easy integration with Cursor, Claude Desktop, etc.

## Impact

- Affected specs: None (new capability)
- Affected code:
  - New `mcp-server/` package in workspace
  - Reuses `language/` parser
  - Reuses `src/renderer.ts` SVG generation logic

