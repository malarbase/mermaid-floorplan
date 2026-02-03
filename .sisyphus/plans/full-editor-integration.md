# Progressive Floorplan Viewer/Editor Integration

## TL;DR

> **Quick Summary**: Implement a **three-tier progressive capability model** that leverages all existing implementations: Basic (current FloorplanEmbed for quick previews), Advanced (floorplan-viewer control panels), and Editor (full floorplan-editor with Monaco). Each tier lazy-loads on top of the previous, providing the right experience for each context.
> 
> **Deliverables**:
> - `FloorplanContainer.tsx` - Smart container that manages mode and lazy loading
> - `FloorplanBase.tsx` - Refactored from FloorplanEmbed, shared 3D canvas foundation
> - `ControlPanels.tsx` - Lazy-loaded control panels from floorplan-viewer
> - `EditorBundle.tsx` - Lazy-loaded editor features (Monaco, selection, properties)
> - Progressive enhancement: Basic → Advanced → Editor based on context
> - Auth-aware mode selection with explicit upgrade paths
> 
> **Estimated Effort**: Medium-Large (2-3 weeks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 0/0.5 → Task 1 → Task 3 → Task 6 → Task 7

---

## Progressive Capability Model

### The Three Tiers

| Tier | Component | Bundle | Load | Use Case |
|------|-----------|--------|------|----------|
| **Basic** | FloorplanBase | ~500KB | <1s | Quick previews, embeds, galleries |
| **Advanced** | + ControlPanels | +300KB | ~2s | Full exploration without editing |
| **Editor** | + EditorBundle | +1.2MB | ~3s | Full editing capabilities |

### Complete Feature Audit

All features from standalone viewer/editor accounted for:

| Feature | Basic | Advanced | Editor | Component/Location |
|---------|-------|----------|--------|-------------------|
| **3D Viewer** |
| 3D canvas (pan/zoom/orbit) | ✅ | ✅ | ✅ | FloorplanBase |
| Keyboard navigation (WASD, QE) | ✅ | ✅ | ✅ | FloorplanBase (core handles) |
| View presets (1,3,7,5 keys) | ✅ | ✅ | ✅ | FloorplanBase (core handles) |
| **Header/Toolbar** |
| Theme toggle (Light/Dark/Blueprint) | ✅ | ✅ | ✅ | App Header (Task 4) |
| Command palette (⌘K) | ❌ | ✅ | ✅ | ControlPanels + Header |
| Editor panel toggle | ❌ | ❌ | ✅ | EditorBundle |
| **Control Panel Sections** |
| Camera: FOV slider | ❌ | ✅ | ✅ | ControlPanels |
| Camera: Perspective/Orthographic toggle | ❌ | ✅ | ✅ | ControlPanels |
| Camera: Isometric View button | ❌ | ✅ | ✅ | ControlPanels |
| Lighting: Azimuth slider | ❌ | ✅ | ✅ | ControlPanels |
| Lighting: Elevation slider | ❌ | ✅ | ✅ | ControlPanels |
| Lighting: Intensity slider | ❌ | ✅ | ✅ | ControlPanels |
| View: Theme toggle button | ❌ | ✅ | ✅ | ControlPanels |
| View: Exploded view slider | ❌ | ✅ | ✅ | ControlPanels |
| Floors: Floor visibility checkboxes | ❌ | ✅ | ✅ | ControlPanels |
| Floors: Show All / Hide All buttons | ❌ | ✅ | ✅ | ControlPanels |
| 2D Overlay: Enable toggle | ❌ | ✅ | ✅ | ControlPanels |
| 2D Overlay: Opacity slider | ❌ | ✅ | ✅ | ControlPanels |
| Annotations: Show Room Areas | ❌ | ✅ | ✅ | ControlPanels |
| Annotations: Show Dimensions | ❌ | ✅ | ✅ | ControlPanels |
| Annotations: Show Floor Summary | ❌ | ✅ | ✅ | ControlPanels |
| Annotations: Area Unit selector | ❌ | ✅ | ✅ | ControlPanels |
| Annotations: Length Unit selector | ❌ | ✅ | ✅ | ControlPanels |
| Selection: Enable toggle (V key) | ❌ | ❌ | ✅ | ControlPanels (editor only) |
| Selection: Containment mode | ❌ | ❌ | ✅ | ControlPanels (editor only) |
| Selection: Marquee mode indicator | ❌ | ❌ | ✅ | ControlPanels (editor only) |
| **Overlays & Panels** |
| 2D Floor Plan minimap | ❌ | ✅ | ✅ | Overlay2DManager |
| Floor Summary panel | ❌ | ✅ | ✅ | FloorSummaryPanel |
| Validation warnings panel | ❌ | ✅ | ✅ | ValidationWarningsUI |
| Selection info panel | ❌ | ❌ | ✅ | EditorBundle |
| Properties panel | ❌ | ❌ | ✅ | EditorBundle |
| **Editor Panel** |
| Monaco DSL editor | ❌ | ❌ | ✅ | EditorBundle |
| Collapsible panel toggle | ❌ | ❌ | ✅ | EditorBundle |
| Panel resize handle | ❌ | ❌ | ✅ | EditorBundle |
| "+ Room" button | ❌ | ❌ | ✅ | EditorBundle |
| Export dropdown (DSL/JSON/GLB/GLTF) | ❌ | ✅ | ✅ | ControlPanels / EditorBundle |
| Editor status indicator | ❌ | ❌ | ✅ | EditorBundle |
| **Dialogs** |
| Add Room dialog | ❌ | ❌ | ✅ | EditorBundle |
| Delete Confirm dialog | ❌ | ❌ | ✅ | EditorBundle |
| Keyboard Help dialog (H key) | ❌ | ✅ | ✅ | KeyboardHelpUI |
| **Error Handling** |
| Error banner (parse errors) | ❌ | ✅ | ✅ | FloorplanBase |
| Stale geometry overlay | ❌ | ❌ | ✅ | EditorBundle |
| **Sync & Editing** |
| EditorViewerSync (cursor ↔ 3D) | ❌ | ❌ | ✅ | EditorBundle |
| Property editing via panel | ❌ | ❌ | ✅ | EditorBundle |
| DSL property editing | ❌ | ❌ | ✅ | EditorBundle |
| **Drag & Drop** |
| File drop to load | ❌ | ✅ | ✅ | ControlPanels |
| **Commands** |
| File: Open File | ❌ | ✅ | ✅ | Command Palette |
| File: Open URL | ❌ | ✅ | ✅ | Command Palette |
| File: Save | ❌ | ❌ | ✅ | Command Palette (editor) |
| File: Export JSON | ❌ | ✅ | ✅ | Command Palette |
| File: Export GLB | ❌ | ✅ | ✅ | Command Palette |
| View: Toggle Theme | ❌ | ✅ | ✅ | Command Palette |
| View: Toggle Ortho | ❌ | ✅ | ✅ | Command Palette |
| View: Isometric View | ❌ | ✅ | ✅ | Command Palette |
| View: Reset Camera | ❌ | ✅ | ✅ | Command Palette |
| View: Frame All | ❌ | ✅ | ✅ | Command Palette |

**Total Features**: 58 features audited
- Basic mode: 4 features
- Advanced mode: 45 features  
- Editor mode: 58 features (all)

### Context → Mode Mapping

| Context | Default Mode | Rationale |
|---------|--------------|-----------|
| Homepage hero | Basic | Fast load, visual impact |
| Gallery/discover cards | Basic | Many on page, performance |
| Embed (`/embed/{id}`) | Basic | External sites, minimal footprint |
| Modal/popover preview | Basic | Quick peek, fast dismiss |
| Project page (anonymous) | Advanced | Explore fully, no editing |
| Project page (authenticated guest) | Advanced | Explore, fork to edit |
| Project page (owner) | Editor | Full capabilities |
| After fork action | Editor | They forked to edit |
| Explicit "Edit" click | Editor | User requested |

### URL Strategy

```
/u/{username}/{project}              → Auto-detect based on auth
/u/{username}/{project}?view=basic   → Force basic (for performance)
/u/{username}/{project}?view=advanced → Force advanced
/u/{username}/{project}?edit=true    → Force editor (if authorized)
/embed/{projectId}                   → Always basic
```

---

## Visual Gap Analysis (from localhost comparison)

| Feature | Standalone Editor | Standalone Viewer | App (current) |
|---------|------------------|-------------------|---------------|
| 3D Viewer | ✅ | ✅ | ✅ Basic only |
| Camera Controls | ✅ | ✅ | ❌ |
| Lighting Controls | ✅ | ✅ | ❌ |
| Floor Visibility | ✅ | ✅ | ❌ |
| 2D Overlay | ✅ | ✅ | ❌ |
| Annotations | ✅ | ✅ | ❌ |
| Export Menu | ✅ | ✅ | ❌ |
| Command Palette | ✅ | ✅ | ❌ |
| Monaco Code Editor | ✅ | ✅ (read-only) | ❌ |
| Selection Controls | ✅ | ❌ | ❌ |
| Properties Panel | ✅ | ❌ | ❌ |
| Add/Delete Room | ✅ | ❌ | ❌ |

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FloorplanContainer                          │
│  (mode detection, lazy loading, error boundary, loading states) │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FloorplanBase                         │    │
│  │  (3D canvas, FloorplanAppCore, basic interactions)       │    │
│  │  - Always loaded (foundation layer)                      │    │
│  │  - Pan/zoom/orbit, theme toggle                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│         Basic Mode     Advanced Mode    Editor Mode             │
│         (nothing       ┌────────────┐   ┌────────────┐          │
│          extra)        │ControlPanels│   │ControlPanels│         │
│                        │ (lazy)      │   │ (lazy)      │         │
│                        │ - Camera    │   │ - Camera    │         │
│                        │ - Lighting  │   │ - Lighting  │         │
│                        │ - Floors    │   │ - Floors    │         │
│                        │ - 2D Overlay│   │ - 2D Overlay│         │
│                        │ - Export    │   │ - Export    │         │
│                        └────────────┘   └────────────┘          │
│                                          ┌────────────┐          │
│                                          │EditorBundle│          │
│                                          │ (lazy)      │         │
│                                          │ - Monaco    │         │
│                                          │ - Selection │         │
│                                          │ - Properties│         │
│                                          │ - Add/Delete│         │
│                                          │ - Sync      │         │
│                                          └────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Work Objectives

### Core Objective
Create a progressive capability system where users get the right level of functionality for their context, with smooth transitions between tiers and optimal performance through lazy loading.

### Concrete Deliverables
1. `FloorplanContainer.tsx` - Mode management, lazy loading orchestration
2. `FloorplanBase.tsx` - Refactored base 3D component (from FloorplanEmbed)
3. `ControlPanels.tsx` - Camera, lighting, floors, 2D, annotations, export
4. `EditorBundle.tsx` - Monaco, selection, properties, EditorViewerSync
5. Updated routes with mode detection logic
6. Responsive layouts for each tier
7. Playwright test suite covering all modes

### Definition of Done
- [x] Basic mode loads in <1s, matches current FloorplanEmbed performance
- [x] Advanced mode adds control panels matching standalone viewer
- [x] Editor mode adds Monaco + editing matching standalone editor
- [x] Mode auto-selects based on auth/ownership
- [x] Explicit mode switching works (?mode=basic/advanced/editor)
- [x] All tiers work on mobile with appropriate layouts
- [x] Build succeeds without SSR errors
- [ ] All Playwright tests pass

### Must Have
- Three distinct capability tiers
- Lazy loading between tiers (no upfront Monaco load for basic/advanced)
- Auto mode selection based on context
- Explicit mode override via URL params
- Upgrade prompts (Basic→Advanced, Advanced→Editor)
- All control panels from standalone viewer
- All editor features from standalone editor
- Responsive mobile layouts per tier

### Must NOT Have (Guardrails)
- **Don't rebuild features** - Replicate existing initialization patterns
- **Don't eager-load Monaco** for basic/advanced modes
- **Don't remove FloorplanEmbed** - Refactor into FloorplanBase
- **Don't break embeds** - /embed route always uses basic
- **Undo/redo** - Deferred to Phase 2
- **Touch gestures** beyond basic - Deferred to Phase 2
- **Offline editing** - Not in scope
- **Collaborative editing** - Future feature

---

## UX Improvements (from frontend-design analysis)

### Design System Alignment

**Theme Unification**:
- Migrate fp-* legacy styles to Tailwind/DaisyUI classes
- Use single theme selector (data-theme attribute)
- Selection highlight: Use app's cyan accent `oklch(75% 0.18 195)`

**Animation Consistency**:
- Panel reveals: `.animate-slide-up` with staggered delays (0.1s, 0.2s)
- Properties panel: `.animate-slide-in-right`
- Collapse/expand: 0.2s ease-out
- Use app's existing animation classes

**App Header Integration**:
- DON'T render standalone editor's header bar
- ADD editor controls to existing Header.tsx:
  - Theme toggle button
  - Command palette trigger (⌘K badge)
  - Mode indicator (Basic/Advanced/Editor)
- Toolbar below header for mode-specific controls

### Mobile Strategy

**Phone (<640px)**:
- Basic: 3D only (current behavior)
- Advanced: 3D + floating action button for controls sheet
- Editor: 3D + FAB, NO Monaco (code too complex for phone)

**Tablet (640-1024px)**:
- Basic: 3D only
- Advanced: 3D + collapsible right sidebar
- Editor: 3D + right sidebar + slide-in Monaco drawer

**Desktop (>1024px)**:
- All modes: Full layout matching standalone apps

### Loading States

```
1. First paint: App header + skeleton shimmer for viewer area
2. FloorplanBase loads: 3D canvas renders (Basic mode complete)
3. If Advanced/Editor: Show "Loading controls..." indicator
4. ControlPanels lazy load: Staggered panel reveal animation
5. If Editor: Show "Loading code editor..." indicator  
6. EditorBundle lazy load: Monaco appears with fade-in
```

### Error Recovery

**Parse Error**:
- 3D shows last valid geometry with "stale" badge
- DaisyUI alert-error banner below toolbar
- Monaco shows red squiggles

**Network Error (save failed)**:
- Toast notification with retry button
- Save button shows error badge
- Auto-save draft to localStorage

### Accessibility

- Control panel sections: aria-expanded for collapse state
- Selection announcements via aria-live region
- Tab order for all controls
- Focus ring on all interactive elements
- WCAG AA color contrast for labels

### Keyboard Shortcut Discovery

- Tooltip on command palette button: "⌘K"
- First-time toast: "Tip: Press ⌘K to access all commands"
- "?" button opens keyboard shortcuts modal
- Shortcuts visible in command palette items

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Pre-work - All parallel):
├── Task 0: Theme system unification
├── Task 0.5: Expose overlay2DManager on FloorplanAppCore
└── Task 0.6: Create /embed/:projectId route

