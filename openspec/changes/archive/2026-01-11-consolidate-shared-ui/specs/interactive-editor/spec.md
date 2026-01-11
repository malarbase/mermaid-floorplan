## MODIFIED Requirements

### Requirement: Module Architecture

The interactive editor SHALL be implemented as a separate module (`interactive-editor`) that extends the read-only viewer, sharing common code via a `viewer-core` package. All shared UI styles SHALL use the `fp-*` class prefix convention and be defined in `viewer-core`.

#### Scenario: Viewer remains independently usable

- **GIVEN** a user wants to embed a read-only floorplan visualization
- **WHEN** they import only the `viewer` package
- **THEN** they SHALL get a fully functional 3D viewer
- **AND** the bundle SHALL NOT include editor-specific code (selection, sync, properties, LSP)
- **AND** the bundle size SHALL remain under 1MB (excluding Three.js)

#### Scenario: Interactive editor extends viewer

- **GIVEN** a user wants full editing capabilities
- **WHEN** they import the `interactive-editor` package
- **THEN** they SHALL get all viewer functionality plus editing features
- **AND** the `InteractiveEditor` class SHALL extend the `Viewer` class
- **AND** shared code SHALL come from `viewer-core` (not duplicated)

#### Scenario: Viewer-core provides shared abstractions

- **GIVEN** both `viewer` and `interactive-editor` need common functionality
- **WHEN** the packages are built
- **THEN** shared interfaces and utilities SHALL be in `viewer-core`
- **AND** `viewer-core` SHALL include: scene context, mesh registry, selection API, floor renderer
- **AND** both packages SHALL depend on `viewer-core`

#### Scenario: Selection API available in viewer-core

- **GIVEN** a user wants basic selection in the read-only viewer
- **WHEN** they use the `viewer-core` selection API
- **THEN** they SHALL be able to highlight meshes programmatically
- **AND** they SHALL receive selection events (for analytics, linking, etc.)
- **BUT** advanced features (marquee, properties panel) SHALL require `interactive-editor`

#### Scenario: Shared UI styles use fp-* prefix

- **GIVEN** both `viewer` and `interactive-editor` need shared UI components
- **WHEN** the developer creates or modifies UI elements
- **THEN** all class names SHALL use the `fp-*` prefix (e.g., `fp-floor-item`, `fp-floor-summary-panel`)
- **AND** styles SHALL be defined in `viewer-core/src/ui/styles.ts`
- **AND** the `interactive-editor` SHALL NOT duplicate styles inline in `index.html`
- **AND** theme-aware styles SHALL be applied consistently via `body.dark-theme` selectors

## ADDED Requirements

### Requirement: Consolidated UI Component Library

The `viewer-core` package SHALL provide a unified library of UI components that both `viewer` and `interactive-editor` can use without style duplication.

#### Scenario: Floor list component uses shared styles

- **GIVEN** the interactive-editor displays a list of floors
- **WHEN** the floor list is rendered
- **THEN** each floor item SHALL use the `fp-floor-item` class
- **AND** the class SHALL be styled in `viewer-core/src/ui/styles.ts`
- **AND** theme switching SHALL update floor item label colors automatically

#### Scenario: Panel positioning uses CSS custom properties

- **GIVEN** both apps have panels that need to adjust position when editor expands
- **WHEN** the editor panel state changes
- **THEN** panels SHALL use CSS custom properties (`--layout-editor-width`, `--layout-header-offset`)
- **AND** the `LayoutManager` class SHALL update these properties
- **AND** both apps SHALL respond to the same CSS variable changes
