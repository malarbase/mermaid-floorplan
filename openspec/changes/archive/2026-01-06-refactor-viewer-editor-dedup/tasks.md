# Tasks: Refactor Viewer/Editor Deduplication

## 1. Preparation & Verification Setup

- [x] 1.1 Document current bundle sizes for viewer and interactive-editor
- [ ] 1.2 Create screenshot baseline of viewer control panel, 2D overlay, keyboard help
- [ ] 1.3 Create screenshot baseline of interactive-editor control panel, 2D overlay, keyboard help
- [x] 1.4 List all keyboard shortcuts and verify they work in both apps
- [x] 1.5 List all control panel interactions (sliders, checkboxes, buttons)

## 2. CSS Consolidation (Phase 1)

### 2.1 Viewer CSS Migration

- [x] 2.1.1 Add `import { injectStyles } from 'viewer-core'` to viewer/index.html script
- [x] 2.1.2 Call `injectStyles()` before any DOM manipulation
- [x] 2.1.3 Create class name mapping: current → fp-* equivalents
- [x] 2.1.4 Update viewer/index.html to use fp-* class names for control panel
- [x] 2.1.5 Update viewer/index.html to use fp-* class names for 2D overlay
- [x] 2.1.6 Update viewer/index.html to use fp-* class names for keyboard help overlay
- [x] 2.1.7 Update viewer/index.html to use fp-* class names for floor summary
- [x] 2.1.8 Update viewer/index.html to use fp-* class names for warnings panel
- [x] 2.1.9 Remove duplicated CSS from viewer/index.html `<style>` block
- [x] 2.1.10 Keep only viewer-specific CSS (editor panel, chat styles)
- [ ] 2.1.11 Compare screenshots - verify visual parity

### 2.2 Interactive-Editor CSS Migration

- [x] 2.2.1 Add `import { injectStyles } from 'viewer-core'` to interactive-editor/index.html script
- [x] 2.2.2 Call `injectStyles()` before any DOM manipulation
- [x] 2.2.3 Update interactive-editor/index.html to use fp-* class names for control panel
- [x] 2.2.4 Update interactive-editor/index.html to use fp-* class names for 2D overlay
- [x] 2.2.5 Update interactive-editor/index.html to use fp-* class names for keyboard help overlay
- [x] 2.2.6 Update interactive-editor/index.html to use fp-* class names for floor summary
- [x] 2.2.7 Update interactive-editor/index.html to use fp-* class names for selection info
- [x] 2.2.8 Remove duplicated CSS from interactive-editor/index.html `<style>` block
- [x] 2.2.9 Keep only editor-specific CSS (properties panel, dialogs, error overlay)
- [ ] 2.2.10 Compare screenshots - verify visual parity

## 3. BaseViewer Extraction (Phase 2)

### 3.1 Create BaseViewer Class

- [x] 3.1.1 Create viewer-core/src/base-viewer.ts with BaseViewerOptions interface
- [x] 3.1.2 Define protected properties for Three.js core (scene, cameras, renderer, controls)
- [x] 3.1.3 Define protected properties for managers (camera, floor, annotation, mesh registry)
- [x] 3.1.4 Define protected properties for generators (wall, stair)
- [x] 3.1.5 Define protected properties for state (floors, floorplanData, theme, config, styles)
- [x] 3.1.6 Implement constructor with Three.js initialization
- [x] 3.1.7 Implement resolveRoomStyle() method
- [x] 3.1.8 Implement loadFloorplan() method
- [x] 3.1.9 Implement generateFloor() method
- [x] 3.1.10 Implement createFloorMesh() method
- [x] 3.1.11 Implement setExplodedView() method
- [x] 3.1.12 Implement setTheme() and applyTheme() methods
- [x] 3.1.13 Implement regenerateMaterialsForTheme() method
- [x] 3.1.14 Implement onWindowResize() method
- [x] 3.1.15 Implement animate() base method with extension point
- [x] 3.1.16 Implement dispose() method
- [x] 3.1.17 Define abstract setupUIControls() for subclass customization
- [x] 3.1.18 Define optional onFloorplanLoaded() hook
- [x] 3.1.19 Export BaseViewer from viewer-core/src/index.ts

