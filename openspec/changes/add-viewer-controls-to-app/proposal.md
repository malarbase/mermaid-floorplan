## Why

The floorplan-app's project viewer lacks essential UI controls that are available in the standalone editor/viewer apps. Users cannot adjust camera angle, lighting, floor visibility, annotations, or access the command palette. This creates a degraded experience compared to the standalone tools and limits the app's usefulness for exploring floorplans.

## What Changes

- **Mount FloorplanUI component** in FloorplanEmbed to enable the full control panel
- **Add mode-aware configuration** to show editor vs viewer controls based on context
- **Integrate with app theming** to sync the viewer's theme with the app's theme
- **Preserve existing save functionality** in FloorplanEditor while gaining new controls
- **Add keyboard shortcuts** (H for help, ⌘K for command palette)

## Impact

- Affected specs: `app-integration` (new capability)
- Affected code:
  - `floorplan-app/src/components/FloorplanEmbed.tsx` - Major changes to mount FloorplanUI
  - `floorplan-app/src/components/FloorplanEditor.tsx` - Minor adjustments for integration
  - `floorplan-app/src/routes/u/[username]/[project]/*.tsx` - Pass additional props

## Technical Approach

The `floorplan-viewer-core` package already exports a complete Solid.js UI system:
- `FloorplanUI` component with `mode="viewer"` or `mode="editor"`
- Pre-built control panels (camera, lighting, floors, annotations, 2D overlay)
- Command palette with keyboard shortcut system
- Theme toggle and keyboard help overlay

Currently, `FloorplanEmbed` only creates `FloorplanAppCore` but never mounts `FloorplanUI`. The fix is to:
1. Import `createFloorplanUI` from `floorplan-viewer-core/ui/solid`
2. Call `createFloorplanUI(appCore, { container, mode })` after instantiating `FloorplanAppCore`
3. Pass appropriate mode based on `editable` prop
4. Clean up UI on component unmount

This reuses 100% of the existing viewer-core UI code with zero duplication.
