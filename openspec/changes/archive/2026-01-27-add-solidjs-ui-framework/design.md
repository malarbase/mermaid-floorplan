# Design: Solid.js Integration for Modern UI Components

## Context

The mermaid-floorplan project currently uses vanilla TypeScript with factory pattern components for all UI. As the project adds more complex features (Tauri desktop app, IFC/BIM integration, command palette, branching history, LSP integration), manual DOM manipulation is becoming a maintenance burden.

### Key Constraints
1. **Three.js Performance**: 3D rendering must remain at 60 FPS without framework overhead
2. **Bundle Size**: Critical for Tauri desktop downloads (target: < 15 KB increase)
3. **TypeScript-First**: Project uses strict TypeScript mode throughout
4. **Gradual Migration**: Cannot rewrite entire UI at once, need hybrid approach
5. **Backward Compatibility**: Existing viewer integrations must continue working

### Stakeholders
- **Users**: Need responsive UI with smooth 3D rendering
- **Developers**: Need maintainable code for complex UI features
- **Embedders**: Need stable API for viewer integration

## Goals / Non-Goals

### Goals
- Add Solid.js as an option for complex UI components (command palette, properties panel)
- Maintain vanilla Three.js rendering without any framework interference
- Establish hybrid pattern for vanilla + Solid coexistence
- Reduce boilerplate for reactive UI components (search filtering, keyboard nav)
- Enable gradual migration over 6-12 months

### Non-Goals
- Rewriting all vanilla components immediately (gradual approach)
- Using Solid for Three.js scene management (strict isolation)
- Adding UI component libraries (Material-UI, etc.) in this phase
- Changing existing public APIs or breaking integrations
- Forcing Solid knowledge on embedders

## Decisions

### Decision 1: Solid.js over React/Preact/Svelte

**Rationale:**
- **Solid.js** chosen for:
  - Fine-grained reactivity (no virtual DOM to interfere with Three.js)
  - Tiny bundle size (7.5 KB vs 45 KB for React)
  - Components run once (prevents Three.js scene re-initialization)
  - Direct DOM access via refs (perfect for canvas mounting)
  - TypeScript-first design with excellent type inference
  - Recommended by Tauri for desktop apps

**Alternatives Considered:**
1. **Preact** (3 KB): Virtual DOM still adds overhead, React mental model with hooks complexity
2. **Svelte 5** (15 KB): Compiler magic can be too implicit for imperative Three.js code
3. **Stay Vanilla**: Would work but complex UI becomes unmaintainable (command palette, properties panel)

**Why Solid Won:**
- Best balance of performance, size, and DX
- Fine-grained reactivity is perfect for Three.js integration
- No virtual DOM reconciliation overhead
- Components execute once, making Three.js lifecycle predictable

### Decision 2: Hybrid Approach (Vanilla + Solid Coexist)

**Pattern:**
```typescript
// FloorplanApp.ts (vanilla)
class FloorplanApp {
  private initCommandPalette() {
    const container = document.getElementById('cmd-palette-root')!;

    // Render Solid component into vanilla container
    render(() => (
      <CommandPalette
        onExecute={(cmd) => this.handleCommand(cmd)}
        isAuthenticated={this.isAuthenticated}
      />
    ), container);
  }
}
```

**Rationale:**
- Allows gradual migration without big-bang rewrite
- Three.js code stays in vanilla (no risk of framework interference)
- Complex UI (command palette, properties) gets reactivity benefits
- Simple UI (sliders, toggles) can stay vanilla if preferred

**Alternatives Considered:**
1. **All Solid**: Too risky, would require rewriting everything including Three.js integration
2. **All Vanilla**: Unmaintainable for complex UI features in roadmap
3. **Web Components**: Poor TypeScript support, no reactivity, browser inconsistencies

### Decision 3: Strict Three.js Isolation

**Rule:** Solid SHALL NEVER directly manipulate Three.js objects.

**Pattern:**
```typescript
// ❌ WRONG: Solid component manipulating Three.js
function CameraControl() {
  const camera = useContext(CameraContext); // BAD!
  return <button onClick={() => camera.position.set(0, 10, 10)}>Reset</button>;
}

// ✅ CORRECT: Solid calls vanilla callback
function CameraControl(props: { onReset: () => void }) {
  return <button onClick={props.onReset}>Reset</button>;
}

// FloorplanApp.ts (vanilla)
onReset={() => {
  this.camera.position.set(0, 10, 10);
  this.controls.update();
}}
```

**Rationale:**
- Three.js scene management is inherently imperative (not reactive)
- Solid's reactivity could cause unintended re-renders or scene rebuilds
- Keeps 3D rendering performance predictable and measurable
- Maintains clear separation of concerns

### Decision 4: Component Migration Priority

**High Priority (Migrate First):**
1. Command Palette - search filtering, keyboard navigation
2. File Dropdown - recent files, submenu state
3. Header Bar - auth state, filename updates
4. Properties Panel (editor) - complex form with validation

**Low Priority (Stay Vanilla):**
1. Three.js canvas mounting and rendering
2. Simple sliders (exploded view, FOV)
3. Simple toggles (theme, annotations)
4. Theme injection (injectStyles)

**Rationale:**
- Migrate where reactivity provides clear DX benefit
- Avoid migration for simple components (diminishing returns)
- Never migrate Three.js rendering (performance/isolation)

### Decision 5: TypeScript Configuration

