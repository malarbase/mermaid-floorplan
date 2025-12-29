# Project Context

## Purpose
Mermaid Floorplan is a domain-specific language (DSL) for defining architectural floorplans in text format, inspired by [Mermaid.js](https://github.com/mermaid-js/mermaid/issues/6134). The project provides:

- A grammar-based parser for the floorplan DSL
- Real-time SVG rendering of floorplans
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
- **Monorepo Structure:** npm workspaces with three packages:
  - Root package: Web demo app (Vite-based)
  - `language/`: Langium grammar and parser (standalone package)
  - `mcp-server/`: Model Context Protocol server for AI assistant integration
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

Example:
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

## DSL Reference

### Complete Syntax Example
```
floorplan
  floor f1 {
    # Absolute positioning
    room Office at (0,0) size (10 x 12) walls [top: solid, right: solid, bottom: solid, left: solid] label "main workspace"
    
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
    room Bedroom at (0,0) size (12 x 14) walls [top: solid, right: window, bottom: solid, left: solid]
    room Bathroom size (6 x 8) walls [top: solid, right: solid, bottom: solid, left: solid] right-of Bedroom
    
    connect Bedroom.right to Bathroom.left door at 30% opens into Bathroom
  }
```

### Room Properties
| Property | Syntax | Example |
|----------|--------|---------|
| Position (absolute) | `at (x,y)` | `at (0,0)` |
| Position (relative) | `<direction> <RoomRef> [gap N] [align <edge>]` | `right-of Kitchen gap 2 align top` |
| Size | `size (w x h)` | `size (10 x 12)` |
| Walls | `walls [top: T, right: T, bottom: T, left: T]` | `walls [top: solid, right: door, bottom: window, left: open]` |
| Label | `label "text"` | `label "cozy room"` |
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
connect <Room1>.<wall> to <Room2>.<wall> <door-type> [at <position>%] [swing: <direction>] [opens into <Room>]
```

| Property | Values | Example |
|----------|--------|---------|
| Door Type | `door`, `double-door` | `door` |
| Position | `at N%` (0-100) | `at 50%` |
| Swing | `swing: left`, `swing: right` | `swing: left` |
| Opens Into | `opens into <RoomName>` | `opens into Kitchen` |

Example:
```
connect Office.right to Kitchen.left door at 50% swing: left
connect LivingRoom.bottom to Hallway.top double-door at 50%
```

### Multi-Floor Rendering
When a floorplan contains multiple floors:
- **Default:** Only the first floor (index 0) is rendered
- **Specific floor:** Use `floorIndex` option to render a specific floor
- **All floors:** Use `renderAllFloors` with layout `stacked` (vertical) or `sideBySide` (horizontal)
- **Floor labels:** Displayed above each floor when rendering multiple floors

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
