## 1. Setup and Configuration

- [ ] 1.1 Add Solid.js dependencies to viewer-core package.json
- [ ] 1.2 Add Solid.js dependencies to viewer package.json
- [ ] 1.3 Add Solid.js dependencies to interactive-editor package.json
- [ ] 1.4 Update viewer-core tsconfig.json for Solid JSX (`"jsx": "preserve"`, `"jsxImportSource": "solid-js"`)
- [ ] 1.5 Update viewer tsconfig.json for Solid JSX
- [ ] 1.6 Update interactive-editor tsconfig.json for Solid JSX
- [ ] 1.7 Add vite-plugin-solid to viewer vite.config.ts
- [ ] 1.8 Add vite-plugin-solid to interactive-editor vite.config.ts
- [ ] 1.9 Create viewer-core/src/ui/solid/ directory

## 2. Command Palette Migration (Proof-of-Concept)

- [ ] 2.1 Read existing command-palette.ts to understand functionality
- [ ] 2.2 Create viewer-core/src/ui/solid/CommandPalette.tsx with Solid.js
- [ ] 2.3 Implement search filtering using createSignal()
- [ ] 2.4 Implement keyboard navigation (Arrow keys, Enter, Escape)
- [ ] 2.5 Implement command categories and grouping
- [ ] 2.6 Add auth-aware command filtering (lock icon for protected commands)
- [ ] 2.7 Create TypeScript interface CommandPaletteProps
- [ ] 2.8 Add CSS for command palette (integrate with shared-styles.css)

## 3. Hybrid Integration Pattern

- [ ] 3.1 Create helper function in viewer-core to render Solid components into vanilla containers
- [ ] 3.2 Update FloorplanApp to use Solid CommandPalette instead of vanilla
- [ ] 3.3 Pass callbacks from FloorplanApp to CommandPalette props
- [ ] 3.4 Update auth state reactively when authentication status changes
- [ ] 3.5 Test command execution triggers vanilla methods correctly
- [ ] 3.6 Verify ⌘K / Ctrl+K shortcut still works

## 4. Testing

- [ ] 4.1 Add @solidjs/testing-library to devDependencies
- [ ] 4.2 Create viewer-core/src/ui/solid/CommandPalette.test.tsx
- [ ] 4.3 Test search filtering updates UI
- [ ] 4.4 Test keyboard navigation selects correct command
- [ ] 4.5 Test Enter key executes selected command
- [ ] 4.6 Test auth-required commands show lock icon
- [ ] 4.7 Test command palette closes on Escape
- [ ] 4.8 Run tests: npm run test in viewer-core

## 5. Documentation

- [ ] 5.1 Update CLAUDE.md with Solid.js integration section
- [ ] 5.2 Document hybrid pattern (vanilla + Solid coexistence)
- [ ] 5.3 Document Three.js isolation rule (never use Solid for 3D rendering)
- [ ] 5.4 Add code example: rendering Solid component into vanilla container
- [ ] 5.5 Add code example: passing callbacks from vanilla to Solid
- [ ] 5.6 Document when to use Solid vs vanilla (complexity guideline)

## 6. Bundle Size Validation

- [ ] 6.1 Build viewer package and measure bundle size
- [ ] 6.2 Build interactive-editor package and measure bundle size
- [ ] 6.3 Verify total increase < 15 KB compared to baseline
- [ ] 6.4 Run bundle analyzer to confirm tree-shaking works
- [ ] 6.5 Document bundle size metrics in proposal

## 7. Performance Testing

- [ ] 7.1 Load complex floorplan in viewer with Solid command palette
- [ ] 7.2 Verify 3D rendering maintains 60 FPS during camera movement
- [ ] 7.3 Test command palette search filtering performance (< 50 ms)
- [ ] 7.4 Test command palette keyboard navigation latency (< 16 ms)
- [ ] 7.5 Profile with Chrome DevTools to ensure no Solid-related jank

## 8. Cleanup and Finalization

- [ ] 8.1 Remove old vanilla command-palette.ts (or mark deprecated)
- [ ] 8.2 Update exports in viewer-core/src/ui/index.ts
- [ ] 8.3 Update any imports in viewer and interactive-editor
- [ ] 8.4 Run full test suite: npm run test at root
- [ ] 8.5 Run full build: npm run build:all at root
- [ ] 8.6 Update CHANGELOG.md with Solid.js integration notes

## 9. Optional Enhancements (Post-MVP)

- [ ] 9.1 Migrate File Dropdown to Solid.js
- [ ] 9.2 Migrate Header Bar to Solid.js
- [ ] 9.3 Create Solid-based theme toggle component
- [ ] 9.4 Migrate Properties Panel to Solid.js (interactive-editor only)
- [ ] 9.5 Create Solid control panel sections (Camera, Light, Annotations)
