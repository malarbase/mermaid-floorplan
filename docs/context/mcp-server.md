# MCP Server Context

## Available Tools

| Tool | Purpose |
|------|---------|
| `render_floorplan` | Render DSL to SVG/PNG |
| `validate_floorplan` | Validate DSL syntax |
| `analyze_floorplan` | Analyze structure |
| `modify_floorplan` | Programmatic modifications |

## Architecture

- Imports from `floorplan-language` for parsing and SVG rendering
- `svgToPng` pipeline for image export
- Tools live in `floorplan-mcp-server/src/tools/`

## Common Workflows

- **Design iteration:** validate → modify → render
- **Multi-format export:** render to SVG, then convert to PNG via svgToPng

## Cross-Reference

See `mcp-integration` skill for full API docs and tool parameters.

<!-- freshness
watches_hash: 31f68cf
last_verified: 2026-03-04
watches:
  - floorplan-mcp-server/src/tools/**
  - floorplan-mcp-server/src/utils/renderer.ts
-->
