## 1. Update FloorplanEmbed Component

- [ ] 1.1 Import `createFloorplanUI` and `FloorplanUIAPI` from `floorplan-viewer-core/ui/solid`
- [ ] 1.2 Add `mode` prop to FloorplanEmbedProps (`'viewer' | 'editor'`)
- [ ] 1.3 Add `showControls` prop (default: true) to optionally hide control panel
- [ ] 1.4 Create a container element for FloorplanUI alongside the viewer container
- [ ] 1.5 Call `createFloorplanUI(appCore, { container, mode })` after FloorplanAppCore init
- [ ] 1.6 Store the FloorplanUIAPI reference for cleanup
- [ ] 1.7 Call `uiApi.dispose()` in onCleanup to prevent memory leaks
- [ ] 1.8 Sync theme changes between app and viewer UI

## 2. Update FloorplanEditor Component

- [ ] 2.1 Pass `mode="editor"` to FloorplanEmbed when editable is true
- [ ] 2.2 Pass `mode="viewer"` to FloorplanEmbed when editable is false
- [ ] 2.3 Verify save toolbar still works with new UI overlay
- [ ] 2.4 Consider moving save buttons into FloorplanUI's header (future enhancement)

## 3. Update Route Components

- [ ] 3.1 Update `/u/[username]/[project]/index.tsx` to pass any new required props
- [ ] 3.2 Update `/u/[username]/[project]/v/[version].tsx` similarly
- [ ] 3.3 Update `/u/[username]/[project]/s/[hash].tsx` to use viewer mode (read-only)

## 4. Import CSS and Styles

- [ ] 4.1 Ensure Tailwind CSS from viewer-core is included in app build
- [ ] 4.2 Import `tailwind-styles.css` from viewer-core if needed
- [ ] 4.3 Test that control panel styling matches app theme

## 5. Testing and Verification

- [ ] 5.1 Test camera controls work (perspective/orthographic/isometric)
- [ ] 5.2 Test lighting controls work (azimuth, elevation, intensity)
- [ ] 5.3 Test floor visibility toggles work
- [ ] 5.4 Test annotation controls work (area labels, dimensions)
- [ ] 5.5 Test 2D overlay mini-map works
- [ ] 5.6 Test command palette opens with ⌘K
- [ ] 5.7 Test keyboard shortcuts (H for help)
- [ ] 5.8 Test theme toggle syncs with app theme
- [ ] 5.9 Test save functionality still works in editor mode
- [ ] 5.10 Test read-only snapshot view doesn't show editor controls