Wave 1 (Foundation - Start after Wave 0):
├── Task 1: Create FloorplanContainer + FloorplanBase
└── Task 2: Create ControlPanels (lazy)

Wave 2 (Editor + Routes):
├── Task 3: Create EditorBundle (lazy)
├── Task 4: Update routes with mode detection
└── Task 5: Responsive layouts per tier

Wave 3 (Testing + Polish):
├── Task 6: Playwright test suite
└── Task 7: Integration testing and polish
```

### Dependency Matrix

| Task | Depends On | Blocks | Parallelize With |
|------|------------|--------|------------------|
| 0 | None | 1, 2 | 0.5, 0.6 |
| 0.5 | None | 1 | 0, 0.6 |
| 0.6 | None | None | 0, 0.5 |
| 1 | 0, 0.5 | 3, 4 | 2 |
| 2 | 0 | 4 | 1 |
| 3 | 1 | 6 | 4, 5 |
| 4 | 1, 2 | 6 | 3, 5 |
| 5 | 1 | 6 | 3, 4 |
| 6 | 3, 4, 5 | 7 | None |
| 7 | 6 | None | None |

---

## TODOs

- [x] 0. Unify theme system

  **What to do**:

  ### Phase A: Audit Legacy Styles
  
  Audit `floorplan-viewer-core/src/ui/styles.ts` (SHARED_STYLES constant):
  
  | Legacy fp-* Class | Current Styling | Migration Target |
  |-------------------|-----------------|------------------|
  | `.fp-control-panel` | `background: rgba(255,255,255,0.95)` | `bg-base-100/95` |
  | `.fp-section-header` | `background: #f8f8f8; color: #333` | `bg-base-200 text-base-content` |
  | `.fp-label` | `color: #555` | `text-base-content/70` |
  | `.fp-slider-value` | `color: #888` | `text-base-content/50` |
  | `.fp-btn` | `background: #4a90d9` | `btn btn-primary btn-sm` |
  | `.fp-btn-secondary` | `background: #666` | `btn btn-ghost btn-sm` |
  | `.fp-checkbox-row` | custom styles | `form-control` + `checkbox checkbox-xs` |
  | `.fp-select` | `background: white` | `select select-xs select-bordered` |
  | `.fp-floor-item` | custom flex | `form-control flex-row` |
  | `body.dark-theme .fp-*` | dark overrides | Remove (DaisyUI handles via data-theme) |

  ### Phase B: Update Theme Toggle Mechanism
  
  **Current (dual system)**:
  ```typescript
  // In editor/main.ts line 888
  document.body.classList.toggle('dark-theme', uiTheme === 'dark');
  ```
  
  **Target (single system)**:
  ```typescript
  // Set data-theme attribute on <html> element
  document.documentElement.setAttribute('data-theme', uiTheme === 'dark' ? 'dark' : 'light');
  ```
  
  Files to update:
  - `floorplan-viewer-core/src/ui/styles.ts` - Replace `body.dark-theme` selectors
  - `floorplan-editor/src/main.ts:888` - Use data-theme instead of body class
  - `floorplan-viewer/src/main.ts` - Same pattern if used

  ### Phase C: Color Token Alignment
  
  **App's color palette** (from `tailwind.css`):
  ```css
  --color-base-100: oklch(8% 0.02 250);   /* Deep navy */
  --color-base-200: oklch(12% 0.02 250);  /* Section headers */
  --color-base-300: oklch(18% 0.03 250);  /* Borders */
  --color-primary: oklch(75% 0.18 195);   /* Cyan accent */
  ```
  
  **Editor's current colors** (hardcoded hex):
  - `#4a90d9` (blue) → Replace with `oklch(75% 0.18 195)` (cyan)
  - `#f8f8f8` (light bg) → Use `var(--color-base-200)`
  - `#333` (dark text) → Use `var(--color-base-content)`

  ### Phase D: Create Compatibility Layer
  
  For standalone apps that don't use Tailwind, create CSS variable fallbacks:
  ```css
  :root {
    --fp-bg-primary: rgba(255, 255, 255, 0.95);
    --fp-bg-secondary: #f8f8f8;
    --fp-text-primary: #333;
    --fp-accent: oklch(75% 0.18 195);
  }
  
  [data-theme="dark"] {
    --fp-bg-primary: rgba(40, 40, 40, 0.95);
    --fp-bg-secondary: #333;
    --fp-text-primary: #e0e0e0;
  }
  
  .fp-control-panel {
    background: var(--fp-bg-primary);
  }
  ```

  **Must NOT do**:
  - Break standalone viewer/editor (keep fp-* classes working)
  - Remove fp-* classes entirely (gradual migration)
  - Change viewer-core public API

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Blocks**: Tasks 1, 2
  - **Blocked By**: None

  **References**:
  - `floorplan-viewer-core/src/ui/styles.ts:1-300` - All fp-* class definitions
  - `floorplan-app/src/styles/tailwind.css` - DaisyUI theme with OKLCH colors
  - `floorplan-editor/src/main.ts:879-909` - Current theme toggle logic
  - `tailwind.config.js` - Theme configuration

  **Acceptance Criteria**:
  
  ```bash
  # Standalone editor still works
  cd floorplan-editor && bun run dev
  # Navigate to localhost:5173
  # Assert: Theme toggle switches light ↔ dark
  # Assert: No visual glitches during toggle
  ```
  
  ```bash
  # Standalone viewer still works  
  cd floorplan-viewer && bun run dev
  # Navigate to localhost:5174
  # Assert: Theme toggle works
  # Assert: Control panels render correctly in both themes
  ```
  
  ```
  # App integration ready
  # Assert: data-theme attribute changes on toggle
  # Assert: No body.dark-theme references in new code
  # Assert: Accent color matches app's cyan (oklch 75% 0.18 195)
  ```

  **Commit**: YES
  - Message: `refactor(viewer-core): unify theme system to data-theme with CSS variables`
  - Files: `floorplan-viewer-core/src/ui/styles.ts`, theme toggle updates

---

- [x] 0.5. Expose overlay2DManager on FloorplanAppCore

  **What to do**:

  Add a public getter to `FloorplanAppCore` to expose the internally-created `Overlay2DManager` instance.

  ### Changes Required

  In `floorplan-viewer-core/src/floorplan-app-core.ts`:

  ```typescript
  // Add getter after line 120 (near other getters)
  get overlay2DManager(): Overlay2DManager | null { return this._overlay2DManager; }
  ```

  Also rename the private field from `overlay2DManager` to `_overlay2DManager` for consistency with other private fields (e.g., `_selectionManager`).

  **Must NOT do**:
  - Change the Overlay2DManager API
  - Create multiple overlay manager instances
  - Break existing standalone viewer/editor usage

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Blocks**: Task 1
  - **Blocked By**: None
  - **Can Run In Parallel**: YES (with Task 0)

  **References**:
  - `floorplan-viewer-core/src/floorplan-app-core.ts:107` - Private field declaration
  - `floorplan-viewer-core/src/floorplan-app-core.ts:162-173` - Internal creation

  **Acceptance Criteria**:

  ```bash
  # TypeScript compiles
  cd floorplan-viewer-core && bun run build
  # Assert: No errors
  ```

  ```bash
  # Getter is accessible
  # In consuming code:
  const core = new FloorplanAppCore({ containerId: 'app' });
  console.log(core.overlay2DManager); // Should be Overlay2DManager instance or null
  ```

  **Commit**: YES
  - Message: `feat(viewer-core): expose overlay2DManager as public getter`
  - Files: `floorplan-viewer-core/src/floorplan-app-core.ts`

---

- [x] 0.6. Create /embed/:projectId route

  **What to do**:

  Create a minimal embed route that always renders in Basic mode for external embedding.

  ### Route File

  Create `floorplan-app/src/routes/embed/[projectId].tsx`:

  ```typescript
  import { createAsync } from '@solidjs/router';
  import { getProject } from '~/lib/api';
  import { FloorplanEmbed } from '~/components/FloorplanEmbed';

  export default function EmbedPage() {
    const params = useParams();
    const project = createAsync(() => getProject(params.projectId));

    return (
      <div class="w-screen h-screen bg-base-300">
        <Suspense fallback={<div class="loading loading-spinner" />}>
          <Show when={project()}>
            {(p) => (
              <FloorplanEmbed
                dsl={p().dsl}
                theme="dark"
              />
            )}
          </Show>
        </Suspense>
      </div>
    );
  }
  ```

  ### Key Characteristics
  - **No header/footer** - Full viewport embed
  - **Always Basic mode** - FloorplanEmbed (not FloorplanContainer)
  - **Minimal bundle** - No lazy-loaded advanced/editor features
  - **Public access** - No auth required (project must be public)

  **Must NOT do**:
  - Include control panels or editor
  - Require authentication for public projects
  - Add navigation elements

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Blocks**: None (but validates URL strategy)
  - **Blocked By**: None
  - **Can Run In Parallel**: YES (with Tasks 0, 0.5)

  **References**:
  - `floorplan-app/src/routes/share/[token].tsx` - Similar pattern for sharing
  - `floorplan-app/src/components/FloorplanEmbed.tsx` - Basic viewer component

  **Acceptance Criteria**:

  ```
  # Playwright: Embed route renders basic view
  1. Navigate to: /embed/{validProjectId}
  2. Assert: Full viewport 3D viewer visible
  3. Assert: No header/footer visible
  4. Assert: No control panels visible
  5. Assert: No Monaco editor visible
  6. Screenshot: .sisyphus/evidence/task-0.6-embed.png
  ```

  ```
  # Playwright: Embed handles missing project
  1. Navigate to: /embed/nonexistent-id
  2. Assert: Error state or 404 displayed gracefully
  ```

  **Commit**: YES
  - Message: `feat(app): add /embed/:projectId route for external embedding`
  - Files: `floorplan-app/src/routes/embed/[projectId].tsx`

---

