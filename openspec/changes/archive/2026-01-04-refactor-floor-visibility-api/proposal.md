# Refactor Floor Visibility API and Fix Door Rendering

## Why
The floor visibility control was implemented using deprecated `floorIndex`/`renderAllFloors` options that didn't integrate with the FloorManager's per-floor visibility state. Additionally, door swing directions on right walls were rendering incorrectly due to coordinate system assumptions, and the editor panel lacked resize functionality for better workspace customization.

## What Changed
- **Replaced deprecated floor rendering options** with `visibleFloors` array API that accepts floor IDs
- **Fixed door swing direction** on right walls to correctly invert left/right based on "facing from inside" perspective
- **Integrated 2D overlay with FloorManager** to respect per-floor visibility toggles
- **Added editor panel resize** capability with drag handle and CSS variable coordination
- **Deprecated old API** while maintaining backward compatibility (floorIndex/renderAllFloors still work with warnings)

## Impact
- Affected specs: `3d-viewer`, `rendering`
- Affected code:
  - `language/src/diagrams/floorplans/renderer.ts` - New visibleFloors API, deprecated old options
  - `language/src/diagrams/floorplans/door.ts` - Fixed right wall swing logic
  - `viewer/src/main.ts` - Editor resize implementation
  - `viewer/src/overlay-2d-manager.ts` - Floor visibility integration
  - `viewer/src/floor-manager.ts` - Added getVisibleFloorIds() method
  - `viewer/index.html` - Resize handle UI and CSS variables

