# Deploy 3D Viewer to GitHub Pages with 2D Overlay and Floor Controls

## Summary

Deploy the 3D viewer package to GitHub Pages instead of the root 2D editor UI, add a mini-map style 2D overlay that can be toggled, add floor visibility controls to toggle which floors are rendered in 3D, and deprecate the legacy 2D viewer in `src/`.

## Motivation

The current GitHub Pages deployment shows the 2D Monaco editor + SVG preview. Users want the more feature-rich 3D viewer to be the primary deployed application, with the ability to:
1. See a 2D floor plan overlay for reference while navigating the 3D view
2. Toggle individual floors on/off to focus on specific levels

## Design

### 1. CI/CD Changes for Viewer Deployment

Update `.github/workflows/ci-cd.yml` to:
- Build the viewer package instead of the root UI
- Deploy `viewer/dist` instead of `build/`
- Set correct base path for GitHub Pages

Update `viewer/vite.config.ts`:
- Set `base: '/mermaid-floorplan/'` for GitHub Pages deployment

### 2. 2D Overlay (Mini-map Style)

Add a 2D SVG overlay in the bottom-left corner of the viewer:

**UI Controls:**
- New "2D Overlay" section in the control panel
- Toggle checkbox to show/hide the overlay
- Opacity slider (0-100%)

**Implementation:**
- Import `render` function from `floorplans-language`
- Create an overlay container positioned bottom-left
- Render SVG when floorplan is loaded
- Style with semi-transparent background, fixed size (~250x200px)
- Re-render when floorplan changes

**Visual Design:**
- Small corner overlay (mini-map style)
- Semi-transparent background (white/dark based on theme)
- Border-radius and subtle shadow
- Non-interactive (just for reference)

### 3. Floor Visibility Controls

Add dynamic floor toggles in the control panel:

**UI Controls:**
- New "Floors" section in the control panel
- Dynamically populated checkboxes for each floor
- All floors visible by default
- "Show All" / "Hide All" quick actions

**Implementation:**
- Track visibility state per floor in `Viewer` class
- Toggle `THREE.Group.visible` property for floor groups
- Update floor summary panel to reflect visible floors only
- Regenerate when new floorplan is loaded

## Files Changed

| File | Change |
|------|--------|
| `.github/workflows/ci-cd.yml` | Update build and deploy steps for viewer |
| `viewer/vite.config.ts` | Set base path for GitHub Pages |
| `viewer/index.html` | Add 2D overlay container, floor controls section |
| `viewer/src/main.ts` | Add overlay rendering, floor visibility logic |
| `viewer/package.json` | Add dependency if needed |
| `package.json` | Update scripts to point to viewer |
| `vite.config.ts` | Remove or redirect to viewer |

### Files Removed (Legacy 2D Viewer Deprecation)

| File | Reason |
|------|--------|
| `src/app.ts` | Legacy 2D editor entry - replaced by viewer integration |
| `src/renderer.ts` | 2D renderer wrapper - no longer needed |
| `src/floorplans.mdc` | Cursor rules - no longer needed |
| `index.html` | Legacy entry point - replaced by viewer |
| `build/` | Legacy build output - replaced by viewer/dist |

### Files Migrated (Integrated into Viewer)

| File | Migration |
|------|-----------|
| `src/editor.ts` | Moved to `viewer/src/editor.ts` - Monaco editor in collapsible panel |
| `src/openai-chat.ts` | Moved to `viewer/src/openai-chat.ts` - Chat in collapsible panel |
| `src/styles.css` | Relevant styles merged into `viewer/index.html` |

### 4. Collapsible Editor Panel

Add a collapsible side panel to the viewer containing:
- Monaco editor for editing floorplan DSL
- OpenAI chat integration for AI-assisted editing
- Toggle button to show/hide the panel
- Live preview: edits in editor update the 3D view

## Dependencies

- `floorplans-language` package (already a dependency) for 2D SVG rendering

## Testing

1. **CI/CD**: Verify deployment builds and deploys correctly
2. **2D Overlay**: Load floorplan, toggle overlay, adjust opacity
3. **Floor Controls**: Load multi-floor floorplan, toggle individual floors
4. **Integration**: Verify exploded view works with floor visibility
5. **Theme**: Verify overlay adapts to light/dark theme

## Risks

- **Performance**: 2D SVG re-rendering on floorplan changes should be debounced
- **Bundle size**: Using floorplans-language in viewer should not significantly increase bundle

## Alternatives Considered

1. **Split view (side-by-side)**: Rejected - takes too much screen space
2. **Fullscreen overlay**: Rejected - obstructs 3D view
3. **Separate deployment**: Keep both UIs deployed - adds complexity

