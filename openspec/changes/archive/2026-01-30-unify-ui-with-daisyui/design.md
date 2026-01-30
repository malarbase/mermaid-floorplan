# Design: Unify UI with DaisyUI + Tailwind

## Context

The project has two separate entry points (viewer and editor) with divergent styling approaches:

| Aspect | Viewer | Editor |
|--------|--------|--------|
| HTML | ~30 lines, minimal shell | ~1,129 lines, inline everything |
| CSS | `shared-styles.css` (3,097 lines) | Same + ~740 lines inline |
| UI Creation | Programmatic factories | Mix of HTML + factories |
| Theme Handling | `body.dark-theme` selectors | Same, duplicated |

Both apps use the same core components but cannot share them due to styling differences.

## Goals / Non-Goals

**Goals:**
- Single source of truth for UI styling via DaisyUI
- Unified codebase for viewer and editor with feature flags
- Reduced CSS maintenance burden (no manual dark-theme selectors)
- Consistent, accessible UI components

**Non-Goals:**
- Major UX redesign (keep current layout and flow)
- Mobile-first redesign (desktop remains primary target)
- Server-side rendering support
- Design system documentation site

## Decisions

### 1. DaisyUI as Component Library

**Decision:** Use DaisyUI semantic classes instead of custom CSS.

**Rationale:**
- DaisyUI provides `data-theme` attribute-based theming that eliminates manual `.dark-theme` selectors
- Production-tested components with accessibility built-in
- Semantic classes (`btn`, `modal`, `card`) are self-documenting
- Reduces ~3,800 lines of CSS to ~100 lines of Tailwind utilities for layout

**Alternatives considered:**
- **Headless UI (Radix)**: More flexible but requires writing all styles; doesn't reduce CSS burden
- **Shadcn/ui**: React-focused, poor SolidJS support
- **Keep custom CSS**: Maintains status quo maintenance burden

### 2. Theme Configuration

**Decision:** Map existing themes to DaisyUI presets with custom overrides.

```js
// tailwind.config.js
daisyui: {
  themes: [
    {
      light: {
        ...require('daisyui/src/theming/themes')['light'],
        primary: '#4a90d9',      // Match current accent color
        'base-100': '#ffffff',
        'base-200': '#f8f8f8',
        'base-300': '#f0f0f0',
      },
    },
    {
      dark: {
        ...require('daisyui/src/theming/themes')['dark'],
        primary: '#4a90d9',
        'base-100': '#1a1a1a',
        'base-200': '#252526',
        'base-300': '#2d2d2d',
      },
    },
  ],
}
```

### 3. Unified Factory Pattern

**Decision:** Single `createFloorplanUI()` factory with options object.

```typescript
interface FloorplanUIOptions {
  // Mode
  mode: 'viewer' | 'editor';
  
  // Feature flags (derived from mode, overridable)
  editable?: boolean;           // default: mode === 'editor'
  showPropertiesPanel?: boolean; // default: mode === 'editor'
  showAddRoomButton?: boolean;   // default: mode === 'editor'
  showExportMenu?: boolean;      // default: true
  
  // Existing options
  initialFilename?: string;
  initialTheme?: 'light' | 'dark';
  headerAutoHide?: boolean;
  commands?: Command[];
  
  // Editor-specific callbacks
  onPropertyChange?: (type, id, prop, value) => void;
  onDelete?: (type, id) => void;
  getEntityData?: (type, id) => EntityData;
}

// Usage
const ui = createFloorplanUI(core, { mode: 'viewer' });
const ui = createFloorplanUI(core, { mode: 'editor', onPropertyChange: ... });
```

**Rationale:**
- Single entry point reduces API surface
- Feature flags allow fine-grained customization
- Backward compatible: `createEditorUI()` becomes `createFloorplanUI(core, { mode: 'editor' })`

### 4. CSS Architecture

**Decision:** Three-layer CSS approach.

```
1. Tailwind Base     - Reset, typography, base styles
2. DaisyUI Components - btn, card, modal, dropdown, etc.
3. Tailwind Utilities - Layout positioning, spacing overrides
```

**Layout CSS Variables (preserved):**
```css
:root {
  --layout-header-height: 40px;
  --layout-editor-width: 0px;
  --layout-overlay-2d-height: 220px;
}
```

Layout positioning uses Tailwind utilities with CSS variables:
```tsx
<div class="absolute top-[calc(var(--layout-header-height)+10px)] right-2.5">
```

### 5. Migration Strategy

**Decision:** Incremental migration with feature flag for rollback.

```typescript
// During migration, support both styles
const USE_DAISYUI = import.meta.env.VITE_USE_DAISYUI !== 'false';

if (USE_DAISYUI) {
  injectTailwindStyles();
} else {
  injectLegacyStyles(); // shared-styles.css
}
```

**Rollback:** Set `VITE_USE_DAISYUI=false` to revert to legacy styles.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Bundle size increase | ~30KB gzipped for Tailwind/DaisyUI | Purge unused classes; net reduction from removing custom CSS |
| Visual regressions | UI elements may shift | Screenshot comparison in CI; manual QA pass |
| DaisyUI version updates | Breaking changes in themes | Pin version; test upgrades |
| Learning curve | Team unfamiliar with DaisyUI | Document patterns; add to SKILL.md |

## Migration Plan

### Phase 1: Setup (non-breaking)
1. Add Tailwind + DaisyUI dependencies
2. Configure build pipeline
3. Create parallel style system (`VITE_USE_DAISYUI` flag)

### Phase 2: Component Migration (non-breaking)
1. Migrate one component at a time
2. Keep both old and new styles working
3. Test each migration before proceeding

### Phase 3: Editor Unification (breaking)
1. Migrate editor HTML to factories
2. Merge UI factories
3. Remove legacy CSS

### Rollback Plan
1. Revert to previous commit
2. Or: Set `VITE_USE_DAISYUI=false` environment variable

## Resolved Decisions

1. **Monaco Editor theming**: Monaco's `vs-dark`/`vs` theme does NOT need to match DaisyUI's theme colors exactly.
   - **Decision**: Monaco keeps its own themes; no change needed. The editor panel background will use DaisyUI theming, but the Monaco editor content area maintains its standard VS Code themes.

2. **3D canvas overlay positioning**: Overlay panels (2D minimap, floor summary) will use absolute positioning.
   - **Decision**: Keep absolute positioning with CSS variables for flexibility. This allows panels to respond to layout changes (editor open/close) via CSS variable updates from LayoutManager.

3. **Animation timing**: Keep current 0.3s ease transitions.
   - **Decision**: Do not adopt DaisyUI's default transitions. Keep current 0.3s ease for consistency with 3D scene transitions and existing panel animations.
