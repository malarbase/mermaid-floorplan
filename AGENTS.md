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

All rendering code lives in `floorplan-language/src/diagrams/floorplans/`. Consumers import:

```typescript
import { render, renderToFile, getStyles, createFloorplansServices } from "floorplan-language";
```

### Key Files

| File | Purpose |
|------|---------|
| `floorplan-language/src/diagrams/floorplans/floorplans.langium` | Grammar definition |
| `floorplan-language/src/diagrams/floorplans/renderer.ts` | SVG rendering |
| `floorplan-language/src/diagrams/floorplans/styles.ts` | Theming |
| `floorplan-language/langium-config.json` | Langium configuration |

### Related Context

For Mermaid alignment details, see:
- `openspec/changes/mermaid-alignment/context.md` - Full comparison with Mermaid PR #4839
- `openspec/changes/mermaid-alignment/quick-reference.md` - Quick reference

### Build & Test

```bash
npm run langium:generate   # Regenerate parser (after grammar changes)
npm run build              # Build all packages
npm test                   # Run all tests
mise run core:dev          # Start default dev server
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

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
| ------ | ---------- |
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

<!-- freshness
watches_hash: 199e81e
last_verified: 2026-04-28
watches:
  - floorplan-language/src/index.ts
  - floorplan-language/src/diagrams/floorplans/floorplans.langium
  - floorplan-mcp-server/src/tools/**
  - floorplan-app/src/routes/**
  - docs/context/**
-->
