# Learnings - Unify Theme System

- `floorplan-viewer-core` uses `src/ui/styles.ts` to inject CSS into the document head. This file contains a string constant `SHARED_STYLES` which mirrors `src/ui/shared-styles.css`.
- The legacy theme system relied on `body.dark-theme` class.
- The new theme system uses `data-theme` attribute (compatible with DaisyUI).
- Migrated styles to use CSS variables defined in `:root` and `[data-theme="dark"]`.
- Maintained backward compatibility by including `body.dark-theme` selector for the variable definitions.
- `BaseViewer` (and its subclasses `FloorplanAppCore`, `InteractiveEditorCore`) manages the theme state and applies it to the document body class. Updated it to also set `data-theme` attribute.
- Standalone apps (`floorplan-editor`, `floorplan-viewer`) also had some manual theme toggling logic which was updated.
- Hardcoded colors (especially the blue accent `#4a90d9`) were replaced with CSS variables, with the accent updated to cyan (`oklch(75% 0.18 195)`).

## Viewer Architecture Refactoring

Refactored the monolithic `FloorplanEmbed` into a composed architecture:

- **`FloorplanContainer`**: Orchestrates mode detection (Basic/Advanced/Editor), auth checks, and UI initialization.
- **`FloorplanBase`**: Handles the low-level WebGL canvas, core instantiation, and lifecycle management. It supports switching between `FloorplanAppCore` (viewer) and `InteractiveEditorCore` (editor) via props.
- **`ViewerError`**: Dedicated error boundary for the viewer.
- **`skeletons`**: Loading states for different parts of the UI.
- **`FloorplanEmbed`**: Retained as a backward-compatible alias wrapping `FloorplanContainer`.

### Learnings
- Separating the container logic from the rendering logic makes it easier to support multiple modes (viewer vs editor) without duplicating the canvas management code.
- Dynamic imports for the cores are handled in `FloorplanBase` based on the `useEditorCore` prop, keeping the initial bundle size smaller.
- Mode detection logic prioritizes props -> URL params -> default, allowing for flexible embedding scenarios.

## Viewer Controls Implementation
- Created `ControlPanels.tsx` using `floorplan-viewer-core` factory functions.
- Factory functions (`createCameraControlsUI`, etc.) return vanilla DOM elements, which we append to a container ref in Solid `onMount`.
- Used dynamic `import("floorplan-viewer-core")` inside `onMount` to ensure lazy loading and avoid SSR issues with Three.js/browser-only code.
- `floorplan-3d-core` types are not directly accessible in `floorplan-app` (unless added to dependencies), so we used local helpers or loose typing where necessary.
- `createControlPanel` creates a container with its own styles, so we just append it to a wrapper div.

## EditorBundle Component Implementation

### Components Created
- **EditorPanel.tsx**: Monaco DSL editor with lazy loading and EditorViewerSync integration
- **SelectionControls.tsx**: Add room, copy, focus, delete buttons with selection state
- **PropertiesPanel.tsx**: Dynamic property editor based on entity type (room/furniture)
- **AddRoomDialog.tsx**: DaisyUI modal for adding new rooms with form validation
- **DeleteConfirmDialog.tsx**: Simple confirmation dialog for delete operations
- **EditorBundle.tsx**: Orchestrator component combining all editor features

### Key Patterns
- Used dynamic imports for Monaco and EditorViewerSync to ensure lazy loading (~1.2MB bundle)
- EditorViewerSync handlers bind editor cursor to 3D selection bidirectionally
- Parser integration uses `parseFloorplanDSL` from floorplan-viewer-core
- All dialogs use DaisyUI modal pattern with `modal-open` classList binding

### Dependencies
- Added `floorplan-editor`, `three`, `three-bvh-csg`, `three-mesh-bvh` to package.json
- These are peer dependencies of floorplan-3d-core needed at app level for bundling
- floorplan-editor has `noEmit: true` so TypeScript shows errors but Vite bundles correctly

### Build Verification
- `bun run build` passes (exit 0) despite IDE TypeScript errors
- Monaco and editor modules are lazy-loaded via dynamic imports in onMount
- Build output shows successful bundling with ~393KB server bundle
