## Why
The 3D viewer's main.ts had grown to over 1300 lines with tightly coupled concerns (camera management, annotations, floor visibility, 2D overlays) making it difficult to maintain, test, and extend.

## What Changes
- Extracted four specialized managers from monolithic viewer class:
  - **CameraManager**: Handles perspective/orthographic switching, FOV control, isometric views, and scene bounding
  - **AnnotationManager**: Manages area labels, dimension labels, floor summaries, and unit formatting
  - **FloorManager**: Controls floor visibility, UI checkboxes, and visibility state
  - **Overlay2DManager**: Handles 2D SVG overlay rendering, drag/resize, and theme synchronization
- Established callback-based dependency injection pattern for manager communication
- Reduced main.ts from ~1300 lines to ~900 lines
- Improved separation of concerns and testability

## Impact
- Affected specs: 3d-viewer
- Affected code: viewer/src/main.ts (refactored), viewer/src/*-manager.ts (new files)
- No breaking API changes - all public interfaces remain unchanged

