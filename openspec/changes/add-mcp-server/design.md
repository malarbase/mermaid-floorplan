## Context

AI coding assistants (Cursor, Claude Desktop, etc.) can use MCP (Model Context Protocol) servers to access external tools and resources. By exposing the floorplan renderer as an MCP server, LLMs can render DSL code and inspect the visual output, enabling better spatial reasoning when suggesting floorplan modifications.

**Stakeholders:** AI assistant users, developers extending the floorplan DSL

## Goals / Non-Goals

**Goals:**
- Enable LLMs to render floorplan DSL and receive visual + structured feedback
- Provide syntax validation with actionable error messages
- Make DSL documentation accessible via MCP resources
- Support standard MCP transports (stdio for local, SSE for remote)

**Non-Goals:**
- Interactive editing (MCP is request/response, not real-time)
- Serving the web demo via MCP
- Authentication/authorization (rely on MCP client configuration)

## Decisions

### Decision: Use stdio transport as primary

**Rationale:** stdio is the standard for local MCP servers (Cursor, Claude Desktop). SSE can be added later for remote scenarios.

**Alternatives considered:**
- HTTP-only: Would require separate server process, more complex setup
- WebSocket: Not widely supported by MCP clients yet

### Decision: Return PNG image as base64-encoded data

**Rationale:** Multimodal LLMs (GPT-4o, Claude 3.5 Sonnet) can only "see" raster images (PNG, JPEG), not SVG markup. While SVG is text that LLMs can parse, they cannot visually reason about spatial layouts from XML coordinates. Returning a rendered PNG allows the LLM to actually perceive the floorplan layout.

**Implementation:** Use a headless renderer (Playwright, Puppeteer, or sharp+resvg) to convert SVG → PNG before returning.

**Alternatives considered:**
- Return SVG string: LLM can parse but cannot visually understand spatial relationships
- Return SVG + PNG: Redundant, PNG alone provides visual + LLM can describe what it sees
- Return file path: Requires filesystem access, platform-dependent

### Decision: Separate render and validate tools

**Rationale:** Validation is faster and useful during iterative editing. Rendering includes validation but adds SVG generation overhead.

### Decision: Package as workspace member

**Rationale:** Allows direct imports from `floorplans-language` and renderer code without publishing. Can be extracted to separate repo later if needed.

## Tool Specifications

### Tool: render_floorplan

```typescript
{
  name: "render_floorplan",
  description: "Parse floorplan DSL and render to PNG image that the LLM can visually analyze",
  inputSchema: {
    type: "object",
    properties: {
      dsl: {
        type: "string",
        description: "Floorplan DSL code to render"
      },
      width: {
        type: "number",
        default: 800,
        description: "Output image width in pixels"
      },
      height: {
        type: "number", 
        default: 600,
        description: "Output image height in pixels"
      }
    },
    required: ["dsl"]
  }
}
```

**Response structure:**
```typescript
{
  success: boolean,
  image?: {
    data: string,         // Base64-encoded PNG data
    mimeType: "image/png",
    width: number,
    height: number
  },
  rooms?: Array<{         // Structured metadata for programmatic use
    name: string,
    position: { x: number, y: number },
    size: { width: number, height: number },
    label?: string,
    walls: { top: string, right: string, bottom: string, left: string },
    subRooms?: Array<...>
  }>,
  errors?: Array<{
    message: string,
    line?: number,
    column?: number
  }>
}
```

**MCP Image Content:** The tool returns image content using MCP's native image type:
```typescript
{
  type: "image",
  data: "<base64-png>",
  mimeType: "image/png"
}
```

### Tool: validate_floorplan

```typescript
{
  name: "validate_floorplan",
  description: "Validate floorplan DSL syntax without rendering",
  inputSchema: {
    type: "object",
    properties: {
      dsl: {
        type: "string",
        description: "Floorplan DSL code to validate"
      }
    },
    required: ["dsl"]
  }
}
```

### Tool: modify_floorplan

```typescript
{
  name: "modify_floorplan",
  description: "Apply modifications to a floorplan DSL and return the updated code",
  inputSchema: {
    type: "object",
    properties: {
      dsl: {
        type: "string",
        description: "Current floorplan DSL code"
      },
      operations: {
        type: "array",
        description: "List of modifications to apply",
        items: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["add_room", "remove_room", "resize_room", "move_room", "rename_room", "update_walls", "add_label"],
              description: "Type of modification"
            },
            target: {
              type: "string",
              description: "Room name to modify (for update operations)"
            },
            params: {
              type: "object",
              description: "Action-specific parameters"
            }
          },
          required: ["action"]
        }
      }
    },
    required: ["dsl", "operations"]
  }
}
```

**Response structure:**
```typescript
{
  success: boolean,
  dsl?: string,              // Updated DSL code
  changes?: Array<{          // Summary of applied changes
    action: string,
    target: string,
    result: "applied" | "skipped" | "error",
    message?: string
  }>,
  errors?: Array<{
    message: string,
    operation?: number       // Index of failed operation
  }>
}
```

**Supported operations:**
| Action | Params | Description |
|--------|--------|-------------|
| `add_room` | `name`, `position`, `size`, `walls`, `label?` | Add a new room |
| `remove_room` | - | Remove room by target name |
| `resize_room` | `width`, `height` | Change room dimensions |
| `move_room` | `x`, `y` | Change room position |
| `rename_room` | `newName` | Rename the room |
| `update_walls` | `top?`, `right?`, `bottom?`, `left?` | Update wall types |
| `add_label` | `label` | Add or update room label |

### Resource: floorplan://schema

Returns DSL syntax documentation and examples as markdown.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Large PNGs may exceed context limits | Default to reasonable dimensions (800x600), allow customization |
| PNG generation adds dependency (resvg-js) | resvg-js is pure Rust/WASM, no browser/native deps needed |
| Parser errors may be cryptic | Map Langium errors to user-friendly messages |
| Circular dependency with renderer | Extract shared types to separate module |

## Migration Plan

1. Create mcp-server package with minimal dependencies
2. Extract renderer functions to shared module
3. Implement tools incrementally (validate → render)
4. Test with Cursor MCP integration
5. Document configuration for various clients

## Open Questions

- [x] ~~Should we support streaming for large floorplans?~~ → Not yet, revisit if needed
- [x] ~~Should we add a `modify_floorplan` tool for AI-assisted edits?~~ → **Yes, adding to scope**
- [ ] What's the best way to handle custom wall types in the future? → Defer to future change

