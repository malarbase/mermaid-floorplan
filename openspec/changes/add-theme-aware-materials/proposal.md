## Why

The 3D viewer now supports theme selection (dark, blueprint, light) via DSL config, but only the scene background color changes. The materials for floors, walls, doors, and windows remain static regardless of theme. This creates visual inconsistency - a dark theme with bright white floors looks jarring.

Per-room styles (configured in the DSL) should take precedence, but when no explicit style is set, materials should inherit from the active theme's color palette.

## What Changes

### 1. Theme-Aware Default Materials

When rendering a room without an explicit style:
- Use `getThemeColors(currentTheme)` to get the active color palette
- Apply theme colors to floor, wall, door, and window materials
- Rebuild materials when theme changes

### 2. Dynamic Material Updates

On theme change (`setTheme()`):
- Regenerate materials for all non-styled rooms
- Preserve materials for rooms with explicit styles
- Update scene without full reload

### 3. Material Factory Enhancement

Update `MaterialFactory` to accept theme context:
- Add optional theme parameter to material creation
- Use theme colors as defaults when no style specified
- Maintain backward compatibility

## Impact

- **Affected specs:** `3d-viewer`
- **Affected code:**
  - `viewer/src/materials.ts` - Add theme-aware defaults
  - `viewer/src/main.ts` - Regenerate materials on theme change
  - `viewer/src/wall-generator.ts` - Pass theme context
- **Breaking changes:** None (additive only)

