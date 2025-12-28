import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const SCHEMA_CONTENT = `# Floorplan DSL Schema

## Overview
The Floorplan DSL defines architectural floor plans using a text-based syntax.

## Basic Structure

\`\`\`
floorplan
  floor <floor_name> {
    room <room_name> at (<x>,<y>) size (<width> x <height>) walls [<wall_specs>]
    room <room_name> at (<x>,<y>) size (<width> x <height>) walls [<wall_specs>] label "<label>"
    room <room_name> at (<x>,<y>) size (<width> x <height>) walls [<wall_specs>] composed of [
      sub-room <name> at (<x>,<y>) size (<width> x <height>) walls [<wall_specs>]
    ]
  }
\`\`\`

## Room Properties

| Property | Syntax | Description |
|----------|--------|-------------|
| Position | \`at (x,y)\` | Top-left corner coordinates |
| Size | \`size (width x height)\` | Room dimensions |
| Walls | \`walls [top: T, right: T, bottom: T, left: T]\` | Wall types for each side |
| Label | \`label "text"\` | Optional descriptive label |
| Sub-rooms | \`composed of [...]\` | Nested rooms within this room |

## Wall Types

| Type | Description |
|------|-------------|
| \`solid\` | Standard wall (thick black line) |
| \`door\` | Wall with door opening (gap with arc) |
| \`window\` | Wall with window (dashed line) |
| \`open\` | No wall (open space) |

## Complete Example

\`\`\`
floorplan
  floor f1 {
    room Office at (0,0) size (10 x 12) walls [top: solid, right: window, bottom: door, left: solid] label "main workspace"
    room Kitchen at (0,14) size (10 x 8) walls [top: solid, right: door, bottom: solid, left: window] label "break area"
    room FlexArea at (12,0) size (20 x 22) walls [top: open, right: solid, bottom: open, left: solid] composed of [
      sub-room PhoneBooth1 at (3,5) size (3 x 3) walls [top: window, right: solid, bottom: door, left: solid]
      sub-room PhoneBooth2 at (9,5) size (3 x 3) walls [top: window, right: solid, bottom: door, left: solid]
    ]
  }
\`\`\`

## Coordinate System
- Origin (0,0) is at the top-left
- X increases to the right
- Y increases downward
- All units are in abstract grid units

## Tips
- Position sub-rooms relative to their parent room's coordinate system
- Use \`open\` walls to create connected spaces
- Add labels for room descriptions that appear in the rendered output
`;

export function registerResources(server: McpServer): void {
  server.resource(
    "floorplan://schema",
    "Floorplan DSL syntax documentation and examples",
    async () => ({
      contents: [
        {
          uri: "floorplan://schema",
          mimeType: "text/markdown",
          text: SCHEMA_CONTENT,
        },
      ],
    })
  );
}

