# Floorplans MCP Server

An MCP (Model Context Protocol) server that enables AI assistants to render, validate, and modify floorplan DSL code. Returns **PNG images**, **SVG vectors**, or **3D PNG renders** for visual analysis.

## Features

- **`render_floorplan`** - Parse DSL and render to PNG image, SVG vector, or 3D PNG + room metadata
- **`validate_floorplan`** - Fast syntax validation without rendering
- **`modify_floorplan`** - Apply programmatic modifications to DSL code
- **`floorplan://schema`** - DSL documentation and examples

### Output Formats

| Format | Description | Best For |
|--------|-------------|----------|
| `png` | 2D top-down view | Floor layouts, room arrangements |
| `svg` | 2D vector (scalable) | High-quality exports, web embedding |
| `3d-png` | 3D perspective or isometric | Visualization, architectural presentation |

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

Renders floorplan DSL to a PNG image, SVG vector, or 3D PNG.

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
| `format` | `"png"` \| `"svg"` \| `"3d-png"` | `"png"` | Output format |
| `width` | number | 800 | Image width in pixels |
| `height` | number | 600 | Image height in pixels |
| `floorIndex` | number | 0 | Which floor to render (0-based index) |
| `renderAllFloors` | boolean | false | Render all floors in a single image |
| `multiFloorLayout` | `"stacked"` \| `"sideBySide"` | `"sideBySide"` | Layout for 2D multi-floor rendering |

**3D-Specific Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `projection` | `"isometric"` \| `"perspective"` | `"isometric"` | Camera projection mode |
| `cameraPosition` | `{x, y, z}` | auto | Camera position for perspective mode |
| `cameraTarget` | `{x, y, z}` | auto | Look-at target for perspective mode |
| `fov` | number | 50 | Field of view in degrees (10-120) |

**Output (PNG/3D-PNG):**
- PNG image (base64 encoded)
- Room metadata with positions, sizes, walls, labels
- Floor count and which floor(s) were rendered
- Scene bounds (for 3D)

**Output (SVG):**
- SVG markup as text (can be saved directly to `.svg` file)
- Room metadata with positions, sizes, walls, labels
- Floor count and which floor(s) were rendered

**2D Multi-Floor Examples:**
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

**3D Rendering Features:**
- Floors and walls with room-specific colors/styles
- **Doors** rendered at connection points between rooms
- **Windows** rendered at window-type walls and connections
- Stairs and lifts with proper geometry
- Support for dark, light, and blueprint themes

**3D Rendering Examples:**
```json
// Isometric 3D view (default orthographic projection)
{
  "dsl": "floorplan\n  floor f1 {...}",
  "format": "3d-png",
  "width": 1920,
  "height": 1080
}

// Perspective 3D view with custom camera
{
  "dsl": "floorplan\n  floor f1 {...}",
  "format": "3d-png",
  "projection": "perspective",
  "cameraPosition": {"x": 30, "y": 20, "z": 30},
  "cameraTarget": {"x": 5, "y": 0, "z": 5},
  "fov": 60
}

// 3D view of all floors
{
  "dsl": "floorplan\n  floor Ground {...}\n  floor First {...}",
  "format": "3d-png",
  "renderAllFloors": true
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

## 3D Rendering Requirements

The 3D PNG rendering feature (`format: "3d-png"`) uses Puppeteer with headless Chromium for full WebGL2 support:

- **Node.js 20+** (for native ES modules)
- **Puppeteer** - headless Chromium browser for WebGL2 rendering
- **three** - Three.js for 3D scene construction

### Platform Notes

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | ✅ Supported | Works out of the box |
| Linux | ✅ Supported | Works out of the box |
| Windows | ✅ Supported | Works out of the box |

### Installation

```bash
# Dependencies are installed automatically with npm install
# Puppeteer will download Chromium automatically on first install
npm install --workspace mcp-server
```

### Why Puppeteer?

The 3D renderer uses Puppeteer instead of headless-gl because:
- **Full WebGL2 support**: headless-gl only supports WebGL 1.0
- **Cross-platform**: No native dependencies or build tools required
- **Consistent rendering**: Uses Chrome's actual WebGL implementation

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

