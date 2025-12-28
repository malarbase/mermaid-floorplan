# Floorplans MCP Server

An MCP (Model Context Protocol) server that enables AI assistants to render, validate, and modify floorplan DSL code. Returns **PNG images** or **SVG vectors** for visual analysis.

## Features

- **`render_floorplan`** - Parse DSL and render to PNG image or SVG vector + room metadata
- **`validate_floorplan`** - Fast syntax validation without rendering
- **`modify_floorplan`** - Apply programmatic modifications to DSL code
- **`floorplan://schema`** - DSL documentation and examples

## Installation

```bash
# From the workspace root
npm install
npm run build --workspace mcp-server
```

## Usage

### With Cursor

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "floorplans": {
      "command": "node",
      "args": ["/path/to/mermaid-floorplan/mcp-server/out/index.js"]
    }
  }
}
```

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "floorplans": {
      "command": "node",
      "args": ["/path/to/mermaid-floorplan/mcp-server/out/index.js"]
    }
  }
}
```

## Tools

### render_floorplan

Renders floorplan DSL to a PNG image or SVG vector.

**Input:**
```json
{
  "dsl": "floorplan\n  floor f1 {\n    room Office at (0,0) size (10 x 12) walls [top: solid, right: window, bottom: door, left: solid]\n  }",
  "format": "png",
  "width": 800,
  "height": 600
}
```

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dsl` | string | required | Floorplan DSL code to render |
| `format` | `"png"` \| `"svg"` | `"png"` | Output format |
| `width` | number | 800 | Image width in pixels (PNG only) |
| `height` | number | 600 | Image height in pixels (PNG only) |
| `floorIndex` | number | 0 | Which floor to render (0-based index) |
| `renderAllFloors` | boolean | false | Render all floors in a single image |
| `multiFloorLayout` | `"stacked"` \| `"sideBySide"` | `"sideBySide"` | Layout when rendering all floors |

**Output (PNG):**
- PNG image (base64 encoded)
- Room metadata with positions, sizes, walls, labels
- Floor count and which floor(s) were rendered

**Output (SVG):**
- SVG markup as text (can be saved directly to `.svg` file)
- Room metadata with positions, sizes, walls, labels
- Floor count and which floor(s) were rendered

**Multi-Floor Examples:**
```json
// Render second floor only
{
  "dsl": "floorplan\n  floor Ground {...}\n  floor First {...}",
  "floorIndex": 1
}

// Render all floors side by side
{
  "dsl": "floorplan\n  floor Ground {...}\n  floor First {...}",
  "renderAllFloors": true,
  "multiFloorLayout": "sideBySide"
}