- [x] 1. Create FloorplanContainer + FloorplanBase

  **What to do**:

  ### Part A: Create FloorplanContainer (Mode Orchestrator)

  Create `floorplan-app/src/components/viewer/FloorplanContainer.tsx`:

  ```typescript
  import { createSignal, createMemo, lazy, Suspense, Show, onMount } from 'solid-js';
  import { useSearchParams } from '@solidjs/router';
  import { useSession } from '~/lib/auth-client';
  
  // Lazy-loaded tiers
  const FloorplanBase = lazy(() => import('./FloorplanBase'));
  const ControlPanels = lazy(() => import('./ControlPanels'));
  const EditorBundle = lazy(() => import('../editor/EditorBundle'));
  
  type ViewMode = 'basic' | 'advanced' | 'editor';
  
  interface FloorplanContainerProps {
    dsl: string;
    projectId?: string;
    isOwner: boolean;
    onDslChange?: (dsl: string) => void;
    onSave?: () => void;
  }
  
  export function FloorplanContainer(props: FloorplanContainerProps) {
    const [searchParams] = useSearchParams();
    const session = useSession();
    
    // Core instances (shared across tiers)
    const [core, setCore] = createSignal<FloorplanAppCore | InteractiveEditorCore | null>(null);
    const [overlay2D, setOverlay2D] = createSignal<Overlay2DManager | null>(null);
    
    // Mode detection logic
    const mode = createMemo<ViewMode>(() => {
      // 1. URL param overrides take precedence
      if (searchParams.view === 'basic') return 'basic';
      if (searchParams.view === 'advanced') return 'advanced';
      if (searchParams.edit === 'true' && (props.isOwner || session()?.user)) return 'editor';
      
      // 2. Auth-based defaults
      if (props.isOwner) return 'editor';           // Owner gets editor
      if (session()?.user) return 'advanced';       // Logged-in guest gets advanced
      return 'advanced';                            // Anonymous gets advanced (can explore)
    });
    
    // Should we use InteractiveEditorCore? (only for editor mode)
    const useEditorCore = createMemo(() => mode() === 'editor');
    
    // Callback when FloorplanBase initializes the core
    const handleCoreReady = (coreInstance: FloorplanAppCore, overlay?: Overlay2DManager) => {
      setCore(coreInstance);
      if (overlay) setOverlay2D(overlay);
    };
    
    return (
      <div class="floorplan-container relative w-full h-full">
        {/* Error Boundary */}
        <ErrorBoundary fallback={(err) => <ViewerError error={err} />}>
          
          {/* Base Layer: Always loads first */}
          <Suspense fallback={<ViewerSkeleton />}>
            <FloorplanBase
              dsl={props.dsl}
              theme="dark"
              useEditorCore={useEditorCore()}
              onCoreReady={handleCoreReady}
            />
          </Suspense>
          
          {/* Advanced Layer: Control panels (lazy) */}
          <Show when={mode() !== 'basic' && core()}>
            <Suspense fallback={<ControlPanelsSkeleton />}>
              <ControlPanels
                core={core()!}
                overlay2D={overlay2D()}
              />
            </Suspense>
          </Show>
          
          {/* Editor Layer: Monaco + selection + properties (lazy) */}
          <Show when={mode() === 'editor' && core()}>
            <Suspense fallback={<EditorSkeleton />}>
              <EditorBundle
                dsl={props.dsl}
                core={core() as InteractiveEditorCore}
                editable={props.isOwner}
                onDslChange={props.onDslChange}
                onSave={props.onSave}
              />
            </Suspense>
          </Show>
          
          {/* Mode indicator (dev only or subtle UI) */}
          <Show when={import.meta.env.DEV}>
            <div class="absolute top-2 left-2 badge badge-sm badge-ghost">
              {mode()}
            </div>
          </Show>
          
        </ErrorBoundary>
      </div>
    );
  }
  ```

  ### Part B: Refactor FloorplanEmbed → FloorplanBase

  Create `floorplan-app/src/components/viewer/FloorplanBase.tsx`:

  **Key changes from current FloorplanEmbed**:
  
  1. **Add `useEditorCore` prop** to switch between core types:
  ```typescript
  interface FloorplanBaseProps {
    dsl: string;
    theme?: 'light' | 'dark';
    useEditorCore?: boolean;  // NEW: Use InteractiveEditorCore instead
    onCoreReady?: (core: FloorplanAppCore, overlay?: Overlay2DManager) => void;  // NEW
  }
  ```

  2. **Conditional core creation**:
  ```typescript
  onMount(async () => {
    const viewerCore = await import('floorplan-viewer-core');
    
    // Choose core based on mode
    const CoreClass = props.useEditorCore 
      ? viewerCore.InteractiveEditorCore 
      : viewerCore.FloorplanAppCore;
    
    app = new CoreClass({
      containerId,
      initialTheme: props.theme ?? 'dark',
      initialDsl: props.dsl,
      enableSelection: props.useEditorCore,  // Selection only for editor
    });
    
    // Access 2D overlay from core (FloorplanAppCore creates it internally)
    // NOTE: Requires adding public getter to FloorplanAppCore - see Task 0.5
    const overlay = app.overlay2DManager;
    
    // Notify parent that core is ready
    props.onCoreReady?.(app, overlay);
    
    setIsLoading(false);
  });
  ```

  3. **Add overlay container to JSX**:
  ```typescript
  return (
    <div class="relative w-full h-full">
      {/* Loading/Error states - keep from FloorplanEmbed */}
      
      {/* 3D Viewer Container */}
      <div
        ref={containerRef}
        id={containerId}
        class="w-full h-full"
      />
      
      {/* 2D Overlay Container (for minimap) */}
      <div
        id={`${containerId}-overlay`}
        class="absolute bottom-4 left-4 pointer-events-auto"
      />
    </div>
  );
  ```

  4. **Keep FloorplanEmbed as backward-compatible alias**:
  ```typescript
  // floorplan-app/src/components/FloorplanEmbed.tsx
  import { FloorplanBase } from './viewer/FloorplanBase';
  
  // Re-export for backward compatibility
  export function FloorplanEmbed(props: FloorplanEmbedProps) {
    return (
      <FloorplanBase
        dsl={props.dsl}
        theme={props.theme}
        useEditorCore={false}
      />
    );
  }
  
  export default FloorplanEmbed;
  ```

  ### Part C: Skeleton Loading Components

  Create `floorplan-app/src/components/viewer/skeletons.tsx`:

  ```typescript
  export function ViewerSkeleton() {
    return (
      <div class="absolute inset-0 bg-base-300 animate-pulse">
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <div class="loading loading-spinner loading-lg text-primary" />
            <p class="mt-4 text-base-content/50">Loading 3D viewer...</p>
          </div>
        </div>
      </div>
    );
  }
  
  export function ControlPanelsSkeleton() {
    return (
      <div class="absolute right-0 top-0 h-full w-80 bg-base-200/80 animate-pulse">
        {/* Fake section headers */}
        <div class="p-4 space-y-4">
          <div class="h-8 bg-base-300 rounded skeleton-shimmer" />
          <div class="h-24 bg-base-300 rounded skeleton-shimmer" />
          <div class="h-8 bg-base-300 rounded skeleton-shimmer" />
          <div class="h-32 bg-base-300 rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }
  
  export function EditorSkeleton() {
    return (
      <div class="absolute left-0 top-0 h-full w-[450px] bg-base-200/80 animate-pulse">
        <div class="p-4">
          <div class="h-8 bg-base-300 rounded mb-4 skeleton-shimmer" />
          <div class="h-[calc(100vh-100px)] bg-base-300 rounded skeleton-shimmer" />
        </div>
        <p class="absolute bottom-4 left-4 text-base-content/50 text-sm">
          Loading code editor...
        </p>
      </div>
    );
  }
  ```

  ### Part D: Error Boundary

  ```typescript
  function ViewerError(props: { error: Error }) {
    return (
      <div class="absolute inset-0 flex items-center justify-center bg-base-300">
        <div class="card bg-error/10 border border-error max-w-md">
          <div class="card-body">
            <h2 class="card-title text-error">Failed to load viewer</h2>
            <p class="text-base-content/70">{props.error.message}</p>
            <div class="card-actions justify-end mt-4">
              <button
                class="btn btn-ghost btn-sm"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

  ### File Structure After Task 1

  ```
  floorplan-app/src/components/
  ├── viewer/
  │   ├── FloorplanContainer.tsx   # NEW: Mode orchestrator
  │   ├── FloorplanBase.tsx        # REFACTORED from FloorplanEmbed
  │   ├── ControlPanels.tsx        # Task 2
  │   └── skeletons.tsx            # NEW: Loading skeletons
  ├── editor/
  │   └── EditorBundle.tsx         # Task 3
  ├── FloorplanEmbed.tsx           # KEPT: Backward-compatible alias
  └── FloorplanEditor.tsx          # EXISTING: Will be updated in Task 4
  ```

  **Must NOT do**:
  - Break existing FloorplanEmbed usage (keep as alias)
  - Load ControlPanels or EditorBundle eagerly (must be lazy)
  - Remove loading/error states (keep from FloorplanEmbed)
  - Skip Overlay2DManager initialization (needed for advanced/editor)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: Task 0

  **References**:
  - `floorplan-app/src/components/FloorplanEmbed.tsx` - Current implementation (202 lines)
  - `floorplan-viewer/src/main.ts:49-80` - FloorplanAppCore initialization
  - `floorplan-editor/src/main.ts:127-133` - InteractiveEditorCore creation
  - `floorplan-viewer-core/src/overlay-2d-manager.ts` - Overlay2DManager API

  **Acceptance Criteria**:

  ```
  # Playwright: Basic mode renders 3D quickly
  1. Navigate to: /u/testuser/testproject?view=basic
  2. Start timer
  3. Wait for: canvas visible
  4. Assert: Load time < 1.5s
  5. Assert: No ".fp-control-panel" visible
  6. Assert: No ".monaco-editor" visible
  7. Assert: 3D viewer interactive (orbit with mouse drag)
  8. Screenshot: .sisyphus/evidence/task-1-basic.png
  ```

  ```
  # Playwright: Mode detection works for owner
  1. Login as owner
  2. Navigate to: /u/owner/myproject (no URL params)
  3. Assert: mode() === 'editor' (check dev badge or Monaco presence)
  4. Screenshot: .sisyphus/evidence/task-1-owner-mode.png
  ```

  ```
  # Playwright: Mode detection works for guest
  1. Login as different user
  2. Navigate to: /u/owner/myproject
  3. Assert: mode() === 'advanced' (controls visible, no Monaco)
  4. Screenshot: .sisyphus/evidence/task-1-guest-mode.png
  ```

  ```
  # Playwright: Mode detection works for anonymous
  1. Logout
  2. Navigate to: /u/owner/myproject
  3. Assert: mode() === 'advanced' (can explore, no editing)
  4. Screenshot: .sisyphus/evidence/task-1-anon-mode.png
  ```

  ```
  # Playwright: URL param override works
  1. Login as owner
  2. Navigate to: /u/owner/myproject?view=basic
  3. Assert: mode() === 'basic' (overrides owner default)
  4. Assert: No control panels, no Monaco
  5. Screenshot: .sisyphus/evidence/task-1-override.png
  ```

  ```
  # Playwright: Loading skeleton shows during lazy load
  1. Throttle network to slow 3G
  2. Navigate to: /u/testuser/testproject?view=advanced
  3. Assert: ViewerSkeleton visible first
  4. Wait for: 3D canvas appears
  5. Assert: ControlPanelsSkeleton visible while panels load
  6. Wait for: Control panels appear
  7. Screenshot: .sisyphus/evidence/task-1-skeleton.png
  ```

  ```
  # Playwright: Error boundary catches failures
  1. Navigate to: /u/testuser/nonexistent-project
  2. Assert: ViewerError card visible with error message
  3. Assert: "Reload page" button visible
  4. Screenshot: .sisyphus/evidence/task-1-error.png
  ```

  ```
  # Playwright: Backward compatibility - FloorplanEmbed still works
  1. Find existing page using <FloorplanEmbed /> (e.g., homepage hero)
  2. Navigate to that page
  3. Assert: 3D viewer loads correctly
  4. Assert: No console errors
  5. Screenshot: .sisyphus/evidence/task-1-compat.png
  ```

  **Commit**: YES
  - Message: `feat(app): add FloorplanContainer with progressive mode detection and lazy loading`
  - Files: 
    - `floorplan-app/src/components/viewer/FloorplanContainer.tsx`
    - `floorplan-app/src/components/viewer/FloorplanBase.tsx`
    - `floorplan-app/src/components/viewer/skeletons.tsx`
    - `floorplan-app/src/components/FloorplanEmbed.tsx` (updated as alias)

---

- [x] 2. Create ControlPanels component (lazy)

  **What to do**:

  ### Component Structure
  
  Create `floorplan-app/src/components/viewer/ControlPanels.tsx`:
  
  ```typescript
  // This is a lazy-loaded chunk - don't import at top level of app
  import { 
    createControlPanel,
    createCameraControlsUI,
    createLightControlsUI,
    createFloorControlsUI,
    createAnnotationControlsUI,
    Overlay2DManager,
    createValidationWarningsUI,
    createFileCommands,
    createViewCommands,
  } from 'floorplan-viewer-core';
  
  interface ControlPanelsProps {
    core: FloorplanAppCore;
    overlay2D: Overlay2DManager;
    onExport: (format: 'json' | 'glb') => void;
    class?: string;
  }
  
  export function ControlPanels(props: ControlPanelsProps) {
    let panelRef: HTMLDivElement;
    
    onMount(() => {
      // Initialize control panels after DOM ready
      setupCameraControls(props.core.cameraManager);
      setupLightingControls(props.core.light);
      setupFloorControls(props.core.floorManager, props.overlay2D);
      setupOverlay2DControls(props.overlay2D);
      setupAnnotationControls(props.core);
    });
    
    return (
      <div ref={panelRef} class="fp-control-panel animate-slide-in-right">
        {/* Sections render here */}
      </div>
    );
  }
  ```

  ### Control Panel Sections (replicate from floorplan-viewer/main.ts)

  **1. Camera Section** (lines 264-285):
  ```typescript
  // FOV slider (45-120 degrees)
  // Perspective/Isometric toggle button
  // Reset Camera button
  
  const cameraSection = createCameraControlsUI({
    onFovChange: (fov) => core.cameraManager.setFov(fov),
    onModeChange: (mode) => core.cameraManager.setCameraMode(mode),
    onIsometricView: () => core.cameraManager.setIsometricView(),
    onResetCamera: () => core.cameraManager.resetCamera(),
  });
  ```

  **2. Lighting Section** (main.ts:839-877):
  ```typescript
  // Azimuth slider (0-360°) - rotates light around scene
  // Elevation slider (0-90°) - light height angle
  // Intensity slider (0-3) - brightness
  
  function updateLightPosition(azimuth: number, elevation: number) {
    const distance = 20;
    const azimuthRad = azimuth * Math.PI / 180;
    const elevationRad = elevation * Math.PI / 180;
    
    const x = distance * Math.cos(elevationRad) * Math.sin(azimuthRad);
    const y = distance * Math.sin(elevationRad);
    const z = distance * Math.cos(elevationRad) * Math.cos(azimuthRad);
    
    core.light.position.set(x, y, z);
  }
  ```

  **3. View Section**:
  ```typescript
  // Theme toggle: Light / Dark / Blueprint
  // Exploded view slider (0-100%)
  
  explodedSlider.addEventListener('input', () => {
    core.setExplodedView(value / 100);
  });
  ```

  **4. Floors Section** (main.ts:921-969):
  ```typescript
  // Dynamic floor list with checkboxes
  // Show All / Hide All buttons
  
  function updateFloorListUI() {
    const floors = core.floors;
    const floorManager = core.floorManager;
    
    floors.forEach((floor, index) => {
      const floorId = floor.name || `floor-${index}`;
      // Create checkbox for each floor
    });
  }
  
  // Re-render 2D overlay when floor visibility changes
  floorManager.setFloorVisible(floorId, checked);
  overlay2D.render();
  ```

  **5. 2D Overlay Section**:
  ```typescript
  // Enable/disable toggle
  // Opacity slider (0.3-1.0)
  // Minimap renders via Overlay2DManager
  
  const overlay2D = new Overlay2DManager({
    getCurrentTheme: () => core.theme,
    getFloorplanData: () => currentJsonData,
    getVisibleFloorIds: () => core.floorManager?.getVisibleFloorIds() ?? [],
  });
  overlay2D.setupControls();
  ```

  **6. Annotations Section**:
  ```typescript
  // Show Area Labels toggle
  // Show Dimensions toggle
  // Show Floor Summary toggle
  // Units select (metric/imperial)
  
  core.annotationManager.setAreaLabelsVisible(checked);
  core.annotationManager.setDimensionsVisible(checked);
  ```

  ### Lazy Loading Pattern

  In `FloorplanContainer.tsx`:
  ```typescript
  const ControlPanels = lazy(() => import('./viewer/ControlPanels'));
  
  // Only load when mode is 'advanced' or 'editor'
  <Show when={mode() !== 'basic'}>
    <Suspense fallback={<ControlPanelsSkeleton />}>
      <ControlPanels core={core()} overlay2D={overlay2D()} />
    </Suspense>
  </Show>
  ```

  ### Animation on Load

  ```css
  .fp-control-panel {
    animation: slideInRight 0.3s ease-out;
  }
  
  .fp-control-section {
    opacity: 0;
    animation: slideUp 0.3s ease-out forwards;
  }
  
  .fp-control-section:nth-child(1) { animation-delay: 0.05s; }
  .fp-control-section:nth-child(2) { animation-delay: 0.10s; }
  .fp-control-section:nth-child(3) { animation-delay: 0.15s; }
  /* ... staggered reveal */
  ```

  **Must NOT do**:
  - Include Monaco editor (that's EditorBundle)
  - Include selection controls (editor-only)
  - Include properties panel (editor-only)
  - Load eagerly (must be lazy chunk via dynamic import)
  - Duplicate factories - use viewer-core exports

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 1)
  - **Blocks**: Task 4
  - **Blocked By**: Task 0

  **References**:
  - `floorplan-viewer/src/main.ts:151-350` - Full control panel setup to replicate
  - `floorplan-viewer/src/main.ts:254-295` - createEditorPanel, commands setup
  - `floorplan-editor/src/main.ts:839-970` - Lighting, theme, exploded, floors wiring
  - `floorplan-viewer-core/src/ui/control-panel-section.ts` - Factory function
  - `floorplan-viewer-core/README.md` - Factory function documentation

  **Acceptance Criteria**:
  
  ```
  # Playwright: Advanced mode shows all control panels
  1. Navigate to: /u/testuser/testproject?view=advanced
  2. Wait for: selector ".fp-control-panel" visible (max 3s)
  3. Assert: Camera section with FOV slider and Isometric button
  4. Assert: Lighting section with 3 sliders (azimuth, elevation, intensity)
  5. Assert: View section with theme toggle and exploded slider
  6. Assert: Floors section with floor checkboxes (dynamic list)
  7. Assert: 2D Overlay section with enable toggle and opacity slider
  8. Assert: Annotations section with area/dimensions toggles
  9. Screenshot: .sisyphus/evidence/task-2-panels.png
  ```

  ```
  # Playwright: Control panels are functional
  1. Drag FOV slider → Assert: 3D view FOV changes
  2. Click Isometric → Assert: Camera snaps to isometric view
  3. Drag azimuth slider → Assert: Light position rotates
  4. Toggle floor checkbox → Assert: Floor hides/shows in 3D and 2D overlay
  5. Toggle 2D overlay → Assert: Minimap shows/hides
  6. Screenshot: .sisyphus/evidence/task-2-functional.png
  ```

  ```
  # Playwright: Staggered animation on load
  1. Throttle network to slow 3G
  2. Navigate to: /u/testuser/testproject?view=advanced
  3. Assert: Sections animate in with stagger (visible delay between sections)
  4. Screenshot: .sisyphus/evidence/task-2-animation.png
  ```

  **Commit**: YES
  - Message: `feat(app): add ControlPanels with lazy loading and all viewer controls`
  - Files: `floorplan-app/src/components/viewer/ControlPanels.tsx`

---

- [x] 3. Create EditorBundle component (lazy)

  **What to do**:

  ### Component Structure
  
  Create `floorplan-app/src/components/editor/EditorBundle.tsx`:
  
  ```typescript
  // CRITICAL: This entire file is a lazy chunk - ~1.2MB with Monaco
  // Never import at top level of app
  
  interface EditorBundleProps {
    dsl: string;
    core: InteractiveEditorCore;  // Note: NOT FloorplanAppCore
    onDslChange: (newDsl: string) => void;
    onSave: () => void;
    editable: boolean;
  }
  
  export function EditorBundle(props: EditorBundleProps) {
    let editorContainerRef: HTMLDivElement;
    let dslEditor: ReturnType<typeof createDslEditor>;
    let editorSync: EditorViewerSync;
    
    onMount(async () => {
      // 1. Create Monaco editor
      dslEditor = createDslEditor({
        containerId: editorContainerRef.id,
        initialContent: props.dsl,
        theme: props.core.theme === 'dark' ? 'vs-dark' : 'vs',
        fontSize: 13,
        onChange: (content) => {
          // Debounced parse and update
          parseAndUpdate(content);
          props.onDslChange(content);
        },
      });
      
      // 2. Initialize EditorViewerSync for bidirectional sync
      initEditorViewerSync();
      
      // 3. Setup selection controls
      setupSelectionControls();
    });
    
    onCleanup(() => {
      editorSync?.dispose();
      dslEditor?.dispose();
    });
    
    return (
      <div class="editor-bundle">
        <EditorPanel ref={editorContainerRef} />
        <SelectionControls core={props.core} />
        <PropertiesPanel 
          core={props.core}
          onPropertyChange={handlePropertyChange}
        />
        <AddRoomDialog onAdd={handleAddRoom} />
        <DeleteConfirmDialog onConfirm={handleDelete} />
      </div>
    );
  }
  ```

  ### Key Subsystems to Implement

  **1. Monaco DSL Editor** (main.ts:98-111):
  ```typescript
  import { createDslEditor, monaco } from 'floorplan-viewer-core';
  
  const dslEditor = createDslEditor({
    containerId: 'editor-container',
    initialContent: props.dsl,
    theme: 'vs-dark',
    fontSize: 13,
    onChange: (content: string) => {
      // Debounce 300ms before parsing
      clearTimeout(parseDebounceTimeout);
      parseDebounceTimeout = setTimeout(() => {
        parseAndUpdate(content);
      }, 300);
    },
  });
  ```

  **2. EditorViewerSync** (main.ts:393-487):
  
  This is the CORE feature - bidirectional sync between Monaco cursor and 3D selection:
  
  ```typescript
  import { EditorViewerSync } from 'floorplan-editor';
  
  function initEditorViewerSync() {
    const selectionManager = core.getSelectionManager();
    if (!selectionManager) return;
    
    editorSync = new EditorViewerSync(
      dslEditor.editor,
      selectionManager,
      { debug: false }
    );
    
    // Editor cursor → 3D selection
    editorSync.onEditorSelect((entityKey, isAdditive) => {
      const [floorId, entityType, entityId] = entityKey.split(':');
      const entity = findEntityByKey(floorId, entityType, entityId);
      if (entity) {
        selectionManager.select(entity, isAdditive);
      }
    });
    
    // Editor cursor → 3D hierarchical selection (floor selects all rooms)
    editorSync.onEditorHierarchicalSelect((result, isAdditive) => {
      const entities = result.allKeys.map(key => findEntityByKey(...key.split(':')));
      selectionManager.selectMultiple(entities.filter(Boolean), isAdditive);
    });
    
    // Editor text highlight → 3D preview highlight
    editorSync.onEditorHighlight((entityKeys) => {
      selectionManager.clearHighlight();
      entityKeys.forEach(key => {
        const entity = findEntityByKey(...key.split(':'));
        if (entity) selectionManager.highlight(entity);
      });
    });
    
    // 3D selection → Editor scroll (handled by EditorViewerSync internally)
    // Uses entityLocations from InteractiveEditorCore
  }
  ```

  **3. Selection Controls** (editor-only):
  ```typescript
  // Enable Selection Mode toggle
  // Containment mode checkbox (rooms must be fully inside marquee)
  // Marquee mode checkbox (click-drag rectangle selection)
  
  <div class="fp-control-section">
    <div class="fp-section-header">Selection</div>
    <div class="fp-section-content">
      <label class="fp-checkbox-row">
        <input type="checkbox" onChange={(e) => {
          core.selectionManager.setEnabled(e.target.checked);
        }} />
        Enable Selection Mode (V)
      </label>
      <label class="fp-checkbox-row">
        <input type="checkbox" onChange={(e) => {
          core.selectionManager.setContainmentMode(e.target.checked);
        }} />
        Containment mode
      </label>
    </div>
  </div>
  ```

  **4. Properties Panel** (main.ts:256-293):
  ```typescript
  import { dslPropertyEditor } from 'floorplan-editor';
  
  function handlePropertyChange(entityType: string, entityId: string, prop: string, value: any) {
    // Generate Monaco edit operation
    const edit = dslPropertyEditor.generatePropertyEdit(
      dslEditor.getValue(),
      entityType,
      entityId,
      prop,
      value
    );
    
    if (edit) {
      // Apply edit to Monaco
      dslEditor.editor.executeEdits('property-panel', [edit]);
    }
  }
  
  // Properties panel shows for selected entity:
  // - Room: name, position (x, y), size (width, height), color
  // - Wall: thickness, height, material
  // - Connection: width, height, type (door/window/opening)
  ```

  **5. Add Room Dialog** (main.ts:348-386):
  ```typescript
  function handleAddRoom(options: { name: string; x: number; y: number; width: number; height: number }) {
    const currentContent = dslEditor.getValue();
    
    // Generate room DSL
    const roomDsl = `\n  room ${options.name} at (${options.x}, ${options.y}) size (${options.width} x ${options.height})\n`;
    
    // Find insertion point (after last room in current floor)
    const insertIndex = findRoomInsertionPoint(currentContent);
    
    // Insert and update editor
    const newContent = currentContent.slice(0, insertIndex) + roomDsl + currentContent.slice(insertIndex);
    dslEditor.setValue(newContent);
  }
  ```

  **6. Delete Confirmation** (main.ts:674-731):
  ```typescript
  function handleDelete(entityType: string, entityId: string) {
    // Show confirmation dialog
    // On confirm: Remove entity from DSL
    // Handle cascade (deleting room removes its connections)
    
    const newContent = dslPropertyEditor.removeEntity(
      dslEditor.getValue(),
      entityType,
      entityId
    );
    dslEditor.setValue(newContent);
  }
  ```

  ### InteractiveEditorCore vs FloorplanAppCore

  **CRITICAL**: Editor mode must use `InteractiveEditorCore`, not `FloorplanAppCore`:
  
  ```typescript
  // In FloorplanContainer, switch core based on mode
  const core = mode() === 'editor'
    ? new InteractiveEditorCore({ containerId: 'app', ... })
    : new FloorplanAppCore({ containerId: 'app', ... });
  ```
  
  InteractiveEditorCore adds:
  - `hasParseError` state (shows stale geometry warning)
  - `entityLocations` (line numbers for EditorViewerSync)
  - `getSelectionManager()` for selection APIs
  - Parse error handling (keeps last valid 3D view)

  ### Lazy Loading Pattern

  In `FloorplanContainer.tsx`:
  ```typescript
  const EditorBundle = lazy(() => import('./editor/EditorBundle'));
  
  // Only load when mode is 'editor'
  <Show when={mode() === 'editor'}>
    <Suspense fallback={<EditorLoadingSkeleton />}>
      <EditorBundle 
        dsl={dsl()}
        core={core() as InteractiveEditorCore}
        onDslChange={handleDslChange}
        onSave={handleSave}
        editable={isOwner()}
      />
    </Suspense>
  </Show>
  ```

  **Must NOT do**:
  - Duplicate control panels (they come from ControlPanels component)
  - Load Monaco statically (dynamic import via lazy() only)
  - Skip EditorViewerSync (this is THE core editing feature)
  - Use FloorplanAppCore for editor mode (must use InteractiveEditorCore)
  - Forget cleanup on unmount (memory leaks from Monaco/Three.js)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 4, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-editor/src/main.ts:73-111` - Langium parser + Monaco setup
  - `floorplan-editor/src/main.ts:127-133` - InteractiveEditorCore creation
  - `floorplan-editor/src/main.ts:393-487` - EditorViewerSync with all callbacks
  - `floorplan-editor/src/main.ts:256-293` - Property change handling
  - `floorplan-editor/src/main.ts:348-386` - Add room dialog handling
  - `floorplan-editor/src/main.ts:674-731` - Delete handling
  - `floorplan-editor/src/editor-viewer-sync.ts` - Sync class implementation
  - `floorplan-editor/src/dsl-generator.ts` - dslPropertyEditor for DSL edits

  **Acceptance Criteria**:
  
  ```
  # Playwright: Monaco editor loads and displays DSL
  1. Login as owner
  2. Navigate to: /u/owner/myproject
  3. Wait for: selector ".monaco-editor" visible (max 5s for Monaco load)
  4. Assert: Editor shows DSL content with syntax highlighting
  5. Assert: Line numbers visible
  6. Screenshot: .sisyphus/evidence/task-3-monaco.png
  ```

  ```
  # Playwright: Bidirectional sync - Editor → 3D
  1. Click in Monaco on line containing "room Kitchen"
  2. Wait: 500ms for debounce
  3. Assert: Kitchen room mesh has selection highlight in 3D
  4. Assert: Selection outline/glow visible around Kitchen
  5. Screenshot: .sisyphus/evidence/task-3-editor-to-3d.png
  ```

  ```
  # Playwright: Bidirectional sync - 3D → Editor
  1. Click on Bedroom room mesh in 3D viewer
  2. Wait: 500ms
  3. Assert: Monaco editor scrolled to "room Bedroom" line
  4. Assert: Line highlighted or cursor positioned there
  5. Screenshot: .sisyphus/evidence/task-3-3d-to-editor.png
  ```

  ```
  # Playwright: Properties panel editing
  1. Click on Kitchen room in 3D
  2. Wait for: Properties panel visible
  3. Assert: Panel shows "Kitchen" in name field
  4. Assert: Width/height fields show current values
  5. Change width to "6"
  6. Wait: 500ms for edit to apply
  7. Assert: Monaco shows updated "size (6 x ...)"
  8. Assert: 3D room visually wider
  9. Screenshot: .sisyphus/evidence/task-3-properties.png
  ```

  ```
  # Playwright: Add room functionality
  1. Click "+ Room" button
  2. Fill dialog: name="Bathroom", x=10, y=0, width=3, height=4
  3. Click "Add" button
  4. Assert: Monaco contains new "room Bathroom at (10, 0) size (3 x 4)"
  5. Assert: Bathroom mesh appears in 3D
  6. Screenshot: .sisyphus/evidence/task-3-add-room.png
  ```

  ```
  # Playwright: Delete room functionality
  1. Select Kitchen room
  2. Click "Delete" button in properties panel
  3. Assert: Confirmation dialog appears
  4. Click "Confirm Delete"
  5. Assert: Monaco no longer contains "room Kitchen"
  6. Assert: Kitchen mesh removed from 3D
  7. Screenshot: .sisyphus/evidence/task-3-delete.png
  ```

  ```
  # Playwright: Selection controls
  1. Assert: Selection section visible with Enable toggle
  2. Check "Enable Selection Mode"
  3. Shift+Click multiple rooms
  4. Assert: Multiple rooms selected (selection count badge)
  5. Check "Containment mode"
  6. Draw marquee selection
  7. Assert: Only fully-contained rooms selected
  8. Screenshot: .sisyphus/evidence/task-3-selection.png
  ```

  **Commit**: YES
  - Message: `feat(app): add EditorBundle with Monaco, EditorViewerSync, and property editing`
  - Files: `floorplan-app/src/components/editor/EditorBundle.tsx`, related components

