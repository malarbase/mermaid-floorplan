# Design: Viewer/Editor Deduplication

## Context

The mermaid-floorplan project has two browser applications:

1. **viewer/** - Read-only 3D floorplan viewer with DSL editor and AI chat
2. **interactive-editor/** - Full editor with selection, properties panel, and editing

Both were developed iteratively, resulting in significant code duplication. The `viewer-core/` package exists and already contains shared managers and UI components, but is not fully utilized.

### Current Duplication

| Area | viewer/ | interactive-editor/ | Duplication |
|------|---------|---------------------|-------------|
| Inline CSS | ~1,000 lines | ~1,250 lines | ~95% overlap |
| Viewer class | ~1,200 lines | ~650 lines | ~60% overlap |
| HTML structure | ~400 lines | ~500 lines | ~80% overlap |

### Existing Shared Code (Underutilized)

`viewer-core/src/ui/styles.ts` exports `SHARED_STYLES` (~920 lines) with `fp-*` class prefixes - but **neither HTML file uses it**. Both have their own inline `<style>` blocks.

## Goals / Non-Goals

### Goals
- Eliminate CSS duplication by using existing shared styles
- Create BaseViewer class to share TypeScript logic
- Maintain 100% behavioral parity
- Reduce bundle sizes
- Improve maintainability

### Non-Goals
- Adding new features
- Changing external APIs
- Modifying grammar or rendering logic
- Performance optimization (beyond reduced bundle size)

## Decisions

### Decision 1: BaseViewer as Abstract Class

**Choice**: Create `BaseViewer` abstract class in viewer-core

**Rationale**:
- Both viewer classes share ~400 lines of identical code
- Abstract class allows shared implementation + extension points
- TypeScript's class inheritance is well-understood
- Aligns with existing `SceneContext` interface

**Alternatives Considered**:
- **Composition over inheritance**: Would require significant refactoring of existing code, more invasive
- **Mixin pattern**: More flexible but harder to reason about, TypeScript support is awkward
- **Keep separate classes with shared utility functions**: Doesn't reduce duplication enough, leads to boilerplate

### Decision 2: CSS Via Style Injection

**Choice**: Use `injectStyles()` from viewer-core, update HTML to use `fp-*` classes

**Rationale**:
- `viewer-core/src/ui/styles.ts` already has complete shared styles
- `injectStyles()` function already exists and handles deduplication
- Class prefix `fp-*` prevents conflicts with other CSS
- Both light and dark theme variants are included

**Implementation**:
```typescript
// In both index.html <script type="module">
import { injectStyles } from 'viewer-core';
injectStyles(); // Inject shared styles before anything renders
```

**HTML Changes**:
```html
<!-- Before -->
<div id="controls">
  <div class="control-section">

<!-- After -->
<div id="controls" class="fp-control-panel">
  <div class="fp-control-section">
```

### Decision 3: DSL Parser Location

**Choice**: Move `dsl-parser.ts` from viewer/ to viewer-core/

**Rationale**:
- Both packages need to parse DSL files
- Currently only viewer has the parser, interactive-editor creates its own document inline
- Single source of truth for parsing logic

**Dependency Impact**: None - viewer-core already depends on `floorplans-language`

### Decision 4: Keep App-Specific HTML

**Choice**: Keep index.html files separate, share only CSS and TypeScript

**Rationale**:
- HTML differences are legitimate (chat in viewer, selection controls in editor)
- Template-based HTML generation would add complexity
- Current approach allows easy app-specific customization

## Architecture

### After Refactoring

```
viewer-core/src/
├── base-viewer.ts       # NEW: Abstract BaseViewer class
├── dsl-parser.ts        # MOVED: From viewer/src/
├── scene-context.ts     # Existing interface
├── mesh-registry.ts     # Existing
├── camera-manager.ts    # Existing
├── floor-manager.ts     # Existing
├── annotation-manager.ts # Existing
├── ui/
│   ├── styles.ts        # Existing (now used!)
│   └── ...
└── index.ts             # Export BaseViewer

viewer/src/
├── main.ts              # Viewer extends BaseViewer
├── openai-chat.ts       # Viewer-specific
└── (dsl-parser.ts)      # DELETED (moved to viewer-core)

interactive-editor/src/
├── interactive-editor.ts # InteractiveEditor extends BaseViewer
├── properties-panel.ts   # Editor-specific
└── ...
```

### BaseViewer Class Interface

```typescript
// viewer-core/src/base-viewer.ts
export interface BaseViewerOptions {
  containerId: string;
  initialTheme?: ViewerTheme;
  enableKeyboardControls?: boolean;
}

export abstract class BaseViewer implements SceneContext {
  // Core Three.js (protected for subclass access)
  protected _scene: THREE.Scene;
  protected _perspectiveCamera: THREE.PerspectiveCamera;
  protected _orthographicCamera: THREE.OrthographicCamera;
  protected _renderer: THREE.WebGLRenderer;
  protected labelRenderer: CSS2DRenderer;
  protected _controls: OrbitControls;
  
  // Managers
  protected _meshRegistry: MeshRegistry;
  protected _cameraManager: CameraManager;
  protected _floorManager: FloorManager;
  protected _annotationManager: AnnotationManager;
  protected _pivotIndicator: PivotIndicator;
  protected _keyboardControls: KeyboardControls;
  
  // Generators
  protected wallGenerator: WallGenerator;
  protected stairGenerator: StairGenerator;
  
  // State
  protected _floors: THREE.Group[] = [];
  protected currentFloorplanData: JsonExport | null = null;
  protected currentTheme: ViewerTheme = 'light';
  
  constructor(options: BaseViewerOptions);
  
  // Common methods (implemented in base)
  public loadFloorplan(data: JsonExport): void;
  protected generateFloor(floorData: JsonFloor): THREE.Group;
  protected createFloorMesh(room: JsonRoom, material: THREE.Material): THREE.Mesh;
  protected resolveRoomStyle(room: JsonRoom): MaterialStyle | undefined;
  public setExplodedView(factor: number): void;
  public setTheme(theme: ViewerTheme): void;
  protected onWindowResize(): void;
  protected animate(): void;
  
  // SceneContext interface
  get scene(): THREE.Scene;
  get activeCamera(): THREE.Camera;
  get floors(): readonly THREE.Group[];
  get meshRegistry(): MeshRegistry;
  
  // Abstract hooks for subclasses
  protected abstract onFloorplanLoaded?(): void;
  protected abstract setupUIControls(): void;
}
```

### Inheritance Hierarchy

```
SceneContext (interface)
       ↑
  BaseViewer (abstract class in viewer-core)
       ↑
   ┌───┴───┐
Viewer    InteractiveEditor
(viewer/) (interactive-editor/)
```

## Risks / Trade-offs

### Risk: Behavioral Regression

**Mitigation**:
1. Create screenshot comparison tests before refactoring
2. Test all keyboard shortcuts
3. Test all control panel interactions
4. Test theme switching
5. Test floor visibility

### Risk: Style Injection Timing

**Mitigation**:
- Call `injectStyles()` synchronously at top of `<script>` before any DOM manipulation
- The function already checks `document.getElementById(id)` to prevent double-injection

### Risk: Circular Dependencies

**Mitigation**:
- Clear dependency direction: viewer-core has no dependencies on viewer or interactive-editor
- Both apps depend on viewer-core
- No cross-app imports

## Migration Plan

### Phase 1: CSS Consolidation (Low Risk)

1. Update `viewer/index.html`:
   - Add `import { injectStyles } from 'viewer-core'` 
   - Call `injectStyles()` before anything else
   - Replace CSS class names with `fp-*` prefixes
   - Remove inline `<style>` block (keep app-specific overrides only)

2. Update `interactive-editor/index.html`:
   - Same changes as viewer

3. Test both apps for visual regressions

### Phase 2: BaseViewer Extraction (Medium Risk)

1. Create `viewer-core/src/base-viewer.ts`
2. Copy common code from `viewer/src/main.ts`
3. Make methods protected, add abstract hooks
4. Update `viewer/src/main.ts` to extend BaseViewer
5. Test viewer thoroughly
6. Update `interactive-editor/src/interactive-editor.ts` to extend BaseViewer
7. Test interactive-editor thoroughly

### Phase 3: DSL Parser Move (Low Risk)

1. Move `viewer/src/dsl-parser.ts` to `viewer-core/src/`
2. Export from `viewer-core/src/index.ts`
3. Update import in `viewer/src/main.ts`
4. Test DSL loading in both apps

### Rollback Strategy

Each phase can be rolled back independently:
- Phase 1: Restore inline CSS (git revert)
- Phase 2: Revert to standalone Viewer class
- Phase 3: Move dsl-parser.ts back

## Open Questions

None - design is straightforward refactoring.

