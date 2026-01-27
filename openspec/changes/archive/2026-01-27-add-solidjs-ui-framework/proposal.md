# Add Solid.js UI Framework for Modern Component Architecture

## Why

The current UI implementation uses vanilla TypeScript with factory pattern components, which works well for simple use cases but struggles with complexity. As the project grows to support more advanced features (Tauri desktop app, IFC/BIM integration, command palette, branching history UI, LSP status indicators), the manual DOM manipulation approach will become increasingly difficult to maintain.

Challenges with the current approach:
- Manual DOM updates (`element.textContent = value`) are error-prone and verbose
- State synchronization across components requires explicit callbacks
- No reactive data binding (changes don't automatically propagate to UI)
- Testing requires JSDOM and manual event simulation
- Complex UI patterns (search filtering, keyboard navigation) require significant boilerplate

The project needs a modern UI framework that:
1. Preserves perfect Three.js integration (no virtual DOM interference)
2. Provides minimal bundle size increase (critical for Tauri desktop downloads)
3. Offers excellent TypeScript support (project is TypeScript-first)
4. Enables reactive state management without manual updates
5. Simplifies complex UI components (command palette, file dropdown, properties panel)

**Solid.js** is the ideal choice because:
- Fine-grained reactivity (no virtual DOM to interfere with Three.js)
- Tiny bundle size (7.5 KB vs 45 KB for React)
- TypeScript-first design with excellent type inference
- Components run once (prevents Three.js scene re-initialization)
- Direct DOM access via refs (perfect for canvas mounting)
- Recommended by Tauri for desktop applications

## What Changes

### Phase 1: Hybrid Integration (This Change)
- Add Solid.js dependencies to viewer-core, viewer, and interactive-editor packages
- Configure Vite and TypeScript for Solid JSX support
- Create `viewer-core/src/ui/solid/` directory for Solid components
- Migrate **Command Palette** to Solid as proof-of-concept
- Document hybrid pattern (vanilla Three.js + Solid UI) in CLAUDE.md
- Keep all existing vanilla components unchanged

### Phase 2: Complex UI Migration (Future)
- Migrate Header Bar, File Dropdown to Solid
- Migrate Control Panel sections (Camera, Light, Floor controls)
- Migrate Properties Panel (interactive-editor only)
- Use Solid Stor for complex state management

### Phase 3: Full Adoption (Optional, Future)
- Gradually migrate remaining vanilla components
- **Keep Three.js rendering in vanilla** (not in Solid components)
- Use Solid for all new UI components

## Impact

### Affected Specs
- `interactive-editor` - Command Palette, Properties Panel will use Solid reactivity
- `3d-viewer` - Control panels, overlays will optionally use Solid

### Affected Code
- `viewer-core/` - New `src/ui/solid/` directory, shared Solid components
- `viewer/` - Vite config update for Solid plugin
- `interactive-editor/` - Vite config update for Solid plugin
- `package.json` - New dependencies (~10 KB total bundle increase)
- `tsconfig.json` - JSX configuration for Solid

### Dependencies Added
```json
{
  "dependencies": {
    "solid-js": "^1.9.0"
  },
  "devDependencies": {
    "babel-preset-solid": "^1.9.0",
    "vite-plugin-solid": "^2.10.0"
  }
}
```

### Breaking Changes
**None.** This change is purely additive:
- All existing vanilla components continue working
- No API changes to exported functions
- Three.js integration remains identical
- Solid is opt-in for new components only

## Non-Goals (This Phase)
- Migrating all vanilla components (gradual approach over months)
- Changing Three.js rendering approach (stays vanilla)
- Rewriting existing working components without justification
- Adding UI component libraries (Material-UI, Radix) - build custom components first

## Success Criteria
1. Command Palette reimplemented in Solid with identical functionality
2. Bundle size increase < 15 KB (Solid.js is 7.5 KB + Vite plugin overhead)
3. No regression in Three.js performance or rendering
4. Hybrid pattern documented and tested
5. Developer feedback on DX improvement vs vanilla approach

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Team learning curve | Medium | Gradual migration, pair programming, Solid tutorial |
| Three.js integration bugs | High | Keep Three.js in vanilla, only UI in Solid |
| Bundle size increase | Low | Solid is 7.5 KB, tree-shakeable |
| Ecosystem limitations | Medium | Build custom components (simpler with Solid) |
| Migration fatigue | Medium | Hybrid approach for 6-12 months, no rush |

## References
- [Solid.js Documentation](https://www.solidjs.com/)
- [Solid + Three.js Example](https://github.com/solidjs/solid-three)
- [Solid vs React Comparison](https://www.solidjs.com/guides/comparison#react)
- [Tauri + Solid.js Guide](https://tauri.app/start/frontend/solidjs/)
- Research document (above) with framework comparison matrix