**Config:**
```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "solid-js"
  }
}
```

**Vite Config:**
```typescript
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  // ... existing config
});
```

**Rationale:**
- `jsx: "preserve"` lets Vite handle JSX transformation
- `jsxImportSource` tells TS to use Solid's JSX types (not React)
- `vite-plugin-solid` handles compilation and HMR

## Risks / Trade-offs

### Risk 1: Learning Curve

**Impact:** Medium
**Likelihood:** High

**Mitigation:**
- Gradual migration over 6-12 months (no pressure)
- Pair programming for first Solid components
- Document hybrid pattern clearly in CLAUDE.md
- Solid tutorial recommended for team members
- Command Palette migration as proof-of-concept

### Risk 2: Three.js Integration Bugs

**Impact:** High (could break 3D rendering)
**Likelihood:** Low (if isolation rule followed)

**Mitigation:**
- **Strict rule:** Solid SHALL NOT manipulate Three.js objects directly
- All Three.js updates via vanilla callbacks only
- Performance testing with FPS monitoring
- Explicit documentation of isolation pattern
- Code reviews enforce isolation

### Risk 3: Bundle Size Increase

**Impact:** Low
**Likelihood:** Low

**Mitigation:**
- Solid.js is only 7.5 KB (minimal impact)
- Tree-shaking removes unused Solid features
- Measure bundle size before/after in CI
- Target: < 15 KB total increase (Solid + Vite plugin overhead)
- Critical for Tauri desktop downloads

### Risk 4: Ecosystem Limitations

**Impact:** Medium
**Likelihood:** Medium

**Mitigation:**
- Solid ecosystem is smaller than React
- Plan to build custom components (simpler with Solid's reactivity)
- Avoid dependency on large UI libraries (Material-UI, etc.)
- Leverage Solid's primitives (signals, stores) directly

### Risk 5: Migration Fatigue

**Impact:** Medium
**Likelihood:** Medium

**Mitigation:**
- Hybrid approach allows indefinite coexistence
- No pressure to migrate everything
- Migrate only when adding new features or fixing bugs
- Document "when to use Solid vs vanilla" guideline
- Stop migration if DX benefit unclear

## Migration Plan

### Phase 1: Setup + Proof-of-Concept (This Change)

**Timeline:** 1-2 weeks

1. Add Solid.js dependencies
2. Configure Vite and TypeScript
3. Migrate Command Palette to Solid
4. Document hybrid pattern
5. Measure bundle size impact
6. Performance testing

**Success Criteria:**
- Command Palette works identically in Solid
- Bundle size increase < 15 KB
- 60 FPS maintained in 3D rendering
- Developer feedback positive

### Phase 2: Complex UI Migration (After Tauri/IFC Work)

**Timeline:** 2-3 months (gradual)

1. File Dropdown
2. Header Bar
3. Properties Panel (interactive-editor)
4. Control Panel sections (optional)

**Success Criteria:**
- Each component simpler in Solid than vanilla
- No regressions in functionality or performance
- Team comfortable with Solid patterns

### Phase 3: Optional Full Adoption (6-12 Months)

**Timeline:** As needed

1. Migrate remaining vanilla UI components
2. **Never migrate Three.js rendering**
3. Evaluate if full migration worthwhile

**Success Criteria:**
- Codebase easier to maintain
- New features faster to implement
- Performance still excellent

### Rollback Plan

If Solid.js proves problematic:
1. Remove Solid components (keep vanilla versions)
2. Uninstall Solid.js dependencies
3. Revert Vite and TypeScript configs
4. Loss: ~2 weeks of migration work
5. Lesson: Stay vanilla or try different framework

## Open Questions

### Q1: Should we use Solid UI component libraries?

**Options:**
1. Build custom components (recommended for now)
2. Use Hope UI or Solid UI libraries later

**Decision:** Start with custom components. Reevaluate after Phase 2 if we need a library.

### Q2: How to handle server-side rendering (SSR) later?

**Options:**
1. Solid supports SSR via solid-start
2. Unlikely needed for desktop app (Tauri)
3. May be relevant for web deployment

**Decision:** Defer until SSR requirement confirmed. Solid supports it if needed.

### Q3: Should viewer-core export both vanilla and Solid components?

**Answer:** Yes. Export both:
- Vanilla components for backward compatibility
- Solid components for modern usage
- Tree-shaking removes unused code

### Q4: How to test Solid components?

**Answer:** Use @solidjs/testing-library with Vitest:
```typescript
import { render } from '@solidjs/testing-library';

test('command palette filters commands', () => {
  const { getByPlaceholderText, getAllByRole } = render(() =>
    <CommandPalette commands={mockCommands} onExecute={vi.fn()} />
  );

  const input = getByPlaceholderText('Search commands...');
  fireEvent.input(input, { target: { value: 'camera' } });

  expect(getAllByRole('listitem')).toHaveLength(3);
});
```

## References

- [Solid.js Documentation](https://www.solidjs.com/)
- [Solid Tutorial (Interactive)](https://www.solidjs.com/tutorial)
- [Solid + Three.js Example](https://github.com/solidjs/solid-three)
- [Solid vs React Comparison](https://www.solidjs.com/guides/comparison#react)
- [Tauri + Solid Guide](https://tauri.app/start/frontend/solidjs/)
- [JS Framework Benchmark](https://krausest.github.io/js-framework-benchmark/2024/table_chrome_131.html)