---

- [x] 4. Update routes with mode detection and Header integration

  **What to do**:

  ### Part A: Update Project Route

  Update `floorplan-app/src/routes/u/[username]/[project]/index.tsx`:

  ```typescript
  import { FloorplanContainer } from '~/components/viewer/FloorplanContainer';
  import { useSearchParams } from '@solidjs/router';
  import { useSession } from '~/lib/auth-client';
  
  export default function ProjectPage() {
    const [searchParams] = useSearchParams();
    const session = useSession();
    const project = useProject(); // existing hook
    
    // Determine ownership
    const isOwner = createMemo(() => 
      session()?.user?.id === project()?.ownerId
    );
    
    // Replace FloorplanEditor with FloorplanContainer
    return (
      <main class="h-screen flex flex-col">
        <Header 
          variant="minimal"
          showViewerControls={true}  // NEW prop
          mode={mode()}              // NEW prop
          onThemeToggle={handleThemeToggle}
          onCommandPalette={openCommandPalette}
        />
        
        <div class="flex-1 relative">
          <FloorplanContainer
            dsl={project()?.dsl ?? ''}
            projectId={project()?._id}
            isOwner={isOwner()}
            onDslChange={handleDslChange}
            onSave={handleSave}
          />
          
          {/* Auth overlays */}
          <Show when={!session()?.user}>
            <AuthOverlay message="Sign in to edit" />
          </Show>
          
          <Show when={session()?.user && !isOwner()}>
            <ForkPrompt project={project()} />
          </Show>
        </div>
      </main>
    );
  }
  ```

  ### Part B: Extend Header Component

  Update `floorplan-app/src/components/Header.tsx` to support viewer controls:

  ```typescript
  interface HeaderProps {
    // ... existing props
    showViewerControls?: boolean;  // NEW
    mode?: 'basic' | 'advanced' | 'editor';  // NEW
    onThemeToggle?: () => void;  // NEW
    onCommandPalette?: () => void;  // NEW
  }
  
  export function Header(props: HeaderProps) {
    return (
      <header class={headerClasses()}>
        {/* Left: Logo/back button - existing */}
        
        {/* Center: Project name/version - existing */}
        
        {/* Right: Viewer controls (NEW) + auth menu */}
        <div class="flex items-center gap-2">
          <Show when={props.showViewerControls}>
            {/* Mode indicator badge */}
            <span class="badge badge-sm badge-ghost hidden sm:inline-flex">
              {props.mode}
            </span>
            
            {/* Theme toggle */}
            <button 
              class="btn btn-sm btn-ghost"
              onClick={props.onThemeToggle}
              title="Toggle theme"
            >
              <Show when={theme() === 'dark'} fallback="🌙">☀️</Show>
            </button>
            
            {/* Command palette trigger */}
            <button
              class="btn btn-sm btn-ghost gap-1"
              onClick={props.onCommandPalette}
              title="Command palette (⌘K)"
            >
              <span class="hidden sm:inline">Commands</span>
              <kbd class="kbd kbd-xs">⌘K</kbd>
            </button>
          </Show>
          
          {/* Existing auth menu */}
          <AuthMenu />
        </div>
      </header>
    );
  }
  ```

  ### Part C: Wire Save to Convex

  ```typescript
  // In ProjectPage component
  const saveMutation = useConvexMutation(api.projects.save);
  const [isDirty, setIsDirty] = createSignal(false);
  const [lastSavedDsl, setLastSavedDsl] = createSignal(project()?.dsl);
  
  const handleDslChange = (newDsl: string) => {
    setIsDirty(newDsl !== lastSavedDsl());
  };
  
  const handleSave = async () => {
    if (!isOwner()) return; // Guard
    
    try {
      await saveMutation({
        projectId: project()._id,
        dsl: currentDsl(),
      });
      setLastSavedDsl(currentDsl());
      setIsDirty(false);
      showToast('Saved!', 'success');
    } catch (err) {
      showToast('Save failed', 'error');
    }
  };
  
  // Keyboard shortcut
  onMount(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isOwner()) handleSave();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    onCleanup(() => document.removeEventListener('keydown', handleKeydown));
  });
  ```

  ### Part D: Fork Prompt Component

  ```typescript
  function ForkPrompt(props: { project: Project }) {
    return (
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div class="alert bg-base-200 border border-primary/30 shadow-lg">
          <span class="text-sm">
            Editing a copy. Fork to save your changes.
          </span>
          <ForkButton 
            project={props.project}
            class="btn btn-primary btn-sm"
          />
        </div>
      </div>
    );
  }
  ```

  ### Part E: Embed Route (stays basic)

  Verify `floorplan-app/src/routes/embed/[projectId].tsx` uses basic mode:

  ```typescript
  export default function EmbedPage() {
    return (
      <FloorplanContainer
        dsl={project()?.dsl ?? ''}
        isOwner={false}
        // No onDslChange, onSave - read only
      />
      // FloorplanContainer will detect no auth → advanced mode
      // But we want basic for embeds, so add URL param or prop
    );
  }
  ```

  Actually, for embeds, force basic mode via searchParams or new prop:
  ```typescript
  <FloorplanContainer
    dsl={...}
    isOwner={false}
    forceMode="basic"  // NEW prop for embed override
  />
  ```

  **Must NOT do**:
  - Change /embed route behavior (stays basic forever)
  - Force editor for non-owners
  - Break existing auth patterns
  - Duplicate Header component (extend existing)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 5)
  - **Blocks**: Task 6
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `floorplan-app/src/routes/u/[username]/[project]/index.tsx` - Project page
  - `floorplan-app/src/routes/embed/[projectId].tsx` - Embed route
  - `floorplan-app/src/components/Header.tsx` - Header component
  - `floorplan-app/src/components/AuthGatedEditorPanel.tsx` - Auth overlay patterns
  - `floorplan-app/src/components/ForkButton.tsx` - Fork button
  - `floorplan-app/convex/projects.ts` - Save mutation

  **Acceptance Criteria**:

  ```
  # Playwright: Owner auto-gets editor mode
  1. Login as owner
  2. Navigate to: /u/owner/myproject (no params)
  3. Assert: Monaco editor visible (editor mode)
  4. Assert: Header shows "editor" mode badge
  5. Assert: Save shortcut works (Ctrl+S)
  6. Screenshot: .sisyphus/evidence/task-4-owner.png
  ```

  ```
  # Playwright: Guest gets advanced mode + fork CTA
  1. Login as different user
  2. Navigate to: /u/owner/myproject
  3. Assert: Control panels visible (advanced mode)
  4. Assert: No Monaco editor (not editor mode)
  5. Assert: Fork prompt visible at bottom
  6. Assert: Clicking fork creates new project
  7. Screenshot: .sisyphus/evidence/task-4-guest.png
  ```

  ```
  # Playwright: Anonymous gets advanced mode + login overlay
  1. Logout
  2. Navigate to: /u/owner/myproject
  3. Assert: Control panels visible (advanced mode)
  4. Assert: Auth overlay visible ("Sign in to edit")
  5. Assert: Can still interact with 3D and controls
  6. Screenshot: .sisyphus/evidence/task-4-anon.png
  ```

  ```
  # Playwright: URL param overrides
  1. Login as owner
  2. Navigate to: /u/owner/myproject?view=basic
  3. Assert: Basic mode (no controls, no Monaco)
  4. Screenshot: .sisyphus/evidence/task-4-override.png
  ```

  ```
  # Playwright: Embed route always basic
  1. Navigate to: /embed/{projectId}
  2. Assert: Basic mode (no controls, no Monaco)
  3. Assert: No auth overlays
  4. Screenshot: .sisyphus/evidence/task-4-embed.png
  ```

  ```
  # Playwright: Header viewer controls
  1. Navigate to: /u/testuser/testproject (as owner)
  2. Assert: Header shows mode badge
  3. Assert: Theme toggle button visible
  4. Click theme toggle → theme changes
  5. Assert: Command palette button visible with ⌘K badge
  6. Click command palette button → palette opens
  7. Screenshot: .sisyphus/evidence/task-4-header.png
  ```

  ```
  # Playwright: Save workflow
  1. Login as owner
  2. Navigate to: /u/owner/myproject
  3. Edit DSL in Monaco
  4. Assert: "Unsaved changes" indicator appears
  5. Press Ctrl+S
  6. Assert: Toast shows "Saved!"
  7. Refresh page
  8. Assert: Changes persisted
  9. Screenshot: .sisyphus/evidence/task-4-save.png
  ```

  **Commit**: YES
  - Message: `feat(app): add mode detection, Header viewer controls, and save workflow`
  - Files:
    - `floorplan-app/src/routes/u/[username]/[project]/index.tsx`
    - `floorplan-app/src/routes/embed/[projectId].tsx`
    - `floorplan-app/src/components/Header.tsx`
    - `floorplan-app/src/components/ForkPrompt.tsx` (new)

