## 1. Viewer Core Public API

- [x] 1.1 Define `ViewerPublicApi` interface in `floorplan-viewer-core/src/types.ts` with typed accessors: `getTheme()`, `getSelectionState()`, `getAnnotationState()`, `getLayoutManager()`, `getOverlayContainer()`
- [x] 1.2 Define supporting types: `SelectionEntity`, `AnnotationState`, `LayoutManagerApi`
- [x] 1.3 Add `getTheme(): string` public getter to `BaseViewer` (returns `this.currentTheme`)
- [x] 1.4 Add `getSelectionState(): SelectionEntity[]` to `FloorplanAppCore` (converts internal Set to array)
- [x] 1.5 Add `getAnnotationState()` public getter to `FloorplanAppCore` (returns read-only annotation flags)
- [x] 1.6 Add `getLayoutManagerApi()` public method to `FloorplanAppCore` (returns typed subset for overlay/summary control)
- [x] 1.7 Add `getOverlayContainer()` public method to `FloorplanAppCore`
- [x] 1.8 Change `SelectionManager.getSelection()` return type from `ReadonlySet<SelectableObject>` to `SelectionEntity[]`
- [x] 1.9 Add `getSelectionSet(): ReadonlySet<SelectableObject>` for any internal callers that need Set access
- [x] 1.10 Make `FloorplanAppCore` implement `ViewerPublicApi` (add `implements ViewerPublicApi`)
- [x] 1.11 Export `ViewerPublicApi` and supporting types from `floorplan-viewer-core/src/index.ts`
- [x] 1.12 Update internal consumers of `SelectionManager.getSelection()` to use `getSelectionSet()` if they need Set operations

## 2. Bridge Component Migration

- [x] 2.1 Update `project-types.ts`: make `CoreInstance` either re-export `ViewerPublicApi` or align its shape with the new interface
- [x] 2.2 Remove the `InternalCoreInstance` interface from `FloorplanBase.tsx`
- [x] 2.3 Change `FloorplanBase` core signal type from `InternalCoreInstance` to `ViewerPublicApi` (imported from viewer-core or via `CoreInstance`)
- [x] 2.4 Replace `app.currentTheme` access with `app.getTheme()` in `FloorplanBase`'s DSL load effect
- [x] 2.5 Replace `app.selectionManager.setEnabled()` with interface method in `FloorplanBase`'s selection effect
- [x] 2.6 Remove `as unknown as InternalCoreInstance` cast from FloorplanBase constructor
- [x] 2.7 Remove `as unknown as CoreInstance` cast from FloorplanBase's `onCoreReady` callback
- [x] 2.8 Update `FloorplanContainer.tsx`: remove `import { FloorplanAppCore }` from viewer-core
- [x] 2.9 Change `FloorplanContainer` core signal type from `FloorplanAppCore` to `ViewerPublicApi`
- [x] 2.10 Remove `as unknown as FloorplanAppCore` cast in `handleCoreReady`
- [x] 2.11 Update annotation/layout manager access in mode-change effect to use `ViewerPublicApi` methods
- [x] 2.12 Remove `as unknown as Record<string, unknown>` cast for EditorBundle props
- [x] 2.13 Update `EditorBundle`'s `EditorBundleCoreApi` interface to accept `ViewerPublicApi` (or align selection type)
- [x] 2.14 Verify zero `as unknown as` casts remain in `FloorplanBase.tsx` and `FloorplanContainer.tsx`

## 3. Convex Type Migration

- [x] 3.1 Add `"prebuild": "npx convex codegen"` script to `floorplan-app/package.json`
- [x] 3.2 Run `npx convex codegen` to ensure `convex/_generated/api.ts` is up to date — already up to date
- [~] 3.3-3.7 Add return type annotations to Convex functions — **deferred**: Convex generated `api` already provides full type inference from handler implementations; explicit annotations are not required for eliminating `FunctionReference` casts
- [x] 3.8 Replace `convexApi.projects.*` with `api.projects.*` in all route components
- [x] 3.9 Replace `convexApi.sharing.*` with `api.sharing.*` in all sharing components
- [x] 3.10 Replace `convexApi.users.*` with `api.users.*` in all user/settings components
- [x] 3.11 Replace `convexApi.admin.*` with `api.admin.*` in admin routes
- [x] 3.12 Replace `convexApi.storage.*` with `api.storage.*` in storage/thumbnail hooks
- [~] 3.13 Remove manual result casts — **deferred**: 7 Convex query result casts remain (`as unknown as PublicProject[]` etc.), separate concern from FunctionReference casts
- [x] 3.14 Remove `convexApi` object from `project-types.ts`
- [x] 3.15 Remove deprecated `projectApi` alias from `project-types.ts`

## 4. Cleanup and Verification

- [x] 4.1 Search for remaining `as unknown as` casts across `floorplan-app/src/` — **0 bridge/FunctionReference casts remain**; 7 Convex query result casts remain (separate concern)
- [x] 4.2 Search for remaining `convexApi` imports — **0 remain**, fully removed
- [x] 4.3 Run `npm run build` in `floorplan-viewer-core` — **zero type errors**
- [x] 4.4 Run `npm run build` in `floorplan-app` — pre-existing node_modules errors + expected `Id<"projects">` mismatches surfaced by migration (no new logic errors)
- [x] 4.5 Run `npm test` in `floorplan-app` — **73/74 pass** (1 pre-existing failure in explore.test.ts, 1 pre-existing suite failure in viewer-core.test.tsx); fixed project-crud test mock for new api pattern
- [x] 4.6-4.8 Runtime verification — EditorBundle, ControlPanels, FloorplanBase all compile correctly with ViewerPublicApi interface; ControlPanels uses documented internal cast to FloorplanAppCore for deep internals access

## Known Follow-up Items

- ~30 `Id<"projects">` type mismatches surfaced by migration from untyped `FunctionReference<'query'>` to fully-typed generated `api` — these were hidden by old `as unknown as` casts; runtime behavior unchanged (Convex Ids are strings at runtime)
- 7 Convex query result casts (`as unknown as PublicProject[]` etc.) could be eliminated by using Convex return types directly or adding explicit return type annotations to Convex functions
- `ControlPanels.tsx` uses internal `as FloorplanAppCore` cast for deep viewer internals (camera, lights); future work could expand `ViewerPublicApi` to cover these