// Render all floors stacked vertically
{
  "dsl": "floorplan\n  floor Ground {...}\n  floor First {...}",
  "renderAllFloors": true,
  "multiFloorLayout": "stacked"
}
```

### validate_floorplan

Validates DSL syntax without rendering (faster).

**Input:**
```json
{
  "dsl": "floorplan\n  floor f1 {\n    room Office at (0,0) size (10 x 12) walls [top: solid, right: window, bottom: door, left: solid]\n  }"
}
```

**Output:**
```json
{
  "valid": true,
  "errors": []
}
```

### modify_floorplan

Apply modifications to floorplan DSL programmatically.

**Supported operations:**

| Action | Description |
|--------|-------------|
| `add_room` | Add a new room with position (absolute or relative), size, walls, label |
| `remove_room` | Remove a room by name |
| `resize_room` | Change room dimensions |
| `move_room` | Change room position (adds explicit position if room uses relative positioning) |
| `rename_room` | Rename a room |
| `update_walls` | Change wall types |
| `add_label` | Add or update room label |
| `convert_to_relative` | Convert rooms from absolute positions to relative positioning |

**Example with absolute position:**
```json
{
  "dsl": "floorplan\n  floor f1 {\n    room Office at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]\n  }",
  "operations": [
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
  ]
}
```

**Example with relative positioning:**
```json
{
  "dsl": "floorplan\n  floor f1 {\n    room Office at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]\n  }",
  "operations": [
    {
      "action": "add_room",
      "params": {
        "name": "Kitchen",
        "size": { "width": 10, "height": 8 },
        "walls": { "top": "solid", "right": "door", "bottom": "solid", "left": "window" },
        "relativePosition": {
          "direction": "below",
          "reference": "Office",
          "gap": 2,
          "alignment": "left"
        },
        "label": "break area"
      }
    }
  ]
}
```

**Relative position options:**
- `direction`: `"right-of"`, `"left-of"`, `"above"`, `"below"`, `"above-right-of"`, `"above-left-of"`, `"below-right-of"`, `"below-left-of"`
- `reference`: Name of the room to position relative to
- `gap` (optional): Units of space between rooms
- `alignment` (optional): `"top"`, `"bottom"`, `"left"`, `"right"`, `"center"`

**Example: Convert absolute to relative positioning:**

This operation analyzes room positions and converts them to relative positioning, making the DSL more maintainable. One room (the anchor) keeps its absolute position, and all other rooms are positioned relative to each other.

```json
{
  "dsl": "floorplan\n  floor f1 {\n    room LivingRoom at (0,0) size (14 x 12) walls [top: window, right: solid, bottom: solid, left: solid]\n    room Kitchen at (14,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: open]\n    room Dining at (0,12) size (10 x 8) walls [top: solid, right: solid, bottom: solid, left: window]\n  }",
  "operations": [
    {
      "action": "convert_to_relative",
      "params": {
        "anchorRoom": "LivingRoom",
        "alignmentTolerance": 1
      }
    }
  ]
}
```

**Result:** Kitchen becomes `right-of LivingRoom align top`, Dining becomes `below LivingRoom align left`.

**convert_to_relative parameters:**
- `anchorRoom`: The room to keep absolute `at (x,y)` position (required)
- `alignmentTolerance`: Units of tolerance for alignment detection (default: 1)
- `targetRooms`: Optional array of room names to convert (if omitted, converts all except anchor)

## Resources

### floorplan://schema

Returns DSL syntax documentation in Markdown format. Includes:
- Basic structure
- Room properties
- Wall types
- Complete examples

## Development

```bash
# Build
npm run build --workspace mcp-server

# Clean build
npm run build:clean --workspace mcp-server

# Run directly
node mcp-server/out/index.js
```

## DSL Quick Reference

```
floorplan
  floor f1 {
    # Room with absolute position
    room Office at (0,0) size (10 x 12) walls [top: solid, right: window, bottom: door, left: solid] label "main workspace"
    
    # Room with relative position
    room Kitchen size (10 x 8) walls [top: solid, right: door, bottom: solid, left: window] below Office gap 2
    
    # Room with relative position and alignment
    room Storage size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid] right-of Kitchen align bottom
    
    # Sub-rooms
    room FlexArea at (12,0) size (20 x 22) walls [top: open, right: solid, bottom: open, left: solid] composed of [
      sub-room PhoneBooth at (3,5) size (3 x 3) walls [top: window, right: solid, bottom: door, left: solid]
    ]
  }
  # Connections between rooms
  connect Office.right to Kitchen.left door at 50%
  connect Kitchen.bottom to FlexArea.top double-door swing: left
```

**Wall types:** `solid`, `door`, `window`, `open`

**Door types:** `door`, `double-door`

**Relative positioning:**
- `right-of RoomName` - Place to the right of another room
- `left-of RoomName` - Place to the left
- `above RoomName` - Place above
- `below RoomName` - Place below
- `below-right-of`, `below-left-of`, `above-right-of`, `above-left-of` - Diagonal positions
- `gap N` - Add N units spacing between rooms
- `align top|bottom|left|right|center` - Edge alignment

**Connection options:**
- `at X%` - Position along wall (0-100%)
- `swing: left|right` - Door swing direction
- `opens into RoomName` - Which room the door opens into

