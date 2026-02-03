# Learnings - Unify Theme System

- `floorplan-viewer-core` uses `src/ui/styles.ts` to inject CSS into the document head. This file contains a string constant `SHARED_STYLES` which mirrors `src/ui/shared-styles.css`.
- The legacy theme system relied on `body.dark-theme` class.
- The new theme system uses `data-theme` attribute (compatible with DaisyUI).
- Migrated styles to use CSS variables defined in `:root` and `[data-theme="dark"]`.
- Maintained backward compatibility by including `body.dark-theme` selector for the variable definitions.
- `BaseViewer` (and its subclasses `FloorplanAppCore`, `InteractiveEditorCore`) manages the theme state and applies it to the document body class. Updated it to also set `data-theme` attribute.
- Standalone apps (`floorplan-editor`, `floorplan-viewer`) also had some manual theme toggling logic which was updated.
- Hardcoded colors (especially the blue accent `#4a90d9`) were replaced with CSS variables, with the accent updated to cyan (`oklch(75% 0.18 195)`).
