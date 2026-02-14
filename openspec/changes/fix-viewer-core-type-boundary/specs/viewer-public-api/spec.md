## ADDED Requirements

### Requirement: Viewer Public API Interface

The `floorplan-viewer-core` package SHALL export a `ViewerPublicApi` interface that provides typed access to viewer state for external consumers (bridge components, embedders) without exposing internal Three.js objects or protected class members.

#### Scenario: Interface exported from package
- **WHEN** a consumer imports from `floorplan-viewer-core`
- **THEN** the `ViewerPublicApi` type SHALL be available as a named export
- **AND** the interface SHALL include methods for theme, selection, annotation, layout, and lifecycle management

#### Scenario: Theme access via getter
- **GIVEN** a `ViewerPublicApi` instance wrapping a `FloorplanAppCore`
- **WHEN** the consumer calls `getTheme()`
- **THEN** it SHALL return the current theme as a string (`'light'` | `'dark'` | `'blueprint'`)
- **AND** no protected member access SHALL be required

#### Scenario: Selection state access via getter
- **GIVEN** a `ViewerPublicApi` instance with active selection
- **WHEN** the consumer calls `getSelectionState()`
- **THEN** it SHALL return a `SelectionEntity[]` array
- **AND** each entity SHALL include `type` and `id` properties

#### Scenario: Annotation state access
- **GIVEN** a `ViewerPublicApi` instance
- **WHEN** the consumer reads annotation state
- **THEN** it SHALL return a read-only object with boolean flags for `showArea`, `showDimensions`, and `showFloorSummary`

#### Scenario: Overlay container access
- **GIVEN** a `ViewerPublicApi` instance
- **WHEN** the consumer calls `getOverlayContainer()`
- **THEN** it SHALL return the `HTMLElement` used for 2D overlays, or `undefined` if not initialized

### Requirement: FloorplanAppCore Implements ViewerPublicApi

`FloorplanAppCore` SHALL implement the `ViewerPublicApi` interface, satisfying all typed accessors without requiring consumers to cast to the concrete class.

#### Scenario: No cast required for bridge components
- **GIVEN** `FloorplanBase.tsx` dynamically imports `floorplan-viewer-core` and creates a `FloorplanAppCore`
- **WHEN** it assigns the instance to a variable typed as `ViewerPublicApi`
- **THEN** the assignment SHALL succeed without `as unknown as` casts
- **AND** all bridge component operations (theme detection, selection toggling, annotation reset) SHALL work through the interface

#### Scenario: InteractiveEditorCore also satisfies ViewerPublicApi
- **GIVEN** `FloorplanBase` can create either `FloorplanAppCore` or `InteractiveEditorCore`
- **WHEN** `InteractiveEditorCore` is created
- **THEN** it SHALL also satisfy `ViewerPublicApi` (since it extends `FloorplanAppCore`)

### Requirement: Bridge Components Use ViewerPublicApi

`FloorplanBase.tsx` and `FloorplanContainer.tsx` SHALL import and use `ViewerPublicApi` instead of concrete classes, ad-hoc `InternalCoreInstance` types, or index-signature workarounds.

#### Scenario: FloorplanBase removes InternalCoreInstance
- **GIVEN** the current `FloorplanBase.tsx` defines a local `InternalCoreInstance` interface
- **WHEN** the migration is complete
- **THEN** `InternalCoreInstance` SHALL be removed
- **AND** the component SHALL use `ViewerPublicApi` for its core instance signal type
- **AND** zero `as unknown as` casts SHALL remain in the file

#### Scenario: FloorplanContainer removes concrete class import
- **GIVEN** the current `FloorplanContainer.tsx` imports `FloorplanAppCore` directly
- **WHEN** the migration is complete
- **THEN** it SHALL use `ViewerPublicApi` (or re-exported `CoreInstance`) for the core instance signal
- **AND** the `as unknown as FloorplanAppCore` cast in `handleCoreReady` SHALL be removed
- **AND** the `as unknown as Record<string, unknown>` cast for EditorBundle SHALL be removed

### Requirement: SelectionManager Public API Returns Arrays

`SelectionManager.getSelection()` SHALL return `SelectionEntity[]` (an array) instead of `ReadonlySet<SelectableObject>`, aligning the public API with consumer expectations.

#### Scenario: getSelection returns array
- **GIVEN** a `SelectionManager` with two selected objects
- **WHEN** `getSelection()` is called
- **THEN** it SHALL return a `SelectionEntity[]` with length 2
- **AND** each element SHALL have `type` (e.g., `'room'`, `'floor'`) and `id` (string) properties

#### Scenario: EditorBundle receives compatible type
- **GIVEN** `EditorBundle` expects its core API's `getSelection()` to return `SelectableEntity[]`
- **WHEN** it receives a `ViewerPublicApi`-conforming object
- **THEN** the selection type SHALL be structurally compatible without casts

#### Scenario: Internal Set preserved
- **GIVEN** `SelectionManager` uses a `Set<SelectableObject>` internally for O(1) add/remove/has
- **WHEN** `getSelection()` is called
- **THEN** it SHALL convert the internal Set to an array on access
- **AND** the internal Set SHALL remain unchanged
