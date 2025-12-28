<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Project Architecture

### Mermaid-Aligned Floorplan DSL

This project implements a floorplan diagram DSL following [Mermaid.js conventions](https://mermaid.js.org/community/new-diagram.html).

### Package Structure

```
language/                           # floorplans-language (npm package)
├── src/diagrams/floorplans/        # ← Diagram folder (grammar + rendering together)
│   ├── floorplans.langium          # Langium grammar
│   ├── renderer.ts                 # render(), renderFloor(), renderToFile()
│   ├── styles.ts                   # getStyles(), theme presets
│   └── floor.ts, room.ts, ...      # Component renderers
├── src/generated/                  # Langium-generated AST types
└── src/index.ts                    # Package exports

mcp-server/                         # floorplans-mcp-server (AI tools)
├── src/tools/                      # render_floorplan, validate_floorplan, modify_floorplan
└── src/utils/renderer.ts           # Imports from floorplans-language + svgToPng

src/                                # Web app (Monaco editor)
└── renderer.ts                     # Imports from floorplans-language
```

### Single Source of Truth

All rendering code lives in `language/src/diagrams/floorplans/`. Consumers import:

```typescript
import { render, renderToFile, getStyles, createFloorplansServices } from "floorplans-language";
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
