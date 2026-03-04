# Language Package Context

## After Grammar Changes Workflow

```bash
npm run langium:generate && npm run build && npm test
```

## Key Files

| File | Purpose |
|------|---------|
| `floorplans.langium` | Grammar definition |
| `renderer.ts` | SVG rendering |
| `styles.ts` | Theming |
| `langium-config.json` | Langium configuration |

## Single Source of Truth

All rendering code lives in `floorplan-language/src/diagrams/floorplans/`. Consumers import:

```typescript
import { render, renderToFile, getStyles, createFloorplansServices } from "floorplan-language";
```

## Testing

Vitest in `floorplan-language/test/`. Run `npm test` from repo root or `npm run test` from `floorplan-language/`.

## Cross-Reference

See `repo-maintenance` skill for full build commands and monorepo workflows.

<!-- freshness
watches_hash: 3f26ceb
last_verified: 2026-03-04
watches:
  - floorplan-language/src/diagrams/floorplans/floorplans.langium
  - floorplan-language/src/diagrams/floorplans/renderer.ts
  - floorplan-language/src/diagrams/floorplans/styles.ts
  - floorplan-language/langium-config.json
-->
