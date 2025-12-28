# Project Context

## Purpose
Mermaid Floorplan is a domain-specific language (DSL) for defining architectural floorplans in text format, inspired by [Mermaid.js](https://github.com/mermaid-js/mermaid/issues/6134). The project provides:

- A grammar-based parser for the floorplan DSL
- Real-time SVG rendering of floorplans
- A web-based editor with syntax highlighting
- AI-powered chat interface for natural language floorplan modifications

**Demo:** https://langalex.github.io/mermaid-floorplan

## Tech Stack
- **Language:** TypeScript (strict mode)
- **Grammar/Parsing:** Langium 4.x (DSL toolkit for TypeScript)
- **Editor:** Monaco Editor
- **Build Tool:** Vite
- **Testing:** Vitest
- **Rendering:** SVG (generated programmatically)
- **AI Integration:** OpenAI Chat API (GPT-3.5/GPT-4)
- **Runtime:** Node.js 20.x (managed via Volta)
- **Module System:** ESM (ES Modules)

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
- **Monorepo Structure:** npm workspaces with two packages:
  - Root package: Web demo app (Vite-based)
  - `language/`: Langium grammar and parser (standalone package)
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
- **Connection:** Links two rooms/walls, optionally specifying door position, swing direction, and which room the door opens into

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

### Key Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Full build (langium + workspaces + vite) |
| `npm run langium:generate` | Regenerate parser from grammar |
| `npm run test` | Run parser tests |

## DSL Reference

### Complete Syntax Example
```
floorplan
  floor f1 {
    room Office at (0,0) size (10 x 12) walls [top: solid, right: window, bottom: door, left: solid] label "main workspace"
    room Kitchen at (0,14) size (10 x 8) walls [top: solid, right: door, bottom: solid, left: window] label "break area"
    room FlexArea at (12,0) size (20 x 22) walls [top: open, right: solid, bottom: open, left: solid] composed of [
      sub-room PhoneBooth1 at (3,5) size (3 x 3) walls [top: window, right: solid, bottom: door, left: solid]
      sub-room PhoneBooth2 at (9,5) size (3 x 3) walls [top: window, right: solid, bottom: door, left: solid]
    ]
  }
```

### Room Properties
| Property | Syntax | Example |
|----------|--------|---------|
| Position | `at (x,y)` | `at (0,0)` |
| Size | `size (w x h)` | `size (10 x 12)` |
| Walls | `walls [top: T, right: T, bottom: T, left: T]` | `walls [top: solid, right: door, bottom: window, left: open]` |
| Label | `label "text"` | `label "cozy room"` |
| Sub-rooms | `composed of [...]` | See FlexArea example above |

### Wall Type Rendering
| Type | Visual | Description |
|------|--------|-------------|
| `solid` | Thick black line | Standard wall |
| `door` | Gap with arc indicator | Door opening with swing direction |
| `window` | Dashed line | Glass/window wall |
| `open` | No line | Open space (no wall) |

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
