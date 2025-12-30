## Why

The current floorplan DSL uses a custom `config { key: value }` syntax that differs from Mermaid.js's configuration conventions. Aligning with Mermaid's configuration patterns would:
1. Improve consistency for users familiar with Mermaid diagrams
2. Enable future upstream contribution to Mermaid.js
3. Support YAML frontmatter for configuration (Mermaid v10.5.0+)
4. Distinguish between site-level defaults and diagram-level overrides

## What Changes

### Syntax Changes

1. **YAML Frontmatter Support** - Add optional YAML frontmatter block at the start of diagrams:
   ```
   ---
   title: Villa Layout
   config:
     theme: blueprint
     wallThickness: 0.3
     floorplan:
       doorWidth: 1.0
       windowHeight: 1.5
   ---
   floorplan
     floor Ground { ... }
   ```

2. **Directive Support (deprecated path, but compatible)** - Support `%%{init: {...}}%%` directives inline:
   ```
   %%{init: {"floorplan": {"wallThickness": 0.3}}}%%
   floorplan
     floor Ground { ... }
   ```

3. **Keep Current Config Block** - Maintain existing `config { ... }` syntax as a valid alternative (diagram-local config), but namespace it under `floorplan` in frontmatter context.

### Configuration Hierarchy

Following Mermaid's pattern:
1. **Default Config** - Built-in defaults (wall_thickness: 0.2, etc.)
2. **Site Config** - Set via API `initialize()` call (not DSL)
3. **Diagram Config** - Frontmatter or `config { }` block in the diagram

### Property Naming Convention

| Current (snake_case) | Mermaid-aligned (camelCase) | 
|---------------------|----------------------------|
| `wall_thickness` | `wallThickness` |
| `floor_thickness` | `floorThickness` |
| `default_height` | `defaultHeight` |
| `door_width` | `doorWidth` |
| `door_height` | `doorHeight` |
| `window_width` | `windowWidth` |
| `window_height` | `windowHeight` |
| `window_sill` | `windowSill` |
| `default_style` | `defaultStyle` |

**Migration:** Accept both snake_case and camelCase during transition period (normalize internally).

### New Top-Level Config Properties

Align with Mermaid's global configuration options:

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `theme` | string | Theme preset name | `"default"` |
| `fontFamily` | string | Font for labels | `"Arial, sans-serif"` |
| `fontSize` | number | Base font size (px) | `12` |
| `logLevel` | number | 0-5, debugging verbosity | `2` |
| `secure` | string[] | Properties that cannot be overridden | `[]` |

### Floorplan-Specific Config (nested under `floorplan:`)

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `wallThickness` | number | Wall thickness in units | `0.2` |
| `floorThickness` | number | Floor slab thickness | `0.2` |
| `defaultHeight` | number | Default wall height | `3.35` |
| `doorWidth` | number | Standard door width | `1.0` |
| `doorHeight` | number | Standard door height | `2.1` |
| `windowWidth` | number | Standard window width | `1.5` |
| `windowHeight` | number | Standard window height | `1.5` |
| `windowSill` | number | Window sill height | `0.9` |
| `defaultStyle` | string | Default style name | `null` |
| `showLabels` | boolean | Display room labels | `true` |
| `showDimensions` | boolean | Display dimension annotations | `false` |
| `dimensionUnit` | string | Unit for dimensions display | `"m"` |

## Impact

- **Affected specs:** `dsl-grammar`
- **Affected code:** 
  - `language/src/diagrams/floorplans/floorplans.langium` - Grammar updates
  - `language/src/diagrams/floorplans/renderer.ts` - Config resolution
  - `language/src/floorplans-validator.ts` - Validation rules
  - `viewer/src/dsl-parser.ts` - 3D viewer config handling
- **Breaking changes:** None (existing syntax remains valid, new syntax is additive)
- **Migration path:** Accept both naming conventions during transition

## Non-Goals

- Full Mermaid.js API compatibility (e.g., `mermaid.initialize()`) - that's for upstream contribution
- D3-based rendering - not needed for coordinate-based diagrams (per mermaid-alignment context)
- Directive deprecation - keep both frontmatter and inline config supported

