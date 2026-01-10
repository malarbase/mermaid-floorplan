## Why

The viewer and interactive-editor packages have significant code duplication (~1500 lines of inline JavaScript, ~1000 lines of CSS) and inconsistent UX (import in control panel vs export in editor header). Unifying them into a single app with progressive feature enablement will reduce maintenance burden, ensure consistent behavior, and enable a smooth "viewer → editor" upgrade path gated by authentication.

## What Changes

- **Create unified `FloorplanApp` class** that replaces both `Viewer` and `InteractiveEditor`, supporting feature flags for viewer-only vs full-editor mode
- **Add minimal header bar** with file name dropdown + command palette (⌘K) for file operations, following Figma/VS Code patterns
- **Add drag-and-drop file loading** on the 3D canvas
- **Make editor panel visible in viewer mode** as a collapsible read-only code viewer (editing requires auth)
- **Gate edit features behind auth callback** (DSL editing, selection, properties panel, AI chat)
- **Consolidate HTML/CSS** by moving all inline styles to shared-styles.css and generating UI via JavaScript

## Impact

- Affected specs: `3d-viewer`, `interactive-editor`
- Affected code: `viewer/`, `interactive-editor/`, `viewer-core/`
- **NOT breaking**: Existing viewer remains 100% open/free; edit features are additive
