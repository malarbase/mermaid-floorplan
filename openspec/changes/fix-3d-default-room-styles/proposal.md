## Why

The 3D viewer's floor-slab and wall-geometry generators were looking up `MaterialStyle` values by `room.name` instead of by the room's declared `style` attribute or the config block's `default_style`. This caused two problems:

1. Rooms with an explicit `style <Name>` clause received no styled materials in 3D because the lookup key was the room name, not the style name.
2. Rooms without an explicit style never fell back to `config { default_style: ... }`, so they always rendered with hard-coded built-in defaults regardless of user configuration.

The SVG renderer already handled style resolution correctly (`room.style` → `default_style` → fallback). The 3D geometry pipeline was inconsistent with that behavior.

## What Changes

### Bug fixes

- **Fixed style lookup in floor-geometry.ts**: Added a `defaultStyle` option to `FloorSlabOptions` and changed the lookup from `styleMap.get(room.name)` to `styleMap.get(room.style ?? defaultStyle ?? '')`. This makes floor slab colors respect both explicit room styles and the global default style.
- **Fixed style lookup in wall-geometry.ts**: Added a `defaultStyle` option to `WallGeneratorOptions` and applied the same lookup fix for wall materials.
- **Wired `default_style` through scene-builder.ts**: Passed `config.default_style` into the floor and wall generators so the config value actually reaches the geometry pipeline.

### Skill-critic alignment

- **Threaded `styles` through the design critic context**: Updated `buildSingleFloorContext` and `buildCriticContext` in `_critic/context.mjs` to accept and emit the floorplan's `styles` array, enabling downstream aesthetic rules to evaluate style usage.
- **Added aesthetic rules import**: Updated `_critic_lib.mjs` to import and merge `aestheticRules`, and to pass `json.data.styles` into the critic context.
- **Updated SKILL.md documentation**: Clarified that room styles and themes must be fully defined and applied to all rooms, stairs, and lifts to satisfy aesthetic validation.

### Tests

- **Added regression test in scene-builder.test.ts**: `should apply floor colors to floor slab meshes` verifies that rooms with a default style receive the correct floor slab color in the generated Three.js scene.

## Capabilities

### New Capabilities

_(none — this is a bug-fix change)_

### Modified Capabilities

- `3d-viewer`: Style resolution now matches the documented order: `room.style` → `config.default_style` → built-in defaults.

## Impact

- **Files**: `floorplan-3d-core/src/floor-geometry.ts`, `floorplan-3d-core/src/wall-geometry.ts`, `floorplan-3d-core/src/scene-builder.ts`, `floorplan-3d-core/test/scene-builder.test.ts`, `skills/mermaid-floorplan/SKILL.md`, `skills/mermaid-floorplan/scripts/_critic/context.mjs`, `skills/mermaid-floorplan/scripts/_critic_lib.mjs`, `skills/mermaid-floorplan/scripts/_critic/rules_aesthetics.mjs`
- **APIs**: No external API changes. The `FloorSlabOptions` and `WallGeneratorOptions` interfaces gained an optional `defaultStyle?: string` property.
- **Dependencies**: None added or removed.
- **Risk**: Very low — changes are localized to internal style lookup logic and are covered by a new test.
