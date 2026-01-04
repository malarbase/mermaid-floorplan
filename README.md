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

### Stairs

Stairs are vertical circulation elements that connect floors:

```
# Basic straight stair
stair MainStair at (10, 0) shape straight toward top rise 10ft width 3.5ft

# L-shaped stair with landing
stair CornerStair shape L-shaped from bottom turn left runs 6, 6 rise 10ft width 3.5ft

# U-shaped stair (switchback)
stair ServiceStair shape U-shaped entry east turn right runs 8, 8 rise 12ft width 3ft

# Spiral stair
stair TowerSpiral shape spiral rotation clockwise outer-radius 4ft rise 10ft

# Custom segmented stair with landings
stair CustomStair shape custom from bottom [
    flight 5,
    turn right landing (4ft x 4ft),
    flight 6
] rise 12ft width 3.5ft
```

#### Stair Shapes

- `straight` - Single flight stair (requires `direction`)
- `L-shaped` - Two flights with 90° turn (requires `entry`, `turn`, `runs`)
- `U-shaped` - Two flights with 180° turn (switchback)
- `double-L` - Three flights with two 90° turns
- `spiral` - Helical stair (requires `rotation`, `outer-radius`)
- `winder` - Stair with triangular winder treads at corners
- `custom` - Composable segments with `flight` and `turn`

#### Stair Properties

- `rise` - Total vertical rise of the stair
- `width` - Stair width
- `riser` - Individual riser height (auto-calculated if omitted)
- `tread` - Tread depth (default: 11")
- `nosing` - Nosing overhang (default: 1")
- `headroom` - Minimum headroom clearance (default: 80")
- `handrail (left|right|both|inner|outer)` - Handrail placement
- `stringers (open|closed|glass)` - Riser style (default: closed)
- `label "Display Name"` - Custom display label
- `material { tread: "oak", riser: "white" }` - Material specification

#### Building Code Compliance

Enable validation against building codes in the config block:

```
config { stair_code: residential }  # IRC code (max riser 7.75")
config { stair_code: commercial }   # IBC code (max riser 7", min width 44")
config { stair_code: ada }          # ADA compliance (min width 48")
config { stair_code: none }         # No validation (default)
```

### Lifts (Elevators)

```
# Basic lift
lift MainLift at (20, 25) size (5ft x 5ft)

# Lift with door openings
lift MainLift at (20, 25) size (5ft x 5ft) doors (north, south)

# Lift with label
lift Elevator size (5ft x 5ft) label "Main Elevator"
```

### Vertical Connections

Link stairs and lifts across floors:

```
# Connect stairs between two floors
vertical Ground.MainStair to First.MainStair

# Connect lift through multiple floors
vertical Ground.Elevator to First.Elevator to Second.Elevator
```

The system validates that vertically connected elements have matching positions and compatible footprints.

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

- **`render_floorplan`** - Parse DSL → PNG/SVG/3D-PNG + room metadata
  - `format`: `"png"` (2D top-down), `"svg"` (2D vector), `"3d-png"` (3D view)
  - `floorIndex`: Render specific floor (0-based, default: 0)
  - `renderAllFloors`: Render all floors in single image
  - `multiFloorLayout`: `"stacked"` or `"sideBySide"` (2D only)
  - `projection`: `"isometric"` or `"perspective"` (3D only)
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
- **Stairs** - Multiple shapes (straight, L-shaped, U-shaped, spiral, custom segmented)
- **Lifts/Elevators** - Shaft definitions with door openings
- **Vertical connections** - Link stairs/lifts across floors with position validation

### Planned

- Interactive door manipulation

## Rendering Workflows

### 2D Rendering (Top-Down View)

The 2D renderer creates floor plan images from a bird's-eye view, ideal for architectural layouts and documentation.

**Export to PNG/SVG:**
```bash
# Generate 2D images for all floors
make export FILE=examples/StairsAndLifts.floorplan

# Output: StairsAndLifts-GroundFloor.png, StairsAndLifts-FirstFloor.png, etc.
```

**Via MCP Tool:**
```json
{
  "dsl": "floorplan\n  floor f1 {...}",
  "format": "png",   // or "svg"
  "width": 800,
  "height": 600
}
```

### 3D Rendering (Isometric/Perspective View)

The 3D renderer creates perspective views showing walls, floors, **doors**, **windows**, stairs, and lifts in three dimensions. Doors defined via `connect` statements and windows from window-type walls are rendered at their specified positions.

**Export to 3D PNG:**
```bash
# Generate 3D isometric view
make export-3d FILE=examples/StairsAndLifts.floorplan

# Generate 3D perspective view with custom camera
make export-3d-perspective FILE=examples/StairsAndLifts.floorplan
```

**Via MCP Tool:**
```json
{
  "dsl": "floorplan\n  floor f1 {...}",
  "format": "3d-png",
  "projection": "isometric",
  "renderAllFloors": true
}
```

**Perspective with Custom Camera:**
```json
{
  "dsl": "floorplan\n  floor f1 {...}",
  "format": "3d-png",
  "projection": "perspective",
  "cameraPosition": [30, 20, 30],
  "cameraTarget": [5, 0, 5],
  "fov": 60
}
```

### CLI Script for 3D Rendering

```bash
# Basic usage
npx tsx scripts/generate-3d-images.ts <input.floorplan> [output-dir]

# Options
npx tsx scripts/generate-3d-images.ts input.floorplan output/ \
  --all                    # Render all floors in single view
  --projection perspective # Use perspective camera
  --camera-pos 30,20,30    # Camera position [x,y,z]
  --camera-target 5,0,5    # Look-at target [x,y,z]
  --fov 60                 # Field of view (degrees)
  --width 1920             # Output width
  --height 1080            # Output height
```

### Makefile Targets

| Target | Description |
|--------|-------------|
| `make export FILE=<path>` | Generate 2D PNG images for all floors |
| `make export-svg FILE=<path>` | Generate 2D SVG vectors |
| `make export-json FILE=<path>` | Export to JSON format |
| `make export-3d FILE=<path>` | Generate 3D isometric view |
| `make export-3d-perspective FILE=<path>` | Generate 3D perspective view |
| `make viewer-dev` | Run the interactive 3D viewer |

## 3D Viewer (Interactive)

A standalone 3D viewer is available for interactive visualization.

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

## 3D Rendering Requirements

The 3D PNG rendering requires Node.js 20+ and headless-gl:

| Platform | Status | Notes |
|----------|--------|-------|
| macOS | ✅ Supported | Works out of the box |
| Linux | ✅ Supported | May need `xvfb` for some systems |
| Windows | ⚠️ Experimental | Requires Visual C++ Build Tools |

If headless-gl fails to build, see [headless-gl installation guide](https://github.com/stackgl/headless-gl#system-dependencies).
