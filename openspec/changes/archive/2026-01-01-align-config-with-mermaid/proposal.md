## Why

The floorplan DSL has a theme system in code (`styles.ts` with `darkTheme`, `blueprintTheme` presets) but no way for users to select themes from the DSL. This gap prevents diagram authors from customizing rendering without API access. Additionally, aligning with Mermaid.js configuration patterns would:
1. Enable future upstream contribution to Mermaid.js
2. Support YAML frontmatter for diagram metadata (Mermaid v10.5.0+)
3. Allow theme selection directly in floorplan files
4. Provide consistent configuration experience across 2D and 3D viewers

## What Changes

### 1. Theme Selection in Config Block

Add `theme` as a valid config property:

```
floorplan
  config { theme: dark, wall_thickness: 0.3 }
  floor Ground { ... }
```

Supported theme values: `default`, `dark`, `blueprint` (matching existing presets in `styles.ts`).

### 2. Dark Mode Toggle (Mermaid-aligned)

Add `darkMode` boolean property matching [Mermaid's config schema](https://mermaid.js.org/config/schema-docs/config):

```
config { darkMode: true }
```

When `darkMode: true`, the system uses the dark theme preset. This provides a quick toggle without specifying a full theme name.

### 3. YAML Frontmatter Support

Add support for YAML frontmatter at the start of diagrams for Mermaid compatibility:

```yaml
---
title: Villa Layout
config:
  theme: blueprint
  fontFamily: "Roboto, sans-serif"
  wallThickness: 0.3
---
floorplan
  floor Ground { ... }
```

**Key alignment**: Frontmatter uses **camelCase** (Mermaid convention), while inline config keeps **snake_case** (existing DSL convention). Both are normalized internally.

### 4. Naming Convention Support

Support both naming conventions to align with Mermaid while maintaining backward compatibility:

| Mermaid (camelCase) | Floorplan DSL (snake_case) | Normalized Key |
|---------------------|----------------------------|----------------|
| `fontFamily` | `font_family` | `fontFamily` |
| `fontSize` | `font_size` | `fontSize` |
| `wallThickness` | `wall_thickness` | `wallThickness` |
| `showLabels` | `show_labels` | `showLabels` |
| `showDimensions` | `show_dimensions` | `showDimensions` |
| `darkMode` | `dark_mode` | `darkMode` |

- **Frontmatter**: Prefer camelCase (Mermaid-native context)
- **Inline config**: Accept both, normalize to camelCase internally
- **Existing floorplans**: Continue to work unchanged

### 5. Font Configuration

Add font properties matching [Mermaid's FontConfig](https://mermaid.js.org/config/schema-docs/config):

```
config { fontFamily: "Roboto, sans-serif", fontSize: 14 }
```

Or snake_case:
```
config { font_family: "Roboto", font_size: 14 }
```

### 6. Display Toggle Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `showLabels` / `show_labels` | boolean | Display room name labels | `true` |
| `showDimensions` / `show_dimensions` | boolean | Display dimension annotations | `false` |

### 7. 3D Viewer Theme Controls

Add UI controls to the 3D viewer for toggling visual themes:

- **Background theme toggle** (light/dark) - Changes scene background color
- **Sync with DSL** - When `darkMode` or `theme` is set in DSL, 3D viewer respects it
- **Override control** - UI toggle allows temporary override without modifying DSL

Current hardcoded background (`COLORS.BACKGROUND: 0xf5f5f7`) will become configurable.

## Impact

- **Affected specs:** `dsl-grammar`, `3d-viewer`
- **Affected code:**
  - `language/src/diagrams/floorplans/floorplans.langium` - Add new CONFIG_KEY values
  - `language/src/diagrams/floorplans/renderer.ts` - Config normalization and theme resolution
  - `language/src/diagrams/floorplans/styles.ts` - Theme registry lookup
  - `viewer/src/main.ts` - Theme toggle controls
  - `viewer/src/constants.ts` - Dark theme colors
  - Optional: Frontmatter parsing layer
- **Breaking changes:** None (all changes are additive)

## Mermaid Schema Alignment

Properties aligned with [Mermaid Config Schema](https://mermaid.js.org/config/schema-docs/config):

| Mermaid Property | Floorplan Support | Notes |
|------------------|-------------------|-------|
| `theme` | ✅ Yes | `default`, `dark`, `blueprint` |
| `darkMode` | ✅ Yes | Quick toggle for dark theme |
| `fontFamily` | ✅ Yes | String, CSS font stack |
| `fontSize` | ✅ Yes | Number (SVG units) |
| `themeVariables` | ❌ Future | Custom color overrides |
| `themeCSS` | ❌ Future | Custom CSS injection |

## Current State Reference

**Existing themes** (from `styles.ts`):
- `defaultThemeOptions` - Light theme with beige floor
- `darkTheme` - Dark background with light walls
- `blueprintTheme` - Blue background with light blue lines

**Existing config keys** (from grammar):
```
'wall_thickness' | 'floor_thickness' | 'default_height' |
'door_width' | 'door_height' | 'door_size' |
'window_width' | 'window_height' | 'window_sill' | 'window_size' |
'default_style' | 'default_unit' | 'area_unit'
```

**3D Viewer background** (from `constants.ts`):
```typescript
BACKGROUND: 0xf5f5f7  // Light gray, hardcoded
```
