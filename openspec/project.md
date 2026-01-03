# Project Context

## Purpose
Mermaid Floorplan is a domain-specific language (DSL) for defining architectural floorplans in text format, inspired by [Mermaid.js](https://github.com/mermaid-js/mermaid/issues/6134). The project provides:

- A grammar-based parser for the floorplan DSL
- Real-time SVG rendering of floorplans
- 3D visualization with Three.js (CSG-based wall rendering, exploded view)
- A web-based editor with syntax highlighting
- AI-powered chat interface for natural language floorplan modifications
- MCP server for AI assistant integration (Cursor, Claude Desktop)

**Demo:** https://langalex.github.io/mermaid-floorplan

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Grammar/Parsing:** Langium 4.x (DSL toolkit for TypeScript)
- **Editor:** Monaco Editor
- **Build Tool:** Vite
- **Testing:** Vitest
- **Rendering:** SVG (generated programmatically)
- **AI Integration:** OpenAI Chat API (GPT-3.5/GPT-4)
- **Runtime:** Node.js >= 20.10.0 (REQUIRED - Langium 4.x compatibility)
- **Package Manager:** npm >= 10.2.3
- **Module System:** ESM (ES Modules)

## Prerequisites
**⚠️ IMPORTANT:** This project requires Node.js >= 20.10.0 and npm >= 10.2.3 due to Langium 4.x dependencies.

Check your versions:
```bash
node --version  # Must be >= v20.10.0
npm --version   # Must be >= 10.2.3
```

If you need to switch Node versions, use nvm or volta:
```bash
# Using nvm
nvm install 20
nvm use 20

# Using volta (recommended for this project)
volta install node@20
```

## Project Conventions

### Code Style
- **TypeScript:** Strict mode enabled with `noUnusedLocals`, `noImplicitReturns`, `noImplicitOverride`
- **File Extensions:** Use `.js` in import paths (TypeScript resolves them correctly with NodeNext module resolution)
- **Naming:**
  - Files: kebab-case (e.g., `openai-chat.ts`)
  - Types/Interfaces: PascalCase (e.g., `EditorInstance`, `Floorplan`)
  - Functions/Variables: camelCase
- **Comments:** Use `#` for single-line and `/* */` for multi-line in the DSL; standard `//` and `/* */` in TypeScript

### Architecture Patterns
- **Monorepo Structure:** npm workspaces with four packages:
  - Root package: Web demo app (Vite-based)
  - `language/`: Langium grammar and parser (standalone package)
  - `mcp-server/`: Model Context Protocol server for AI assistant integration
  - `viewer/`: Three.js-based 3D floorplan viewer
- **Separation of Concerns:**
  - Grammar definition (`floorplans.langium`) → Parser generation
  - Renderer (`src/renderer.ts`) → SVG output
  - Editor (`src/editor.ts`) → Monaco integration
  - Room/floor components (`src/room/`, `src/floor/`) → SVG generators for specific elements
- **Entry Point:** `src/app.ts` bootstraps the web application

### Testing Strategy
- **Framework:** Vitest
- **Location:** Tests live in `language/test/` for parser tests
- **Approach:** Parse input strings and assert on the resulting AST structure
- **Commands:**
  - `npm run test` (runs tests via workspaces)
  - Tests focus on grammar parsing correctness

### Git Workflow
- Standard feature branch workflow
- GitHub Pages deployment for the demo app

## Domain Context
### Floorplan DSL Syntax
The DSL defines floorplans with:
- **Floors:** Container for rooms (`floor f1 { ... }`)
- **Rooms:** Positioned elements with walls (`room Name at (x,y) size (w x h) walls [...]`)
- **Sub-rooms:** Nested rooms via `composed of [...]`
- **Wall Types:** `solid`, `door`, `window`, `open`
- **Connections:** Link rooms/walls (`connect Room1.wall to Room2.wall door`)

#### Grammar Versioning

**Current Version:** 1.0.0

The floorplan DSL follows [semantic versioning](https://semver.org/) for grammar compatibility:
- **MAJOR** version: Breaking changes (incompatible syntax changes)
- **MINOR** version: New features (backward compatible)
- **PATCH** version: Bug fixes (no grammar changes)

**Version Declaration:**

You can declare the grammar version in two ways:

1. **YAML Frontmatter** (recommended for files with metadata):
```floorplan
---
version: "1.0"
title: My Villa
---
floorplan
  floor f1 {
    room Office at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
```

2. **Inline Directive** (recommended for simple files):
```floorplan
%%{version: 1.0}%%
floorplan
  floor f1 {
    room Office at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
```

**Version Behavior:**
- **No version declared:** Parser assumes current version (1.0.0) and emits a warning
- **Compatible version:** File is parsed successfully
- **Incompatible version:** Parser emits an error with migration guidance
- **Future version:** Parser rejects the file (upgrade parser first)

**Deprecation Lifecycle:**

Features follow a deprecation lifecycle:
1. **v1.0:** Feature introduced
2. **v1.1:** Feature deprecated (warning emitted, still works)
3. **v2.0:** Feature removed (error if used)

**Migration:**

Use the migration utilities to upgrade between versions:
```typescript
import { migrate } from 'floorplans-language';

const result = migrate(content, '2.0.0');
if (result.success) {
  console.log(result.content); // Migrated floorplan
}
```

See `language/CHANGELOG.md` for version history and planned deprecations.

Example (basic):
```
floorplan
  floor f1 {
    room Office at (0,0) size (10 x 12) walls [top: solid, right: window, bottom: door, left: solid]
  }
```

### Key Domain Terms
- **Wall Direction:** `top`, `right`, `bottom`, `left`
- **Wall Spec:** Defines the type of each wall for a room
- **Connection:** Links two rooms/walls, specifying door type, position, swing direction, and which room the door opens into
- **Relative Positioning:** Position rooms relative to other rooms using directional keywords (`right-of`, `below`, etc.) instead of absolute coordinates
- **Gap:** Spacing between relatively positioned rooms (default: 0)
- **Alignment:** Edge alignment for relatively positioned rooms (`top`, `bottom`, `left`, `right`, `center`)
- **Door Type:** `door` (single) or `double-door` (two mirrored swing arcs)
- **Swing Direction:** `left` or `right` - controls which way the door arc swings
- **Opens Into:** Specifies which room the door opens toward (determines swing direction automatically)
- **Multi-Floor:** Multiple floors defined in a single floorplan, rendered individually or together
- **Variables:** Named dimension values defined with `define` keyword for reuse across rooms
- **Config Block:** Global configuration for rendering defaults (wall thickness, door width, etc.)
- **3D Viewer:** Three.js-based visualization with CSG wall rendering and camera controls
- **Exploded View:** 3D viewer mode that vertically separates floors to reveal layouts underneath

## Important Constraints
- Parser must be regenerated when grammar changes (`npm run langium:generate`)
- Monaco editor requires specific language registration and monarch tokenizer config
- OpenAI API key is stored in localStorage (user-provided, not bundled)
- SVG viewBox is calculated dynamically based on room bounds

## Development Setup

### Prerequisites
- **Node.js 20+** required (use nvm or Volta to manage versions)
- npm 10.x recommended

### Quick Start
```bash
# 1. Switch to Node 20+ (if using nvm)
nvm use 20

# 2. Install dependencies
npm install

# 3. Generate parser from grammar (required before first run)
npm run langium:generate

# 4. Build the language workspace
npm run build --workspaces

# 5. Start dev server
npm run dev
# Opens at http://localhost:5173/mermaid-floorplan/
```

### Common Issues
- **"Invalid URL" error during langium:generate:** Node.js version is below 20. Switch using `nvm use 20`.
- **"Failed to resolve entry for package 'floorplans-language'":** Run `npm run build --workspaces` before `npm run dev`.
- **Port in use:** Vite auto-selects next available port (5174, 5175, etc.)
- **"Maximum call stack size exceeded" when running tests in Cursor:** This is a Cursor sandbox restriction, NOT a code bug. The sandbox blocks certain file system operations required by vitest workers. Run tests outside the sandbox or use `required_permissions: ["all"]` in AI tool calls.

### Key Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Full build (langium + workspaces + vite) |
| `npm run langium:generate` | Regenerate parser from grammar |
| `npm run test` | Run parser tests |
| `npm run mcp:build` | Build the MCP server |
| `npm run mcp:start` | Start the MCP server (stdio transport) |
| `npm run viewer` | Build and open the 3D viewer |

## DSL Reference

### Complete Syntax Example
```
floorplan
  # Variables for reusable dimensions
  define standard_room (10 x 12)
  define small_room (6 x 8)
  
  # Global configuration
  config { wall_thickness: 0.3, door_size: (1.0 x 2.1), window_size: (1.5 x 1.5) }
  
  floor f1 {
    # Absolute positioning with variable size
    room Office at (0,0) size standard_room walls [top: solid, right: solid, bottom: solid, left: solid] label "main workspace"
    
    # Relative positioning - Kitchen below Office with 2-unit gap
    room Kitchen size (10 x 8) walls [top: solid, right: solid, bottom: solid, left: window] below Office gap 2 label "break area"
    
    # Relative positioning - FlexArea to the right of Office, aligned at top
    room FlexArea size (20 x 22) walls [top: open, right: solid, bottom: open, left: solid] right-of Office align top composed of [
      sub-room PhoneBooth1 at (3,5) size (3 x 3) walls [top: window, right: solid, bottom: door, left: solid]
      sub-room PhoneBooth2 at (9,5) size (3 x 3) walls [top: window, right: solid, bottom: door, left: solid]
    ]
    
    # Connections between rooms
    connect Office.bottom to Kitchen.top door at 50% swing: left
    connect Office.right to FlexArea.left double-door at 50%
  }
  
  floor f2 {
    room Bedroom at (0,0) size standard_room walls [top: solid, right: window, bottom: solid, left: solid]
    room Bathroom size small_room walls [top: solid, right: solid, bottom: solid, left: solid] right-of Bedroom
    
    connect Bedroom.right to Bathroom.left door at 30% opens into Bathroom
  }
```

### Variables and Configuration
| Feature | Syntax | Example |
|---------|--------|---------|
| Define variable | `define <name> (w x h)` | `define standard_bed (12 x 12)` |
| Use variable | `size <name>` | `size standard_bed` |
| Config block | `config { key: value, ... }` | `config { wall_thickness: 0.3 }` |
| Floor height | `floor <id> height <n> { ... }` | `floor Ground height 4.0 { ... }` |

**Supported config keys:**
| Key | Description | Default |
|-----|-------------|---------|
| `wall_thickness` / `wallThickness` | Wall thickness in units | 0.2 |
| `floor_thickness` / `floorThickness` | Floor slab thickness | 0.2 |
| `default_height` / `defaultHeight` | Default wall/ceiling height | 3.35 |
| `door_width` / `doorWidth` | Standard door width (legacy) | 1.0 |
| `door_height` / `doorHeight` | Standard door height (legacy) | 2.1 |
| `door_size` / `doorSize` | Door size as `(width x height)` | None |
| `window_width` / `windowWidth` | Standard window width (legacy) | 1.5 |
| `window_height` / `windowHeight` | Standard window height (legacy) | 2.1 |
| `window_size` / `windowSize` | Window size as `(width x height)` | None |
| `window_sill` / `windowSill` | Window sill height from floor | 0.9 |
| `default_style` / `defaultStyle` | Default style name for rooms | None |
| `default_unit` / `defaultUnit` | Default length unit (`m`, `ft`, `cm`, `in`, `mm`) | `m` |
| `area_unit` / `areaUnit` | Area display unit (`sqm`, `sqft`) | `sqft` |
| `theme` | Color theme (`default`, `dark`, `blueprint`) | `default` |
| `darkMode` / `dark_mode` | Dark mode toggle (`true`/`false`) | `false` |
| `fontFamily` / `font_family` | Font family for labels | System default |
| `fontSize` / `font_size` | Font size for labels (number) | 14 |
| `showLabels` / `show_labels` | Show room labels (`true`/`false`) | `true` |
| `showDimensions` / `show_dimensions` | Show dimension annotations (`true`/`false`) | `true` |

**Naming Convention:** Both `snake_case` (e.g., `wall_thickness`) and `camelCase` (e.g., `wallThickness`) are accepted. Internally normalized to camelCase.

**Height resolution priority:** Room height > Floor height > Config `default_height` > Constant (3.35)

### Styles and Materials
Styles define reusable visual properties for rooms. Define styles once, apply to multiple rooms.

```
floorplan
  style Modern {
    floor_color: "#E0E0E0",
    wall_color: "#909090",
    roughness: 0.5
  }
  
  style Rustic {
    floor_color: "#8B4513",
    floor_texture: "textures/oak.jpg",
    wall_color: "#D2B48C"
  }
  
  config { default_style: Modern }
  
  floor Ground {
    room Kitchen at (0,0) size (10 x 10) walls [...] style Rustic
    room Office at (10,0) size (8 x 10) walls [...]  # uses Modern (default)
  }
```

**Style Properties:**
| Property | Type | Description | Target |
|----------|------|-------------|--------|
| `floor_color` | Hex string | Floor fill color (e.g., `"#8B4513"`) | SVG + 3D |
| `wall_color` | Hex string | Wall fill color | SVG + 3D |
| `floor_texture` | URL string | Floor texture path (e.g., `"textures/oak.jpg"`) | 3D only |
| `wall_texture` | URL string | Wall texture path | 3D only |
| `roughness` | Number 0-1 | PBR roughness | 3D only |
| `metalness` | Number 0-1 | PBR metalness | 3D only |

**Style Resolution Order:**
1. Room's explicit `style <name>` clause
2. `default_style` from config block
3. Built-in defaults (floor: #E0E0E0, wall: #000000)

**Notes:**
- SVG rendering: Uses colors only (textures are ignored)
- 3D viewer: Supports colors, textures, and PBR properties
- Styles are floorplan-scoped (available to all floors)

### Room Properties
| Property | Syntax | Example |
|----------|--------|---------|
| Position (absolute) | `at (x,y)` | `at (0,0)` |
| Position (relative) | `<direction> <RoomRef> [gap N] [align <edge>]` | `right-of Kitchen gap 2 align top` |
| Size (inline) | `size (w x h)` | `size (10 x 12)` |
| Size (variable) | `size <varname>` | `size standard_room` |
| Walls | `walls [top: T, right: T, bottom: T, left: T]` | `walls [top: solid, right: door, bottom: window, left: open]` |
| Label | `label "text"` | `label "cozy room"` |
| Style | `style <name>` | `style Modern` |
| Sub-rooms | `composed of [...]` | See FlexArea example above |

### Relative Positioning Directions
| Keyword | Placement |
|---------|-----------|
| `right-of` | Place room's left edge at reference's right edge |
| `left-of` | Place room's right edge at reference's left edge |
| `above` | Place room's bottom edge at reference's top edge |
| `below` | Place room's top edge at reference's bottom edge |
| `above-right-of` | Diagonal: above and to the right |
| `above-left-of` | Diagonal: above and to the left |
| `below-right-of` | Diagonal: below and to the right |
| `below-left-of` | Diagonal: below and to the left |

### Wall Type Rendering
| Type | Visual | Description |
|------|--------|-------------|
| `solid` | Thick black line | Standard wall |
| `door` | Gap with swing arc | Single door opening with swing direction |
| `double-door` | Gap with two mirrored arcs | Double door with arcs opening in opposite directions |
| `window` | Dashed line | Glass/window wall |
| `open` | No line | Open space (no wall) |

### Connection Syntax
Connections link rooms with doors at wall intersections:
```
connect <Room1>.<wall> to <Room2>.<wall> <door-type> [at <position>%] [size (<width> x <height>)] [swing: <direction>] [opens into <Room>]
```

| Property | Values | Example |
|----------|--------|---------|
| Door Type | `door`, `double-door`, `opening` | `door` |
| Size | `(width x height)` or `(width x full)` | `size (3ft x 7ft)` |
| Position | `at N%` (0-100) | `at 50%` |
| Swing | `swing: left`, `swing: right` | `swing: left` |
| Opens Into | `opens into <RoomName>` | `opens into Kitchen` |

**Door Types:**
- `door` - Single door with swing arc
- `double-door` - Two mirrored swing arcs  
- `opening` - Doorless passage/archway (cuts hole in wall without door mesh)

Example:
```
connect Office.right to Kitchen.left door at 50% swing: left
connect LivingRoom.bottom to Hallway.top double-door at 50%
connect LivingRoom.bottom to Passage.top opening at 30%  # Doorless archway

# Custom door size
connect Bedroom.left to Closet.right door at 50% size (2.5ft x 7ft)

# Full-height opening (archway to ceiling)
connect Living.bottom to Entry.top opening at 50% size (4ft x full)
```

**Connection Size:** The optional `size` attribute overrides global door dimensions for individual connections:
- `size (width x height)` - Custom door/opening dimensions
- `size (width x full)` - Full-height opening from floor to ceiling

**Opening Connections:** The `opening` type creates a doorless passage between rooms. It:
- Cuts a hole in the wall without rendering a door
- Overrides wall type conflicts (no warning if one wall is `solid` and the other is `open`)
- Useful for archways, pass-throughs, and open-plan layouts where rooms share partial boundaries

**Door Position Calculation:** The `at N%` position is calculated as a percentage of the **shared wall segment** between the two connected rooms, not the full wall length. This means:

- `at 50%` = door centered on the shared boundary between the two rooms
- When a wall is shared by multiple rooms (e.g., a long wall with two adjacent rooms on the other side), each connection calculates its position relative to its own overlap segment
- This allows intuitive positioning: `at 50%` always centers the door regardless of room size differences

```
Example: LivingRoom (12ft wide) connects to Kitchen (8ft) and Passage (4ft)

┌─────────────────────────────────────┐
│      LivingRoom (12ft bottom wall)  │
└─────────────────────────────────────┘
    ┌──────────────┬──────────────────┐
    │  Passage 4ft │   Kitchen 8ft    │
    └──────────────┴──────────────────┘

connect LivingRoom.bottom to Kitchen.top door at 80%
  → Door at 80% of Kitchen's 8ft overlap (not 80% of 12ft wall)

connect LivingRoom.bottom to Passage.top door at 50%
  → Door at 50% of Passage's 4ft overlap (centered in Passage)
```

**Connection Overlap Validation:** The parser validates that connections do not overlap at the same physical position on a wall. This prevents:
- Bidirectional connections (e.g., `RoomA.right → RoomB.left` AND `RoomB.left → RoomA.right`)
- Multiple connections at the same position percentage on the same wall segment
- Door widths overlapping (single-door = 1 unit, double-door = 1.5 units)

### Multi-Floor Rendering
When a floorplan contains multiple floors:
- **Default:** Only the first floor (index 0) is rendered
- **Specific floor:** Use `floorIndex` option to render a specific floor
- **All floors:** Use `renderAllFloors` with layout `stacked` (vertical) or `sideBySide` (horizontal)
- **Floor labels:** Displayed above each floor when rendering multiple floors

### 3D Viewer
The project includes a Three.js-based 3D viewer (`viewer/`) for visualizing floorplans:
- **CSG Rendering:** Uses Constructive Solid Geometry for clean wall joints and door/window cutouts
- **Camera Controls:** OrbitControls for rotating, panning, and zooming
- **Exploded View:** Slider to vertically separate floors for multi-story inspection
- **Configurable Dimensions:** Uses DSL `config` block values for wall thickness, heights, door/window sizes
- **Per-Floor Heights:** Supports different ceiling heights per floor via `floor <id> height <n> { ... }`
- **Run:** `npm run viewer` builds and opens the 3D visualization

## Live Editing Behavior
The app provides **real-time SVG rendering**:
- Changes in the Monaco editor instantly update the SVG visualization
- Parser validates syntax and highlights errors
- SVG viewBox dynamically adjusts to fit all rooms
- Room labels and dimensions are displayed inside each room

## External Dependencies
- **OpenAI API:** Chat completions for AI-assisted floorplan editing
- **GitHub Pages:** Hosts the demo application
- **CDN:** Monaco Editor assets (bundled via Vite)
