# Floorplan grammar parser and SVG generator

Based on the ideas in https://github.com/mermaid-js/mermaid/issues/6134

Demo app: https://langalex.github.io/mermaid-floorplan

## DSL Syntax

### Basic Structure

```
floorplan
    floor FloorName {
        room RoomName at (x,y) size (width x height) walls [top: type, right: type, bottom: type, left: type]
    }
```

### Relative Positioning

Instead of specifying absolute coordinates, rooms can be positioned relative to other rooms:

```
room Foyer at (0,0) size (6 x 6) walls [top: solid, right: open, bottom: solid, left: solid]
room LivingRoom size (14 x 16) walls [...] right-of Foyer
room Kitchen size (10 x 8) walls [...] below LivingRoom gap 2
room Office size (10 x 10) walls [...] right-of LivingRoom align top
```

#### Position Directions

- `right-of` - Place to the right of reference room
- `left-of` - Place to the left of reference room
- `above` - Place above reference room
- `below` - Place below reference room
- `below-right-of` - Place diagonally below and right
- `below-left-of` - Place diagonally below and left
- `above-right-of` - Place diagonally above and right
- `above-left-of` - Place diagonally above and left

#### Gap Specification

Add spacing between rooms with `gap N`:

```
room Kitchen size (10 x 8) walls [...] below LivingRoom gap 2
```

#### Alignment

Control edge alignment with `align`:

```
room Office size (10 x 10) walls [...] right-of LivingRoom align bottom
room Closet size (5 x 5) walls [...] right-of Bedroom align center
```

Alignment options:
- For horizontal positioning (`right-of`, `left-of`): `top` (default), `bottom`, `center`
- For vertical positioning (`above`, `below`): `left` (default), `right`, `center`

#### Chained Positioning

Rooms can reference other relatively-positioned rooms:

```
room A at (0,0) size (5 x 5) walls [...]
room B size (5 x 5) walls [...] right-of A
room C size (5 x 5) walls [...] right-of B
room D size (5 x 5) walls [...] below C gap 1
```

### Wall Types

- `solid` - Standard wall
- `door` - Wall with door opening
- `window` - Wall with window
- `open` - No wall (open passage)

### Room Labels

```
room Kitchen at (0,0) size (5 x 4) walls [...] label "Main Kitchen"
```

### Connections Between Rooms

Connect rooms with doors placed at their shared wall:

```
connect RoomA.right to RoomB.left door           # Single door
connect RoomA.right to RoomB.left double-door    # Double door
connect RoomA to RoomB door                      # Auto-detect wall
```

#### Connection Options

```
# Position along wall (0-100%)
connect RoomA.right to RoomB.left door at 25%

# Swing direction
connect RoomA.right to RoomB.left door swing: left
connect RoomA.right to RoomB.left door swing: right

# Door opens into specific room
connect RoomA.right to RoomB.left door opens into RoomA

# Combine options
connect RoomA.right to RoomB.left double-door at 50% swing: right
```

### Multi-Floor Buildings

```
floorplan
    floor Ground {
        room Lobby at (0,0) size (10 x 10) walls [...]
    }
    floor First {
        room Office at (0,0) size (10 x 10) walls [...]
    }
```

### Sub-Rooms (Nested Rooms)

```
room MainBedroom at (0,0) size (20 x 15) walls [...] composed of [
    sub-room Closet at (15,0) size (5 x 5) walls [...]
    sub-room Bathroom at (0,10) size (8 x 5) walls [...]
]
```

### Comments

```
# Single line comment
/* Multi-line
   comment */
```

## Development

Rebuild parser etc. from grammar file: `npm run langium:generate`

Build: `npm run build`

Test: `npm run test`

Run demo app: `npm run dev`

## MCP Server

An MCP server is included that allows AI assistants to render, validate, and modify floorplan DSL. Returns **PNG images** for visual analysis by multimodal LLMs.

### Quick Setup (Cursor)

Add to `.cursor/mcp.json`:

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

### Available Tools

- **`render_floorplan`** - Parse DSL → PNG image + room metadata
  - `floorIndex`: Render specific floor (0-based, default: 0)
  - `renderAllFloors`: Render all floors in single image
  - `multiFloorLayout`: `"stacked"` or `"sideBySide"` (default)
- **`validate_floorplan`** - Fast syntax validation
- **`modify_floorplan`** - Programmatic DSL modifications

See [mcp-server/README.md](./mcp-server/README.md) for full documentation.

## Rendering Features

### Supported

- Room walls with doors, windows, and open passages
- Single doors with swing arc
- Double doors with mirrored swing arcs
- Door swing direction (left/right)
- Door position along wall (percentage)
- Connections between rooms
- Multi-floor rendering (single floor, all floors stacked, all floors side-by-side)
- Floor labels in multi-floor view
- Theming (default, dark, blueprint)
- **Relative positioning** (`right-of`, `below`, etc.) with automatic coordinate resolution
- Gap spacing and alignment options for relative positioning
- Overlap detection warnings

### Planned

- Staircase/elevator connections between floors
- Interactive door manipulation

## 3D Viewer

A standalone 3D viewer is available to visualize floorplans.

### Usage

1. **Export to JSON**:
   ```bash
   make export-json FILE=path/to/my.floorplan
   ```
   This generates `path/to/my.json`.

2. **Run the Viewer**:
   ```bash
   make viewer-dev
   ```
   Open the displayed URL (usually `http://localhost:5173`) in your browser.

3. **Load Data**:
   - In the viewer interface, use the file picker to select the generated JSON file.
   - Use **Left Click** to rotate, **Right Click** to pan, and **Scroll** to zoom.
   - Use the **Exploded View** slider to separate floors vertically.
