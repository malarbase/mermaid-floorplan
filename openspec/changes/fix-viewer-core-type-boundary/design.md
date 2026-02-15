## Context

During the refactoring of `floorplan-app/src/` to eliminate `any` types and consolidate shared types into `project-types.ts`, five structural issues were discovered at the boundary between the dynamically-imported `floorplan-viewer-core` package and the SolidStart app.

Current state:
- `FloorplanBase.tsx` uses `as unknown as InternalCoreInstance` to access `currentTheme` (a protected property on `BaseViewer`) — see `floorplan-app/src/components/viewer/FloorplanBase.tsx:14-28`
- `FloorplanContainer.tsx` uses `as unknown as FloorplanAppCore` when receiving `CoreInstance` from `FloorplanBase`, and `as unknown as Record<string, unknown>` to bridge `EditorBundle`'s `EditorBundleCoreApi` interface — see `FloorplanContainer.tsx:185,262`
- `project-types.ts` defines a `convexApi` object with 30+ `as unknown as FunctionReference` casts — see `project-types.ts:130-183`
- Route components cast Convex query results with `as unknown as PublicProject[]` and similar

## Goals

1. Eliminate all `as unknown as` casts in the viewer-core bridge components (`FloorplanBase.tsx`, `FloorplanContainer.tsx`)
2. Make `CoreInstance` a real exported interface from `floorplan-viewer-core` that bridge components can use without reaching for concrete class internals
3. Achieve full Convex type inference from query definition → `useQuery` consumer with zero manual casts
4. Ensure the SolidStart build pipeline generates Convex types automatically

## Non-Goals

- Changing the internal architecture of `FloorplanAppCore` or `BaseViewer`
- Rewriting the selection system internals (Set-based storage stays; only public API changes)
- Changing the Convex database schema
- Removing the dynamic import pattern for viewer-core (that's intentional for code splitting)

## Decisions

### 1. ViewerPublicApi interface in floorplan-viewer-core

**Decision**: Add a `ViewerPublicApi` interface to `floorplan-viewer-core/src/types.ts` (or similar) and export it from `index.ts`. `FloorplanAppCore` implements this interface.

**What it includes**:
- `getTheme(): string` — replaces protected `currentTheme` access
- `getSelectionState(): SelectionEntity[]` — typed selection as array
- `getAnnotationState(): AnnotationState` — read-only view of annotation toggles
- `getLayoutManager(): LayoutManagerApi` — subset of layout manager for overlay/summary control
- `getOverlayContainer(): HTMLElement | undefined` — for direct DOM queries in bridge layer
- Existing public methods: `dispose()`, `loadFromDsl()`, `setTheme()`, `captureScreenshot()`, `on()`

**Why**: Bridge components need access to concrete class features but shouldn't depend on internal implementation. A dedicated public interface gives them a stable contract without exposing Three.js internals. The `CoreInstance` type in `project-types.ts` becomes a re-export of `ViewerPublicApi` or a strict subset.

**Alternatives considered**:
- Making `currentTheme` public directly: Too leaky — it's a raw property that could be set by consumers, bypassing `setTheme()`'s side effects
- Exporting the concrete `FloorplanAppCore` type for bridge components: Couples the app to viewer-core's implementation details

### 2. SelectionManager.getSelection() returns array

**Decision**: Change `SelectionManager.getSelection()` to return `SelectionEntity[]` instead of `ReadonlySet<SelectableObject>`. The internal Set representation stays; the public method converts on access.

**Why**: `EditorBundle`'s `EditorBundleCoreApi` expects `getSelection()` to return `SelectableEntity[]`. The current `ReadonlySet<SelectableObject>` forces a structural mismatch that requires `as unknown as Record<string, unknown>` to bridge. Since the only consumer of the Set API is internal, and arrays are the natural choice for UI rendering (map/filter), this aligns the API with actual usage patterns.

**Risks**: This is a breaking change for any external code calling `getSelection()` directly. Mitigated by the fact that the only consumers are in this monorepo.

### 3. Convex generated types as single source of truth

**Decision**: Add `npx convex codegen` to the build pipeline (as a `prebuild` script in `package.json`). Replace all `convexApi` references with direct imports from `convex/_generated/api`. Remove the `convexApi` object from `project-types.ts` entirely after migration.

**Why**: The manual `convexApi` object exists solely because Convex types weren't reliably available at build time. With an explicit codegen step, generated types are always present. The generated `api` object provides full type inference for arguments and return types, which eliminates the need for manual casts on query results.

**Migration approach**:
1. Add `"prebuild": "npx convex codegen"` to `floorplan-app/package.json`
2. Add return type annotations to Convex functions (e.g., `query({ handler: async (...) => { ... } satisfies ProjectResult })`)
3. Replace `convexApi.projects.getBySlug` with `api.projects.getBySlug` in each consumer file
4. Remove `convexApi` and `projectApi` from `project-types.ts`
5. Remove manual result casts (`as unknown as PublicProject[]`)

**Risks**: Convex codegen must run successfully in CI before the SolidStart build. If codegen fails (e.g., schema validation error), the build fails. This is actually a feature — it catches schema problems early.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `SelectionManager.getSelection()` return type is breaking | All consumers are in-repo; update simultaneously. Add `getSelectionSet()` if Set access needed internally |
| Convex codegen adds build step latency | Codegen is fast (<5s); only runs at build time, not on every file change. `npx convex dev` already handles this during development |
| `ViewerPublicApi` may not cover all future bridge needs | Design the interface to be extensible; add methods as needed rather than exposing raw internals |
| Dynamic import typing — `import('floorplan-viewer-core')` returns module type, not interface | Use `typeof import` pattern or cast the constructed instance to `ViewerPublicApi` at the single construction site in `FloorplanBase` |

## Resolved Questions

- **`ViewerPublicApi` camera access**: Use top-level getters (`getCameraState()` / `setCameraState()`) rather than exposing the `cameraManager` sub-object. Keeps the public API surface flat and simple.
- **`convexApi` removal**: Remove immediately rather than deprecating. It's internal to this monorepo with no external consumers, so a transition period adds no value.