### 3.2 Refactor Viewer to Extend BaseViewer

- [x] 3.2.1 Import BaseViewer in viewer/src/main.ts
- [x] 3.2.2 Change Viewer class declaration to extend BaseViewer
- [x] 3.2.3 Move chat service and editor instance to Viewer class only
- [x] 3.2.4 Move light controls to Viewer (or BaseViewer if shared)
- [x] 3.2.5 Move warnings panel to Viewer (or use shared validation-warnings-ui)
- [x] 3.2.6 Implement setupUIControls() in Viewer
- [x] 3.2.7 Implement setupEditorPanel() in Viewer
- [x] 3.2.8 Implement setupChat() in Viewer
- [x] 3.2.9 Override animate() to add editor-specific updates
- [x] 3.2.10 Remove duplicated code that's now in BaseViewer
- [x] 3.2.11 Verify viewer builds without errors
- [ ] 3.2.12 Test all viewer features:
  - Camera mode switching
  - Isometric view
  - FOV slider
  - Light controls
  - Theme toggle
  - Exploded view
  - Floor visibility
  - 2D overlay
  - Annotations (area, dimensions, floor summary)
  - Keyboard navigation
  - Keyboard help overlay
  - Editor panel open/close
  - Editor resize
  - Chat functionality

### 3.3 Refactor InteractiveEditor to Extend BaseViewer

- [x] 3.3.1 Import BaseViewer in interactive-editor/src/interactive-editor.ts
- [x] 3.3.2 Change InteractiveEditor class declaration to extend BaseViewer
- [x] 3.3.3 Keep selection manager initialization in InteractiveEditor
- [x] 3.3.4 Implement setupUIControls() in InteractiveEditor
- [x] 3.3.5 Override animate() to add selection manager updates
- [x] 3.3.6 Override loadFloorplan() to call parent + handle error state
- [x] 3.3.7 Remove duplicated code that's now in BaseViewer
- [x] 3.3.8 Verify interactive-editor builds without errors
- [ ] 3.3.9 Test all interactive-editor features:
  - All viewer features (camera, light, theme, etc.)
  - Click selection
  - Marquee selection
  - Multi-selection (Shift+click)
  - Selection mode toggle (V key)
  - Properties panel
  - DSL editing with live preview
  - Add room dialog
  - Delete confirmation
  - Error state overlay

## 4. DSL Parser Migration (Phase 3)

- [x] 4.1 Move viewer/src/dsl-parser.ts to viewer-core/src/dsl-parser.ts
- [x] 4.2 Update viewer-core/src/index.ts to export dsl-parser functions
- [x] 4.3 Update viewer/src/main.ts to import from viewer-core
- [x] 4.4 Delete viewer/src/dsl-parser.ts
- [x] 4.5 Verify viewer DSL loading works
- [ ] 4.6 Update interactive-editor inline parsing to use shared parser (if applicable)
- [x] 4.7 Test DSL file loading in both apps

## 5. Final Verification

- [x] 5.1 Build both packages in production mode
- [ ] 5.2 Compare bundle sizes with baseline (expect decrease)
- [ ] 5.3 Run full screenshot comparison for viewer
- [ ] 5.4 Run full screenshot comparison for interactive-editor
- [ ] 5.5 Test GitHub Pages deployment preview (if available)
- [ ] 5.6 Update any affected documentation

## 6. Cleanup

- [x] 6.1 Remove any dead code or unused imports
- [x] 6.2 Add JSDoc comments to BaseViewer public methods
- [x] 6.3 Run linter on all changed files
- [ ] 6.4 Update CHANGELOG if applicable

