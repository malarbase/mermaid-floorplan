# Proposal: Refactor Viewer/Editor to Eliminate Duplication

## Why

The `viewer/` and `interactive-editor/` packages contain significant code duplication:

1. **~2,400 lines of duplicated CSS** - Both `viewer/index.html` and `interactive-editor/index.html` have nearly identical inline `<style>` blocks, even though `viewer-core/src/ui/styles.ts` already exports shared styles with `fp-*` class prefixes that are NOT being used.

2. **~400 lines of duplicated TypeScript** - `viewer/src/main.ts` (1,259 lines) and `interactive-editor/src/interactive-editor.ts` (665 lines) share nearly identical implementations for:
   - Three.js scene/camera/renderer setup
   - `loadFloorplan()` method
   - `generateFloor()` method
   - `createFloorMesh()` method
   - `resolveRoomStyle()` method
   - `setExplodedView()` method
   - Manager initialization (CameraManager, FloorManager, AnnotationManager, etc.)
   - Window resize handling
   - Animation loop

3. **Similar HTML structure** - Both HTML files have identical control panel sections, 2D overlay containers, and keyboard help overlays.

This duplication leads to:
- Maintenance burden (fixes must be applied twice)
- Divergent behavior as implementations drift
- Increased bundle sizes
- Harder onboarding for contributors

## What Changes

### 1. Create BaseViewer Class in viewer-core

Extract common Three.js viewer logic into an abstract base class that both `Viewer` and `InteractiveEditor` extend:

```
viewer-core/src/base-viewer.ts  # NEW: ~450 lines of shared logic
```

The base class provides:
- Core Three.js setup (scene, cameras, renderer, controls)
- Manager initialization and wiring
- `loadFloorplan()`, `generateFloor()`, `createFloorMesh()`
- Animation loop, window resize handling
- Theme switching, exploded view

Subclasses implement:
- `Viewer`: Chat integration, file loading UI
- `InteractiveEditor`: Selection system, properties panel, editor sync

### 2. Use Shared CSS via Style Injection

Update both HTML files to:
- Call `injectStyles()` from viewer-core at startup
- Replace inline CSS class names with `fp-*` prefixed classes
- Remove ~2,000 lines of duplicated inline CSS
- Keep only app-specific overrides (~50-100 lines each)

### 3. Move DSL Parser to viewer-core

`viewer/src/dsl-parser.ts` is useful for both packages - move to shared location:

```
viewer-core/src/dsl-parser.ts  # MOVED from viewer/src/
```

### 4. Create Shared HTML Fragments (Optional Enhancement)

Factory functions for common UI structures in viewer-core:
- `createControlPanelHTML()`
- `createKeyboardHelpHTML()`
- `create2DOverlayHTML()`

## Impact

### Affected Specs

| Spec | Impact |
|------|--------|
| `3d-viewer` | MODIFIED - Add requirement for BaseViewer architecture |

### Affected Code

| Package | Changes |
|---------|---------|
| `viewer-core/` | ADD: `base-viewer.ts`, MOVE: `dsl-parser.ts` |
| `viewer/` | MODIFY: `main.ts` extends BaseViewer, MODIFY: `index.html` uses shared CSS |
| `interactive-editor/` | MODIFY: `interactive-editor.ts` extends BaseViewer, MODIFY: `index.html` uses shared CSS |

### Breaking Changes

**None** - This is a pure internal refactoring. External behavior of both viewer and interactive-editor remains identical.

## Behavioral Parity Requirements

Both packages MUST maintain identical behavior for:

1. **3D Rendering** - Same geometry, materials, shadows
2. **Camera Controls** - Same keyboard shortcuts, mouse behavior
3. **Annotations** - Same area labels, dimension formatting
4. **Theme Switching** - Same colors, transitions
5. **Floor Visibility** - Same show/hide behavior
6. **2D Overlay** - Same SVG rendering, drag/resize
7. **Keyboard Help** - Same overlay content and appearance
8. **Control Panel** - Same sections, sliders, checkboxes

### Verification Strategy

- Automated screenshot comparison tests
- Manual regression testing of all control panel features
- Bundle size comparison (should decrease)

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Behavioral regression | Medium | High | Extensive testing, screenshot comparison |
| Style injection timing | Low | Medium | Ensure styles injected before first render |
| Circular dependencies | Low | Medium | Clear dependency direction: viewer-core → both apps |

## Timeline Estimate

- **Phase 1 - CSS Consolidation**: 2-4 hours
- **Phase 2 - BaseViewer Extraction**: 4-6 hours  
- **Phase 3 - DSL Parser Move**: 1 hour
- **Phase 4 - Testing & Verification**: 2-4 hours
- **Total**: 1-2 days

## Open Questions

None - this is a straightforward refactoring with clear boundaries.

