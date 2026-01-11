## Context

The project has two separate web applications:
- `viewer/`: Read-only 3D floorplan viewer (~700 lines HTML)
- `interactive-editor/`: Full editor with selection, properties, DSL editing (~3000 lines HTML)

Both share `viewer-core` for managers and utilities, but duplicate significant UI code (control panel, keyboard help, 2D overlay, inline styles). The goal is to unify them into a single application where:
- Viewer features are always available (no auth)
- Editor features require authentication (SSO/social login)
- Consistent UX across both modes

## Goals / Non-Goals

**Goals:**
- Single `FloorplanApp` entry point for both viewer and editor use cases
- Reduce code duplication by 80%+ (target: single HTML shell < 50 lines)
- Consistent import/export UX via file name dropdown + command palette
- Drag-and-drop file loading
- Editor panel visible in viewer mode (read-only)
- Auth-gated edit mode transition

**Non-Goals:**
- Implement actual SSO/authentication (just provide the callback hook)
- Cloud save functionality (future work)
- Mobile-specific optimizations
- Offline support

## Decisions

### Decision 1: Single Entry Point via Feature Flags

**Choice:** Create `FloorplanApp` class that accepts feature flags, not two separate classes.

```typescript
new FloorplanApp({
  containerId: 'app',
  enableEditing: false,      // Viewer mode
  enableSelection: false,
  onAuthRequired: () => showLoginModal(),
});
```

**Rationale:** Feature flags are simpler than inheritance for this use case. The alternative (InteractiveEditor extends Viewer) already exists but still requires maintaining two HTML files and entry points.

### Decision 2: File Name Dropdown + Command Palette (Hybrid)

**Choice:** Use a minimal header with file name dropdown for file operations, plus command palette (⌘K) for power users. This follows patterns from Figma, VS Code, and Google Docs.

```
┌────────────────────────────────────────────────────────────────┐
│ 📐 Floorplan        [Untitled.floorplan ▾]    [◀ Editor] [⌘K] │
├────────────────────────────────────────────────────────────────┤
│                         3D Canvas                              │
```

**File name dropdown contents:**
- Open File... (⌘O)
- Open from URL...
- Open Recent ▸
- ─────────────
- Save .floorplan (⌘S) 🔒
- Export JSON
- Export GLB
- Export GLTF

**Command palette (⌘K):**
- Searchable list of all actions
- Shows keyboard shortcuts
- Scales to future functionality

**Rationale:**
- File name as dropdown matches modern productivity apps (Figma, Google Docs)
- Command palette is expected by power users and provides discoverability
- More space-efficient than explicit Open/Save buttons
- Keyboard shortcuts remain accessible via palette display
- 🔒 icon indicates auth-required actions

**Alternatives considered:**
- Explicit toolbar buttons: More discoverable but dated aesthetic, wastes horizontal space
- Hamburger menu only: Poor discoverability for primary actions
- Context menu only: Requires right-click knowledge, not intuitive for file ops

### Decision 3: Editor Panel States

**Choice:** Three-state editor panel: collapsed, expanded read-only, expanded editable.

| State | Who sees it | Behavior |
|-------|------------|----------|
| Collapsed | Anyone | Just toggle button visible |
| Expanded (read-only) | Anyone | Code visible, cursor highlights 3D, no editing |
| Expanded (editable) | Authenticated | Full editing, live sync, AI chat |

**Rationale:**
- Showing code in read-only mode helps users understand the DSL format
- Cursor-to-3D sync works in read-only (helps exploration)
- Clear visual distinction between modes prevents confusion

### Decision 4: Generate UI from JavaScript

**Choice:** Move all UI HTML to JavaScript builders (already partially done with `createKeyboardHelpUI`, `createControlPanel`, etc.).

**Rationale:**
- Single HTML shell eliminates duplication
- JavaScript builders are already established pattern in viewer-core
- Enables dynamic UI based on feature flags
- Easier to test programmatically

### Decision 5: Drag-and-Drop on Canvas

**Choice:** Add drag-drop handler to the entire 3D canvas container with visual feedback.

**Rationale:**
- Natural interaction for file loading
- Doesn't require finding file input control
- Standard modern web app pattern
- Low implementation cost

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Regression in viewer functionality | Extensive testing before removing old viewer code |
| Larger initial bundle for viewer-only use | Tree-shaking + lazy loading for editor features |
| Complex auth state management | Keep auth simple (boolean flag + callback) |

## Migration Plan

### Phase 1: Add New Features (Non-Breaking)
1. Add `createToolbar()` UI builder to viewer-core
2. Add `initializeDragDrop()` handler to viewer-core
3. Add `FloorplanApp` class with feature flags
4. Both old and new entry points work

### Phase 2: Migrate Entry Points
1. Update viewer to use `FloorplanApp` with viewer-only flags
2. Update interactive-editor to use `FloorplanApp` with all features
3. Verify behavioral parity

### Phase 3: Consolidate
1. Remove duplicated HTML from both packages
2. Single HTML shell in each package
3. Archive old code

## Open Questions

- [ ] Should read-only editor panel support syntax highlighting without Monaco full bundle?
- [ ] Should toolbar position be customizable (top vs floating)?
- [ ] How to handle mobile touch interactions for drag-drop?
