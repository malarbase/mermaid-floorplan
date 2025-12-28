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

## External Dependencies
- **OpenAI API:** Chat completions for AI-assisted floorplan editing
- **GitHub Pages:** Hosts the demo application
- **CDN:** Monaco Editor assets (bundled via Vite)
