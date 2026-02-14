## Why

During the refactoring of `floorplan-app/src/` to eliminate ~30 `any` usages and consolidate types into `project-types.ts`, five structural type-safety issues were discovered at the boundary between `floorplan-viewer-core` and `floorplan-app`. These were papered over with `as unknown as` casts to unblock the refactoring, but the casts mask real design problems: they prevent TypeScript from catching real bugs, they confuse future contributors who encounter the casts, and they make the bridge layer between the dynamically-imported viewer-core and the SolidStart app fragile.

## What Changes

- **Add public getters to FloorplanAppCore** for properties that bridge components need (`currentTheme`, selection state, annotation/layout manager state) — replaces protected member access via casts
- **Export a `ViewerPublicApi` interface** from `floorplan-viewer-core` that bridge components can import and use instead of concrete classes or ad-hoc `InternalCoreInstance` types
- **Align `SelectionManager` public API** between viewer-core exports and `EditorBundle` expectations — `getSelection()` returns `SelectionEntity[]` (array) consistently instead of `ReadonlySet<SelectableObject>`
- **Migrate fully to Convex generated types** — replace the manual `convexApi` object in `project-types.ts` with imports from `convex/_generated/api`, eliminating all `as unknown as FunctionReference` casts
- **Add return type annotations to Convex functions** so query results flow through with proper types, removing `as unknown as PublicProject[]` casts in route components
- **Add a build step** ensuring `npx convex codegen` runs before the SolidStart build

## Capabilities

- **New**: `viewer-public-api` — Public interface for floorplan-viewer-core consumers (bridge components)
- **New**: `convex-type-safety` — Proper Convex type generation and usage across floorplan-app
- **Modified**: `3d-viewer` — Adding public getters, aligning SelectionManager API for external consumers

## Impact

- **floorplan-viewer-core** — Public API surface changes: new exported interface, new public getters on `FloorplanAppCore`, `SelectionManager.getSelection()` return type changes from `ReadonlySet` to array (**BREAKING** for any external consumers of this method)
- **floorplan-app bridge components** — `FloorplanBase.tsx` and `FloorplanContainer.tsx` rewritten to use `ViewerPublicApi` instead of `InternalCoreInstance` workaround
- **floorplan-app Convex consumers** — All routes/hooks using `convexApi` or manual casts switch to generated `api` imports
- **floorplan-app build pipeline** — Convex codegen added as a pre-build step
