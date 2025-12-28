# Quick Reference: Floorplan Project Structure

## TL;DR

Grammar + rendering in `language/src/diagrams/floorplans/`. All consumers import from `floorplans-language`.

## Package Overview

| Package | Purpose |
|---------|---------|
| `floorplans-language` | Langium grammar + rendering (single source of truth) |
| `floorplans-mcp-server` | AI-facing MCP tools (render, validate, modify) |
| Main app (`src/`) | Monaco editor web UI |

## Key Import Pattern

```typescript
import { 
  render,           // Document → SVG string
  renderFloor,      // Floor → SVG string  
  renderToFile,     // Floor → SVG file (with XML declaration)
  getStyles,        // Theme → CSS string
  createFloorplansServices  // Langium parser services
} from "floorplans-language";
```

## File Locations

| What | Where |
|------|-------|
| Grammar | `language/src/diagrams/floorplans/floorplans.langium` |
| Renderer | `language/src/diagrams/floorplans/renderer.ts` |
| Styles/Themes | `language/src/diagrams/floorplans/styles.ts` |
| AST Types | `language/src/generated/ast.ts` |
| Langium Config | `language/langium-config.json` |
| MCP Tools | `mcp-server/src/tools/` |

## Common Tasks

```bash
# Regenerate Langium (if grammar changes)
cd language && npx langium generate

# Build all
npm run build --workspaces

# Test
npm run test

# Generate SVGs
npx tsx scripts/generate-svg.ts TriplexVilla.floorplan
```

## Mermaid Comparison

| Mermaid | This Project |
|---------|--------------|
| `packages/parser/` | `language/` (combined) |
| `packages/mermaid/src/diagrams/{type}/` | `language/src/diagrams/floorplans/` |
| D3-based rendering | String-based SVG |
| `db.ts` state | Langium document |

## Relevant PRs

- [Mermaid PR #4839](https://github.com/mermaid-js/mermaid/pull/4839) - Packet diagram (reference implementation)

