# Tasks: Deploy 3D Viewer with 2D Overlay and Floor Controls

## Task 1: Update CI/CD for Viewer Deployment

**Status:** completed

Update the GitHub Actions workflow to build and deploy the viewer package.

### Changes:
1. Update `.github/workflows/ci-cd.yml`:
   - Change build command to build viewer: `npm run build --workspace floorplans-viewer`
   - Update artifact path from `./build` to `./viewer/dist`

2. Update `viewer/vite.config.ts`:
   - Set `base: '/mermaid-floorplan/'` for correct asset paths on GitHub Pages

### Acceptance Criteria:
- [x] CI workflow builds viewer package
- [x] Deployed site loads at `https://<user>.github.io/mermaid-floorplan/`
- [x] All assets (JS, CSS) load correctly with base path

---

## Task 2: Add 2D Overlay Container and Controls

**Status:** completed

Add the HTML structure and CSS for the 2D overlay mini-map.

### Changes:
1. Update `viewer/index.html`:
   - Add "2D Overlay" control section with toggle and opacity slider
   - Add overlay container div positioned bottom-left

2. Add CSS styles for:
   - Overlay container (position, size, background, border-radius)
   - Overlay visibility states
   - Theme-aware styling (light/dark)

### Acceptance Criteria:
- [x] Overlay container is positioned bottom-left
- [x] Toggle checkbox shows/hides container
- [x] Opacity slider adjusts container opacity
- [x] Styling matches existing control panel aesthetic

---

## Task 3: Implement 2D Overlay Rendering

**Status:** completed

Implement the SVG rendering logic for the 2D overlay.

### Changes:
1. Update `viewer/src/main.ts`:
   - Import `render` from `floorplans-language` (or use existing parse result)
   - Add overlay state tracking (visible, opacity)
   - Create method to render SVG into overlay container
   - Call render when floorplan is loaded
   - Wire up UI controls to state

2. Handle edge cases:
   - No floorplan loaded (hide or show empty state)
   - Parse errors (show error indicator)
   - Theme changes (re-render with correct theme)

### Acceptance Criteria:
- [x] 2D SVG renders in overlay when floorplan is loaded
- [x] Overlay updates when new floorplan is loaded
- [x] Toggle and opacity controls work correctly
- [x] Overlay respects current theme

---

## Task 4: Add Floor Visibility Controls

**Status:** completed

Add UI and logic for toggling individual floor visibility.

### Changes:
1. Update `viewer/index.html`:
   - Add "Floors" control section (initially empty, populated dynamically)

2. Update `viewer/src/main.ts`:
   - Add floor visibility state tracking (Map<string, boolean>)
   - Create method to populate floor checkboxes when floorplan loads
   - Implement toggle logic (set `THREE.Group.visible`)
   - Add "Show All" / "Hide All" button handlers
   - Update floor summary panel to only count visible floors

### Acceptance Criteria:
- [x] Floor checkboxes appear when floorplan is loaded
- [x] All floors are checked (visible) by default
- [x] Toggling checkbox shows/hides floor in 3D view
- [x] "Show All" / "Hide All" buttons work
- [x] Floor summary updates to reflect visible floors
- [x] Works correctly with exploded view

---

## Task 5: Integration Testing

**Status:** completed

Verify all features work together correctly.

### Test Cases:
1. Load single-floor floorplan - floor controls show 1 floor
2. Load multi-floor floorplan - floor controls show all floors
3. Toggle 2D overlay while changing exploded view
4. Toggle floor visibility while 2D overlay is visible
5. Switch themes with overlay visible
6. Export GLB with some floors hidden (should export all)

### Acceptance Criteria:
- [x] All test cases pass
- [x] No console errors
- [x] Performance is acceptable

---

## Task 6: Integrate Editor and Chat into Viewer

**Status:** completed

Migrate the Monaco editor and chat into the 3D viewer as a collapsible side panel.

### Changes:
1. Move files to viewer:
   - `src/editor.ts` → `viewer/src/editor.ts`
   - `src/openai-chat.ts` → `viewer/src/openai-chat.ts`

2. Delete obsolete files:
   - `src/app.ts` (entry point replaced by viewer)
   - `src/renderer.ts` (no longer needed)
   - `src/floorplans.mdc` (cursor rules)
   - `index.html` (root entry point)

3. Update `viewer/index.html`:
   - Add collapsible editor panel (left side)
   - Add toggle button to show/hide panel
   - Add Monaco editor container
   - Add chat container
   - Merge relevant styles from `src/styles.css`

4. Update `viewer/src/main.ts`:
   - Import editor and chat modules
   - Initialize Monaco editor in panel
   - Wire editor changes to reload floorplan
   - Initialize chat with current floorplan context

5. Update `viewer/package.json`:
   - Add Monaco devDependencies

6. Update root `package.json`:
   - Update `"dev"` script to run viewer
   - Update `"build"` script to only build viewer

7. Delete or redirect root `vite.config.ts`

### Acceptance Criteria:
- [x] Editor panel toggles open/closed
- [x] Monaco editor loads and edits floorplan DSL
- [x] Editing DSL updates 3D view in real-time
- [x] Chat integration works for AI-assisted editing
- [x] Legacy files removed
- [x] Root scripts updated

