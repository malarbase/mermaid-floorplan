## Project Architecture

### Mermaid-Aligned Floorplan DSL

This project implements a floorplan diagram DSL following [Mermaid.js conventions](https://mermaid.js.org/community/new-diagram.html).

### Package Structure

```
floorplan-language/                 # floorplan-language (npm package)
├── src/diagrams/floorplans/        # ← Diagram folder (grammar + rendering together)
│   ├── floorplans.langium          # Langium grammar
│   ├── renderer.ts                 # render(), renderFloor(), renderToFile()
│   ├── styles.ts                   # getStyles(), theme presets
│   └── floor.ts, room.ts, ...      # Component renderers
├── src/generated/                  # Langium-generated AST types
└── src/index.ts                    # Package exports

floorplan-mcp-server/               # floorplans-mcp-server (AI tools)
├── src/tools/                      # render_floorplan, validate_floorplan, modify_floorplan
└── src/utils/renderer.ts           # Imports from floorplan-language + svgToPng

src/                                # Web app (Monaco editor)
└── renderer.ts                     # Imports from floorplan-language

floorplan-app/                      # SolidStart full-stack app
├── src/routes/                     # File-based routing
├── src/components/                 # Solid.js UI components
├── src/lib/                        # Auth, utilities
└── convex/                         # Convex database schema and functions
```

### Single Source of Truth

All rendering code lives in `language/src/diagrams/floorplans/`. Consumers import:

```typescript
import { render, renderToFile, getStyles, createFloorplansServices } from "floorplan-language";
```

### Key Files

| File | Purpose |
|------|---------|
| `language/src/diagrams/floorplans/floorplans.langium` | Grammar definition |
| `language/src/diagrams/floorplans/renderer.ts` | SVG rendering |
| `language/src/diagrams/floorplans/styles.ts` | Theming |
| `language/langium-config.json` | Langium configuration |

### Related Context

For Mermaid alignment details, see:
- `openspec/changes/mermaid-alignment/context.md` - Full comparison with Mermaid PR #4839
- `openspec/changes/mermaid-alignment/quick-reference.md` - Quick reference

### Build & Test

```bash
npm run langium:generate   # Regenerate parser (after grammar changes)
npm run build              # Build all packages
npm test                   # Run all tests
make dev                   # Start default dev server
```

## Context Index

Before working on files in a specific package, read the corresponding context file:

| Directory | Context file | What it covers |
|-----------|-------------|----------------|
| `floorplan-language/**` | `docs/context/language.md` | Grammar, Langium, rendering API |
| `floorplan-viewer-core/**`, `floorplan-viewer/**`, `floorplan-editor/**` | `docs/context/viewer-core.md` | Solid.js/Three.js architecture, FloorplanAppCore |
| `floorplan-app/**` | `docs/context/floorplan-app.md` | SolidStart, Convex, versioning model |
| `floorplan-mcp-server/**` | `docs/context/mcp-server.md` | MCP tools, svgToPng pipeline |

Or run: `python3 scripts/context_for.py --auto` to get relevant context based on modified files.