---

- [x] 5. Responsive layouts per tier

  **What to do**:

  ### Layout Matrix

  | Viewport | Basic | Advanced | Editor |
  |----------|-------|----------|--------|
  | **Phone (<640px)** | 3D fullscreen | 3D + FAB → bottom sheet | 3D + FAB (no Monaco) |
  | **Tablet (640-1024px)** | 3D fullscreen | 3D + right sidebar (collapsible) | 3D + right sidebar + left drawer |
  | **Desktop (>1024px)** | 3D fullscreen | 3D + right sidebar (320px) | Left panel + 3D + right sidebar |

  ### Part A: Create Responsive Container Styles

  Create `floorplan-app/src/styles/viewer-layout.css`:

  ```css
  /* ===== Base Layout ===== */
  .floorplan-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  
  .floorplan-3d {
    position: absolute;
    inset: 0;
    transition: left 0.25s ease-out, right 0.25s ease-out;
  }
  
  /* ===== Control Panel (Right Sidebar) ===== */
  .control-panel {
    position: absolute;
    top: 0;
    right: 0;
    height: 100%;
    width: 320px;
    background: oklch(12% 0.02 250 / 0.95);
    backdrop-filter: blur(8px);
    border-left: 1px solid oklch(18% 0.03 250);
    overflow-y: auto;
    transform: translateX(0);
    transition: transform 0.25s ease-out;
    z-index: 100;
  }
  
  .control-panel.collapsed {
    transform: translateX(100%);
  }
  
  /* ===== Editor Panel (Left Sidebar) ===== */
  .editor-panel {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 450px;
    min-width: 300px;
    max-width: 80vw;
    background: oklch(12% 0.02 250);
    border-right: 1px solid oklch(18% 0.03 250);
    display: flex;
    flex-direction: column;
    transform: translateX(0);
    transition: transform 0.25s ease-out;
    z-index: 200;
  }
  
  .editor-panel.collapsed {
    transform: translateX(-100%);
  }
  
  /* ===== Phone Layout (<640px) ===== */
  @media (max-width: 639px) {
    /* FAB for controls */
    .control-panel-fab {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: oklch(75% 0.18 195);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px oklch(0% 0 0 / 0.3);
      z-index: 150;
      transition: transform 0.2s ease-out;
    }
    
    .control-panel-fab:active {
      transform: scale(0.95);
    }
    
    /* Bottom sheet for controls */
    .control-panel {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 70vh;
      max-height: 70vh;
      border-radius: 1rem 1rem 0 0;
      border-left: none;
      border-top: 1px solid oklch(18% 0.03 250);
      transform: translateY(100%);
    }
    
    .control-panel.open {
      transform: translateY(0);
    }
    
    /* Bottom sheet handle */
    .control-panel::before {
      content: '';
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 4px;
      background: oklch(50% 0 0);
      border-radius: 2px;
    }
    
    /* Editor panel - hide Monaco on phone */
    .editor-panel {
      display: none !important;
    }
    
    /* Use basic controls in FAB menu instead */
    .mobile-editor-controls {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem;
    }
  }
  
  /* ===== Tablet Layout (640-1024px) ===== */
  @media (min-width: 640px) and (max-width: 1023px) {
    .control-panel-fab {
      display: none;
    }
    
    .control-panel {
      width: 280px;
    }
    
    /* When control panel open, shift 3D */
    .floorplan-3d.controls-open {
      right: 280px;
    }
    
    /* Editor as left drawer (slide-in) */
    .editor-panel {
      width: 350px;
      transform: translateX(-100%);
    }
    
    .editor-panel.open {
      transform: translateX(0);
    }
    
    .floorplan-3d.editor-open {
      left: 350px;
    }
    
    /* Toggle button for editor */
    .editor-toggle {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 80px;
      background: oklch(18% 0.03 250);
      border-radius: 0 8px 8px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 150;
      transition: left 0.25s ease-out;
    }
    
    .editor-toggle.editor-open {
      left: 350px;
    }
  }
  
  /* ===== Desktop Layout (>1024px) ===== */
  @media (min-width: 1024px) {
    .control-panel-fab {
      display: none;
    }
    
    .control-panel {
      width: 320px;
    }
    
    .floorplan-3d.controls-open {
      right: 320px;
    }
    
    .editor-panel {
      width: 450px;
    }
    
    .floorplan-3d.editor-open {
      left: 450px;
    }
    
    /* Resize handle for editor panel */
    .editor-resize-handle {
      position: absolute;
      top: 0;
      right: -4px;
      width: 8px;
      height: 100%;
      cursor: ew-resize;
      z-index: 10;
    }
    
    .editor-resize-handle:hover {
      background: oklch(75% 0.18 195 / 0.3);
    }
  }
  
  /* ===== Touch-Friendly Controls ===== */
  @media (pointer: coarse) {
    /* Minimum 44px tap targets */
    .fp-section-header {
      min-height: 44px;
      padding: 12px 16px;
    }
    
    .btn-sm {
      min-height: 44px;
      min-width: 44px;
    }
    
    .checkbox, .range {
      min-height: 24px;
    }
    
    /* Larger sliders for touch */
    .range {
      height: 8px;
    }
    
    .range::-webkit-slider-thumb {
      width: 24px;
      height: 24px;
    }
  }
  
  /* ===== Panel Animations ===== */
  .panel-enter {
    animation: slideIn 0.25s ease-out forwards;
  }
  
  .panel-exit {
    animation: slideOut 0.2s ease-in forwards;
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(20px); }
  }
  
  /* ===== Overlay/Minimap Responsive ===== */
  .fp-overlay-2d {
    /* Desktop: bottom-left */
    bottom: 1rem;
    left: 1rem;
  }
  
  @media (max-width: 639px) {
    /* Phone: smaller, top-left to avoid FAB */
    .fp-overlay-2d {
      top: 1rem;
      left: 1rem;
      bottom: auto;
      width: 150px;
      height: 120px;
    }
  }
  
  /* ===== Floor Summary Responsive ===== */
  @media (max-width: 639px) {
    .fp-floor-summary-panel {
      display: none; /* Too small for phone */
    }
  }
  ```

  ### Part B: Mobile FAB Component

  Create `floorplan-app/src/components/viewer/MobileControlsFAB.tsx`:

  ```typescript
  interface MobileControlsFABProps {
    mode: 'advanced' | 'editor';
    onOpenControls: () => void;
    onToggleTheme: () => void;
  }
  
  export function MobileControlsFAB(props: MobileControlsFABProps) {
    const [menuOpen, setMenuOpen] = createSignal(false);
    
    return (
      <div class="control-panel-fab-container">
        {/* Speed dial menu */}
        <Show when={menuOpen()}>
          <div class="mobile-speed-dial animate-slide-up">
            <button 
              class="speed-dial-item"
              onClick={props.onToggleTheme}
              title="Toggle theme"
            >
              ☀️
            </button>
            <button 
              class="speed-dial-item"
              onClick={props.onOpenControls}
              title="Open controls"
            >
              ⚙️
            </button>
          </div>
        </Show>
        
        {/* Main FAB */}
        <button 
          class="control-panel-fab"
          onClick={() => setMenuOpen(!menuOpen())}
          aria-label="Open controls menu"
          aria-expanded={menuOpen()}
        >
          <Show when={menuOpen()} fallback={<SettingsIcon />}>
            <CloseIcon />
          </Show>
        </button>
      </div>
    );
  }
  ```

  ### Part C: Bottom Sheet Component

  Create `floorplan-app/src/components/viewer/BottomSheet.tsx`:

  ```typescript
  interface BottomSheetProps {
    open: boolean;
    onClose: () => void;
    children: JSX.Element;
  }
  
  export function BottomSheet(props: BottomSheetProps) {
    let sheetRef: HTMLDivElement;
    let startY = 0;
    let currentY = 0;
    
    // Swipe down to close
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        sheetRef.style.transform = `translateY(${diff}px)`;
      }
    };
    
    const handleTouchEnd = () => {
      const diff = currentY - startY;
      if (diff > 100) {
        props.onClose();
      }
      sheetRef.style.transform = '';
    };
    
    return (
      <>
        {/* Backdrop */}
        <Show when={props.open}>
          <div 
            class="fixed inset-0 bg-black/40 z-100"
            onClick={props.onClose}
          />
        </Show>
        
        {/* Sheet */}
        <div 
          ref={sheetRef!}
          class={`control-panel ${props.open ? 'open' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div class="pt-6"> {/* Space for handle */}
            {props.children}
          </div>
        </div>
      </>
    );
  }
  ```

  ### Part D: Update FloorplanContainer for Responsive

  ```typescript
  export function FloorplanContainer(props: Props) {
    const [controlsOpen, setControlsOpen] = createSignal(true);
    const [editorOpen, setEditorOpen] = createSignal(true);
    const [isMobile, setIsMobile] = createSignal(false);
    
    // Detect mobile
    onMount(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 640);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      onCleanup(() => window.removeEventListener('resize', checkMobile));
    });
    
    // Notify 3D core on panel changes (so it can resize)
    createEffect(() => {
      core()?.handleResize();
    });
    
    return (
      <div class="floorplan-container">
        {/* 3D Canvas */}
        <div class={`floorplan-3d ${controlsOpen() ? 'controls-open' : ''} ${editorOpen() && mode() === 'editor' ? 'editor-open' : ''}`}>
          <FloorplanBase ... />
        </div>
        
        {/* Mobile: FAB + Bottom Sheet */}
        <Show when={isMobile() && mode() !== 'basic'}>
          <MobileControlsFAB 
            mode={mode()}
            onOpenControls={() => setControlsOpen(true)}
          />
          <BottomSheet open={controlsOpen()} onClose={() => setControlsOpen(false)}>
            <ControlPanels core={core()} />
          </BottomSheet>
        </Show>
        
        {/* Desktop/Tablet: Sidebars */}
        <Show when={!isMobile() && mode() !== 'basic'}>
          <div class={`control-panel ${controlsOpen() ? '' : 'collapsed'}`}>
            <ControlPanels core={core()} />
          </div>
          
          <Show when={mode() === 'editor'}>
            <div class={`editor-panel ${editorOpen() ? '' : 'collapsed'}`}>
              <EditorBundle ... />
            </div>
          </Show>
        </Show>
      </div>
    );
  }
  ```

  **Must NOT do**:
  - Force desktop layout on mobile
  - Hide 3D viewer on any breakpoint (always visible)
  - Add complex/heavy animations (performance on mobile)
  - Break touch interactions (pinch-zoom, pan)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:
  - `floorplan-app/src/app.css` - Existing responsive patterns
  - `floorplan-editor/index.html:26-46` - Editor panel structure
  - `floorplan-editor/index.html:56-211` - Control panel structure
  - DaisyUI drawer/modal patterns

  **Acceptance Criteria**:

  ```
  # Playwright: Phone layout - Basic mode
  1. Set viewport: 375x667
  2. Navigate to: /u/testuser/testproject?view=basic
  3. Assert: 3D fills entire screen
  4. Assert: No FAB, no controls
  5. Assert: Can pinch-zoom and pan
  6. Screenshot: .sisyphus/evidence/task-5-phone-basic.png
  ```

  ```
  # Playwright: Phone layout - Advanced mode
  1. Set viewport: 375x667
  2. Navigate to: /u/testuser/testproject?view=advanced
  3. Assert: 3D fills most of screen
  4. Assert: FAB visible in bottom-right
  5. Click FAB
  6. Assert: Speed dial menu appears
  7. Click settings icon in speed dial
  8. Assert: Bottom sheet slides up with controls
  9. Assert: Can swipe down to dismiss
  10. Screenshot: .sisyphus/evidence/task-5-phone-advanced.png
  ```

  ```
  # Playwright: Phone layout - Editor mode
  1. Set viewport: 375x667
  2. Login as owner
  3. Navigate to: /u/owner/myproject
  4. Assert: 3D visible
  5. Assert: FAB visible
  6. Assert: NO Monaco editor panel (too small)
  7. Screenshot: .sisyphus/evidence/task-5-phone-editor.png
  ```

  ```
  # Playwright: Tablet layout - Advanced mode
  1. Set viewport: 768x1024
  2. Navigate to: /u/testuser/testproject?view=advanced
  3. Assert: 3D on left
  4. Assert: Control sidebar on right (280px)
  5. Assert: Sidebar has collapse button
  6. Click collapse → sidebar hides, 3D expands
  7. Screenshot: .sisyphus/evidence/task-5-tablet-advanced.png
  ```

  ```
  # Playwright: Tablet layout - Editor mode
  1. Set viewport: 768x1024
  2. Login as owner
  3. Navigate to: /u/owner/myproject
  4. Assert: Right sidebar visible (controls)
  5. Assert: Editor toggle button on left edge
  6. Click editor toggle
  7. Assert: Monaco panel slides in from left
  8. Assert: 3D adjusts width
  9. Screenshot: .sisyphus/evidence/task-5-tablet-editor.png
  ```

  ```
  # Playwright: Desktop layout - Editor mode
  1. Set viewport: 1440x900
  2. Login as owner
  3. Navigate to: /u/owner/myproject
  4. Assert: Editor panel on left (450px)
  5. Assert: 3D in center
  6. Assert: Control panel on right (320px)
  7. Assert: Can resize editor panel via drag handle
  8. Screenshot: .sisyphus/evidence/task-5-desktop-editor.png
  ```

  ```
  # Playwright: Touch-friendly controls
  1. Set viewport: 768x1024, touch device
  2. Navigate to: /u/testuser/testproject?view=advanced
  3. Assert: All buttons have min 44px tap target
  4. Assert: Sliders are larger for touch
  5. Tap and drag slider → smooth interaction
  6. Screenshot: .sisyphus/evidence/task-5-touch.png
  ```

  ```
  # Playwright: 3D canvas resizes correctly
  1. Set viewport: 1440x900
  2. Navigate to: /u/owner/myproject
  3. Collapse editor panel
  4. Assert: 3D canvas fills expanded space
  5. Assert: No black bars or overflow
  6. Expand editor panel
  7. Assert: 3D shrinks correctly
  8. Screenshot: .sisyphus/evidence/task-5-resize.png
  ```

  **Commit**: YES
  - Message: `feat(app): add responsive layouts with mobile FAB and bottom sheet`
  - Files:
    - `floorplan-app/src/styles/viewer-layout.css`
    - `floorplan-app/src/components/viewer/MobileControlsFAB.tsx`
    - `floorplan-app/src/components/viewer/BottomSheet.tsx`
    - Updated `FloorplanContainer.tsx`

---

- [x] 6. Playwright test suite

  **What to do**:

  ### Test File Structure

  Create `floorplan-app/e2e/progressive-viewer.spec.ts`:

  ```typescript
  import { test, expect, Page } from '@playwright/test';
  
  // ============ Auth Fixtures ============
  
  // Owner fixture - logged in as project owner
  test.describe.configure({ mode: 'serial' });
  
  const ownerStorageState = 'e2e/.auth/owner.json';
  const guestStorageState = 'e2e/.auth/guest.json';
  
  async function loginAsOwner(page: Page) {
    // Login flow...
    await page.context().storageState({ path: ownerStorageState });
  }
  
  async function loginAsGuest(page: Page) {
    // Login as different user...
    await page.context().storageState({ path: guestStorageState });
  }
  
  // ============ Test Suites ============
  ```

  ### Test Suite 1: Basic Mode

  ```typescript
  test.describe('Basic Mode', () => {
    test('loads quickly with no controls', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/u/testuser/testproject?view=basic');
      
      // Wait for 3D canvas
      await expect(page.locator('#app canvas')).toBeVisible({ timeout: 2000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(1500); // <1.5s
      
      // No control panels
      await expect(page.locator('.control-panel')).not.toBeVisible();
      await expect(page.locator('.editor-panel')).not.toBeVisible();
      await expect(page.locator('.monaco-editor')).not.toBeVisible();
    });
    
    test('3D viewer is interactive', async ({ page }) => {
      await page.goto('/u/testuser/testproject?view=basic');
      await expect(page.locator('#app canvas')).toBeVisible();
      
      // Test orbit (drag)
      const canvas = page.locator('#app canvas');
      await canvas.dragTo(canvas, {
        sourcePosition: { x: 200, y: 200 },
        targetPosition: { x: 300, y: 200 },
      });
      
      // Should not error
    });
    
    test('works on /embed route', async ({ page }) => {
      await page.goto('/embed/testproject123');
      
      await expect(page.locator('#app canvas')).toBeVisible();
      await expect(page.locator('.control-panel')).not.toBeVisible();
      await expect(page.locator('.editor-panel')).not.toBeVisible();
    });
  });
  ```

  ### Test Suite 2: Advanced Mode (Control Panels)

  ```typescript
  test.describe('Advanced Mode', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/u/testuser/testproject?view=advanced');
      await expect(page.locator('.control-panel')).toBeVisible();
    });
    
    test('camera controls work', async ({ page }) => {
      // FOV slider
      const fovSlider = page.locator('#fov-slider');
      await fovSlider.fill('90');
      await expect(page.locator('#fov-value')).toHaveText('90°');
      
      // Isometric view button
      await page.click('#isometric-btn');
      // Camera should snap (check via screenshot or canvas state)
    });
    
    test('lighting controls work', async ({ page }) => {
      // Expand lighting section if collapsed
      await page.click('.fp-section-header:has-text("Lighting")');
      
      // Azimuth slider
      const azimuthSlider = page.locator('#light-azimuth');
      await azimuthSlider.fill('180');
      await expect(page.locator('#light-azimuth-value')).toHaveText('180°');
    });
    
    test('floor visibility toggles work', async ({ page }) => {
      // Find floor checkboxes
      const floorCheckbox = page.locator('#floor-list input[type="checkbox"]').first();
      
      // Uncheck
      await floorCheckbox.uncheck();
      // Floor should hide in 3D (verify via screenshot or visibility check)
      
      // Re-check
      await floorCheckbox.check();
    });
    
    test('2D overlay toggle works', async ({ page }) => {
      // Expand 2D overlay section
      await page.click('.fp-section-header:has-text("2D Overlay")');
      
      // Enable overlay
      await page.check('#show-2d-overlay');
      await expect(page.locator('.fp-overlay-2d')).toBeVisible();
      
      // Disable overlay
      await page.uncheck('#show-2d-overlay');
      await expect(page.locator('.fp-overlay-2d')).not.toBeVisible();
    });
    
    test('annotations controls work', async ({ page }) => {
      // Expand annotations section
      await page.click('.fp-section-header:has-text("Annotations")');
      
      // Toggle area labels
      await page.check('#show-area');
      // Areas should show (verify via screenshot)
      
      // Change unit
      await page.selectOption('#area-unit', 'sqm');
      await expect(page.locator('#area-unit')).toHaveValue('sqm');
    });
    
    test('command palette works', async ({ page }) => {
      // Open with keyboard
      await page.keyboard.press('Meta+k');
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Search
      await page.keyboard.type('theme');
      await expect(page.locator('[role="option"]:has-text("Toggle Theme")')).toBeVisible();
      
      // Execute command
      await page.keyboard.press('Enter');
      // Theme should change
    });
    
    test('keyboard help dialog works', async ({ page }) => {
      await page.keyboard.press('h');
      await expect(page.locator('#keyboard-help-overlay')).toBeVisible();
      
      // Close
      await page.keyboard.press('Escape');
      await expect(page.locator('#keyboard-help-overlay')).not.toBeVisible();
    });
    
    test('export menu works', async ({ page }) => {
      // Click export button
      await page.click('#export-btn');
      await expect(page.locator('#export-menu')).toBeVisible();
      
      // Start download interception
      const downloadPromise = page.waitForEvent('download');
      
      // Click JSON export
      await page.click('[data-format="json"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.json$/);
    });
    
    test('no editor features visible', async ({ page }) => {
      await expect(page.locator('.monaco-editor')).not.toBeVisible();
      await expect(page.locator('#selection-enabled')).not.toBeVisible();
      await expect(page.locator('#properties-panel')).not.toBeVisible();
      await expect(page.locator('#add-room-btn')).not.toBeVisible();
    });
  });
  ```

  ### Test Suite 3: Editor Mode

  ```typescript
  test.describe('Editor Mode', () => {
    test.use({ storageState: ownerStorageState });
    
    test.beforeEach(async ({ page }) => {
      await page.goto('/u/owner/myproject');
      await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 10000 });
    });
    
    test('Monaco editor loads with DSL', async ({ page }) => {
      const editorContent = await page.locator('.monaco-editor').textContent();
      expect(editorContent).toContain('floorplan');
    });
    
    test('bidirectional sync: editor → 3D', async ({ page }) => {
      // Click in Monaco on a room line
      await page.click('.monaco-editor .view-line:has-text("Kitchen")');
      
      // Wait for sync
      await page.waitForTimeout(600);
      
      // Kitchen should be selected in 3D (check for selection highlight class)
      // This depends on how selection is visualized
    });
    
    test('bidirectional sync: 3D → editor', async ({ page }) => {
      // Click on a room in 3D
      const canvas = page.locator('#app canvas');
      await canvas.click({ position: { x: 300, y: 300 } }); // Approximate room location
      
      await page.waitForTimeout(600);
      
      // Editor should scroll to that room's definition
      // Verify cursor position or visible line
    });
    
    test('properties panel works', async ({ page }) => {
      // Select a room
      const canvas = page.locator('#app canvas');
      await canvas.click({ position: { x: 300, y: 300 } });
      
      // Properties panel should appear
      await expect(page.locator('#properties-panel')).toBeVisible();
      
      // Edit a property
      await page.fill('#properties-panel input[name="width"]', '8');
      await page.waitForTimeout(600);
      
      // Monaco should update
      const editorContent = await page.locator('.monaco-editor').textContent();
      expect(editorContent).toContain('8');
    });
    
    test('add room works', async ({ page }) => {
      await page.click('#add-room-btn');
      await expect(page.locator('#add-room-dialog')).toBeVisible();
      
      await page.fill('#room-name', 'NewRoom');
      await page.fill('#room-x', '20');
      await page.fill('#room-y', '0');
      await page.fill('#room-width', '5');
      await page.fill('#room-height', '5');
      
      await page.click('#add-room-confirm');
      
      await page.waitForTimeout(600);
      
      // DSL should contain new room
      const editorContent = await page.locator('.monaco-editor').textContent();
      expect(editorContent).toContain('NewRoom');
    });
    
    test('delete room works', async ({ page }) => {
      // Select a room
      const canvas = page.locator('#app canvas');
      await canvas.click({ position: { x: 300, y: 300 } });
      
      // Click delete in properties
      await page.click('#properties-panel button:has-text("Delete")');
      
      // Confirm dialog
      await expect(page.locator('#delete-confirm-dialog')).toBeVisible();
      await page.click('#delete-confirm');
      
      await page.waitForTimeout(600);
      
      // Room should be gone from DSL
    });
    
    test('selection controls work', async ({ page }) => {
      // Enable selection mode
      await page.check('#selection-enabled');
      await expect(page.locator('#selection-status')).toBeVisible();
      
      // Toggle containment mode
      await page.check('#containment-mode');
      
      // Marquee selection (drag rectangle)
      const canvas = page.locator('#app canvas');
      await canvas.dragTo(canvas, {
        sourcePosition: { x: 100, y: 100 },
        targetPosition: { x: 400, y: 400 },
      });
      
      // Multiple items should be selected
    });
    
    test('save persists to backend', async ({ page }) => {
      // Edit DSL
      await page.click('.monaco-editor');
      await page.keyboard.type('# Test comment');
      
      // Save with Ctrl+S
      await page.keyboard.press('Control+s');
      
      // Wait for save
      await expect(page.locator('.toast:has-text("Saved")')).toBeVisible();
      
      // Reload and verify
      await page.reload();
      await expect(page.locator('.monaco-editor')).toBeVisible();
      
      const content = await page.locator('.monaco-editor').textContent();
      expect(content).toContain('# Test comment');
    });
  });
  ```

  ### Test Suite 4: Mode Transitions

  ```typescript
  test.describe('Mode Transitions', () => {
    test('owner auto-gets editor mode', async ({ page }) => {
      // Use owner auth
      await page.goto('/u/owner/myproject');
      await expect(page.locator('.monaco-editor')).toBeVisible();
    });
    
    test('guest auto-gets advanced mode', async ({ page }) => {
      // Use guest auth
      await page.goto('/u/owner/myproject');
      await expect(page.locator('.control-panel')).toBeVisible();
      await expect(page.locator('.monaco-editor')).not.toBeVisible();
    });
    
    test('anonymous gets advanced mode', async ({ page }) => {
      // No auth
      await page.goto('/u/owner/myproject');
      await expect(page.locator('.control-panel')).toBeVisible();
      await expect(page.locator('.monaco-editor')).not.toBeVisible();
    });
    
    test('URL param overrides auth default', async ({ page }) => {
      // Owner with ?view=basic
      await page.goto('/u/owner/myproject?view=basic');
      await expect(page.locator('.control-panel')).not.toBeVisible();
      await expect(page.locator('.monaco-editor')).not.toBeVisible();
    });
    
    test('fork flow works for guest', async ({ page }) => {
      // Guest viewing owner's project
      await page.goto('/u/owner/myproject');
      
      // Fork button visible
      await expect(page.locator('button:has-text("Fork")')).toBeVisible();
      
      // Click fork
      await page.click('button:has-text("Fork")');
      
      // Should navigate to new project
      await expect(page).toHaveURL(/\/u\/guest\//);
      
      // Now in editor mode
      await expect(page.locator('.monaco-editor')).toBeVisible();
    });
  });
  ```

  ### Test Suite 5: Responsive Layouts

  ```typescript
  test.describe('Responsive Layouts', () => {
    test('phone: basic mode', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/u/testuser/testproject?view=basic');
      
      await expect(page.locator('#app canvas')).toBeVisible();
      await expect(page.locator('.control-panel-fab')).not.toBeVisible();
    });
    
    test('phone: advanced mode with FAB', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/u/testuser/testproject?view=advanced');
      
      await expect(page.locator('.control-panel-fab')).toBeVisible();
      
      // Click FAB
      await page.click('.control-panel-fab');
      
      // Bottom sheet opens
      await expect(page.locator('.control-panel.open')).toBeVisible();
    });
    
    test('phone: editor mode has no Monaco', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/u/owner/myproject');
      
      // No Monaco on phone
      await expect(page.locator('.monaco-editor')).not.toBeVisible();
      await expect(page.locator('.editor-panel')).not.toBeVisible();
    });
    
    test('tablet: collapsible sidebar', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/u/testuser/testproject?view=advanced');
      
      // Sidebar visible
      await expect(page.locator('.control-panel')).toBeVisible();
      
      // Collapse button
      await page.click('.control-panel [aria-label="Collapse"]');
      await expect(page.locator('.control-panel.collapsed')).toBeVisible();
    });
    
    test('desktop: full layout', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/u/owner/myproject');
      
      // All panels visible
      await expect(page.locator('.editor-panel')).toBeVisible();
      await expect(page.locator('.control-panel')).toBeVisible();
      await expect(page.locator('.monaco-editor')).toBeVisible();
    });
  });
  ```

  ### Test Configuration

  Update `floorplan-app/playwright.config.ts`:

  ```typescript
  export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
      baseURL: 'http://localhost:3000',
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
    },
    projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
      { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
      { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
    ],
    webServer: {
      command: 'bun run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
  });
  ```

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 3, 4, 5

  **References**:
  - Existing Playwright setup in monorepo
  - All acceptance criteria from Tasks 1-5
  - DaisyUI component selectors

  **Acceptance Criteria**:

  ```bash
  # All tests pass on all browsers
  cd floorplan-app && npx playwright test e2e/progressive-viewer.spec.ts
  # Assert: All tests pass
  
  # Test count expectations
  # Basic Mode: 3 tests
  # Advanced Mode: 9 tests
  # Editor Mode: 8 tests
  # Mode Transitions: 5 tests
  # Responsive: 5 tests
  # Total: ~30 tests
  ```

  ```bash
  # Tests pass on mobile viewports
  cd floorplan-app && npx playwright test --project=mobile-chrome
  # Assert: All mobile-relevant tests pass
  ```

  **Commit**: YES
  - Message: `test(app): add comprehensive Playwright tests for progressive viewer`
  - Files:
    - `floorplan-app/e2e/progressive-viewer.spec.ts`
    - `floorplan-app/e2e/.auth/` (auth state files)
    - `floorplan-app/playwright.config.ts` (updated)

---

- [x] 7. Integration testing and polish

  **What to do**:

  ### Part A: Full Test Suite Verification

  ```bash
  # 1. Unit tests
  cd floorplan-app && bun test
  # Expected: All pass
  
  # 2. Build (SSR check)
  cd floorplan-app && bun run build
  # Expected: No "document/window is not defined" errors
  
  # 3. E2E tests all browsers
  cd floorplan-app && npx playwright test
  # Expected: All pass on Chrome, Firefox, Safari, mobile
  
  # 4. Monorepo integration
  cd .. && bun test
  # Expected: No regressions in other packages
  ```

  ### Part B: Performance Audit

  **Performance Budgets**:
  | Mode | Time to Interactive | Bundle Size |
  |------|---------------------|-------------|
  | Basic | <1.5s | <600KB |
  | Advanced | <2.5s | <1MB |
  | Editor | <4s | <2.5MB |

  **Testing with Lighthouse**:
  ```typescript
  // In Playwright test
  test('performance: basic mode loads fast', async ({ page }) => {
    await page.goto('/u/testuser/testproject?view=basic');
    
    const metrics = await page.evaluate(() => ({
      fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    }));
    
    expect(metrics.fcp).toBeLessThan(1500);
    expect(metrics.lcp).toBeLessThan(2000);
  });
  ```

  **Bundle analysis**:
  ```bash
  cd floorplan-app && bun run build --analyze
  # Check that Monaco chunk is separate and not loaded for basic/advanced
  ```

  ### Part C: Cross-Browser Testing

  | Browser | Desktop | Mobile |
  |---------|---------|--------|
  | Chrome | ✓ Test | ✓ Test |
  | Firefox | ✓ Test | - |
  | Safari | ✓ Test | ✓ Test (iOS) |
  | Edge | ✓ Test | - |

  **Specific checks**:
  - WebGL2 fallback to WebGL1 on older Safari
  - Monaco editor font rendering
  - Touch events on iOS Safari
  - 3D canvas sizing on notched devices

  ### Part D: SSR Verification

  ```bash
  # Build and run production server
  cd floorplan-app && bun run build && bun run start
  
  # Check SSR output
  curl http://localhost:3000/u/testuser/testproject | grep -i "error"
  # Expected: No errors
  
  # Check hydration
  # Open in browser, check console for hydration mismatch warnings
  ```

  **Common SSR issues to check**:
  - `window is not defined` → Use clientOnly()
  - `document is not defined` → Use clientOnly()
  - Monaco import at top level → Use lazy()
  - Three.js import at top level → Use dynamic import

  ### Part E: Visual Regression Check

  **Areas to screenshot and compare**:
  1. Basic mode - 3D only
  2. Advanced mode - with control panels
  3. Editor mode - with Monaco
  4. Mobile - FAB and bottom sheet
  5. Tablet - sidebars
  6. Light theme
  7. Dark theme
  8. Loading states (skeletons)
  9. Error states

  ```bash
  # Generate baseline screenshots
  npx playwright test --update-snapshots
  
  # Compare against baseline
  npx playwright test
  # Check for unexpected visual changes
  ```

  ### Part F: First-Time User Experience

  **Command palette discovery**:
  ```typescript
  // Show tooltip on first visit
  const hasSeenCommandPaletteTip = localStorage.getItem('seen-cmd-palette-tip');
  
  if (!hasSeenCommandPaletteTip && mode() !== 'basic') {
    setTimeout(() => {
      showToast('Tip: Press ⌘K to access all commands', 'info', { duration: 5000 });
      localStorage.setItem('seen-cmd-palette-tip', 'true');
    }, 3000);
  }
  ```

  **Keyboard help discovery**:
  - Add subtle "?" button in corner
  - Tooltip: "Keyboard shortcuts (H)"

  ### Part G: localStorage Draft Saving

  ```typescript
  // Auto-save draft every 30 seconds
  let draftSaveInterval: number;
  
  onMount(() => {
    draftSaveInterval = setInterval(() => {
      if (isDirty()) {
        localStorage.setItem(`draft-${projectId}`, currentDsl());
        console.log('Draft saved to localStorage');
      }
    }, 30000);
  });
  
  onCleanup(() => clearInterval(draftSaveInterval));
  
  // On load, check for unsaved draft
  onMount(() => {
    const draft = localStorage.getItem(`draft-${projectId}`);
    if (draft && draft !== props.dsl) {
      const restore = confirm('Unsaved changes found. Restore draft?');
      if (restore) {
        setCurrentDsl(draft);
      } else {
        localStorage.removeItem(`draft-${projectId}`);
      }
    }
  });
  ```

  ### Part H: Accessibility Audit

  **WCAG 2.1 AA Checklist**:
  - [ ] All interactive elements have focus rings
  - [ ] Color contrast meets 4.5:1 for text
  - [ ] All buttons have accessible names
  - [ ] Keyboard navigation works (Tab, Enter, Escape)
  - [ ] Screen reader announces selection changes (aria-live)
  - [ ] Collapsible sections have aria-expanded
  - [ ] Modal dialogs trap focus

  ```bash
  # Run axe accessibility audit
  npx playwright test --project=accessibility
  ```

  ### Part I: Error Handling Polish

  **Error scenarios to verify**:
  1. Network failure during save → Show retry button
  2. Parse error in DSL → Show error banner + stale overlay
  3. WebGL not supported → Show friendly message
  4. Project not found → 404 page
  5. Unauthorized access → Redirect to login

  ### Part J: Documentation

  - Update README with new viewer modes
  - Add inline code comments for complex logic
  - Document URL parameters (?view=, ?edit=)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`playwright`, `verification-before-completion`]

  **Parallelization**:
  - Final task, runs after all others
  - **Blocked By**: Task 6

  **References**:
  - All previous task files
  - Lighthouse performance documentation
  - WCAG 2.1 guidelines

  **Acceptance Criteria**:

  ```bash
  # Full test suite passes
  cd floorplan-app && bun test
  # Assert: All unit tests pass

  cd floorplan-app && bun run build
  # Assert: Build succeeds, no SSR errors

  cd floorplan-app && npx playwright test
  # Assert: All E2E tests pass on all browsers
  
  cd .. && bun test
  # Assert: No regressions in monorepo
  ```

  ```
  # Performance meets budget
  Basic mode: <1.5s TTI
  Advanced mode: <2.5s TTI
  Editor mode: <4s TTI
  ```

  ```
  # Accessibility audit passes
  npx playwright test --project=accessibility
  # Assert: No critical violations
  ```

  ```
  # Manual verification
  1. Open app in Chrome, Firefox, Safari
  2. Test all three modes
  3. Test on real mobile device
  4. Verify first-time tips show
  5. Verify draft saving works (edit, close, reopen)
  6. Verify no console errors
  ```

  **Commit**: YES
  - Message: `chore(app): polish progressive viewer with performance, a11y, and UX improvements`
  - Files:
    - Performance optimizations
    - First-time user tips
    - localStorage draft saving
    - Accessibility improvements
    - Any bug fixes from testing

---

## Commit Strategy

| Task | Message | Verification |
|------|---------|--------------|
| 0 | `refactor(viewer-core): unify theme system` | Theme toggle works |
| 1 | `feat(app): add FloorplanContainer with mode management` | Basic mode <1s |
| 2 | `feat(app): add ControlPanels with lazy loading` | Advanced mode works |
| 3 | `feat(app): add EditorBundle with Monaco and selection` | Editor mode works |
| 4 | `feat(app): add mode detection and routing` | Auth-based modes work |
| 5 | `feat(app): add responsive layouts for all modes` | Mobile layouts work |
| 6 | `test(app): add Playwright tests for progressive viewer` | All tests pass |
| 7 | `chore(app): polish progressive viewer integration` | Full suite passes |

---

## Success Criteria

### Performance Targets
- Basic mode: <1s to interactive
- Advanced mode: <2s to all panels visible
- Editor mode: <3s to Monaco ready

### Final Checklist

**Basic Mode**:
- [x] 3D viewer loads quickly
- [x] Pan/zoom/orbit works
- [x] Theme toggle works
- [x] No control panels visible
- [x] Works on /embed route

**Advanced Mode**:
- [x] Camera controls work (FOV, isometric)
- [x] Lighting controls work
- [x] Floor visibility toggles work
- [x] 2D overlay minimap works
- [x] Annotations work
- [x] Export menu works (JSON, GLB)
- [~] Command palette works (⌘K)
- [x] No editor features visible

**Editor Mode**:
- [x] Monaco DSL editor loads
- [x] Bidirectional sync works (cursor ↔ 3D)
- [x] Selection controls work
- [x] Properties panel works
- [x] Add room works
- [x] Delete room works
- [x] Save persists to Convex
- [~] Fork workflow works for guests

**Routing**:
- [x] Owner auto-gets editor mode
- [x] Guest auto-gets advanced mode
- [x] Anonymous auto-gets advanced mode
- [x] ?mode=basic forces basic
- [x] ?mode=editor forces editor

**Responsive**:
- [x] Phone layouts work per tier
- [x] Tablet layouts work per tier
- [x] Desktop layouts match standalone apps

**Quality**:
- [x] No SSR errors
- [ ] All Playwright tests pass
- [x] Theme switching smooth
- [x] Loading states present
