## ADDED Requirements

### Requirement: Solid.js UI Framework Integration

The interactive editor SHALL support Solid.js for building reactive UI components alongside vanilla TypeScript components.

#### Scenario: Solid.js components coexist with vanilla

- **GIVEN** the viewer-core package includes both vanilla and Solid components
- **WHEN** FloorplanApp is instantiated
- **THEN** both vanilla components (Three.js, base-viewer) and Solid components (command palette) SHALL work together
- **AND** Solid components SHALL render into vanilla-created DOM containers
- **AND** state changes in Solid components SHALL trigger vanilla component updates via callbacks

#### Scenario: Solid JSX compiles correctly

- **GIVEN** a `.tsx` file with Solid JSX syntax
- **WHEN** the file is imported and built
- **THEN** Vite SHALL compile JSX using babel-preset-solid
- **AND** TypeScript SHALL recognize `jsxImportSource: "solid-js"`
- **AND** the built output SHALL contain optimized reactive code

#### Scenario: Bundle size remains reasonable

- **GIVEN** Solid.js is added as a dependency
- **WHEN** the viewer-core package is built
- **THEN** the total bundle size increase SHALL be less than 15 KB
- **AND** tree-shaking SHALL remove unused Solid features

### Requirement: Reactive Command Palette

The command palette SHALL be implemented using Solid.js for reactive search filtering and keyboard navigation.

#### Scenario: Search filtering with reactivity

- **GIVEN** the command palette is open
- **WHEN** the user types a search query
- **THEN** the command list SHALL automatically filter without manual DOM updates
- **AND** filtering SHALL use Solid's `createSignal()` and `For` component
- **AND** filtered results SHALL update in real-time

#### Scenario: Keyboard navigation with state

- **GIVEN** the command palette displays filtered commands
- **WHEN** the user presses Arrow Up/Down keys
- **THEN** the selected index SHALL update using Solid signals
- **AND** the selected command SHALL be visually highlighted
- **AND** pressing Enter SHALL execute the selected command

#### Scenario: Command palette integrates with vanilla app

- **GIVEN** FloorplanApp is a vanilla TypeScript class
- **WHEN** the command palette (Solid component) is initialized
- **THEN** it SHALL render into a DOM container created by FloorplanApp
- **AND** command execution SHALL call FloorplanApp methods via callbacks
- **AND** auth state SHALL be passed as reactive props

### Requirement: Type-Safe Component Props

Solid components SHALL use TypeScript interfaces for type-safe props and callbacks.

#### Scenario: Command palette props typed

- **GIVEN** the CommandPalette Solid component
- **WHEN** it is instantiated with props
- **THEN** props SHALL be typed with a `CommandPaletteProps` interface
- **AND** TypeScript SHALL validate prop types at compile time
- **AND** callbacks SHALL have correct function signatures

#### Scenario: Invalid props cause build errors

- **GIVEN** a Solid component with typed props
- **WHEN** incorrect prop types are passed
- **THEN** TypeScript SHALL emit a compilation error
- **AND** the error message SHALL indicate the expected type

### Requirement: Solid Components Testing

Solid components SHALL be testable using Vitest with Solid Testing Library.

#### Scenario: Component renders correctly

- **GIVEN** a Solid component test
- **WHEN** the component is rendered with test props
- **THEN** the component SHALL produce the expected DOM structure
- **AND** reactive updates SHALL be testable

#### Scenario: User interactions trigger updates

- **GIVEN** a Solid component with user interaction (click, type)
- **WHEN** a test simulates the interaction
- **THEN** the component state SHALL update
- **AND** the DOM SHALL reflect the new state
- **AND** callbacks SHALL be invoked with correct arguments

### Requirement: Hybrid Component Pattern Documentation

The project SHALL document the pattern for integrating Solid components with vanilla TypeScript code.

#### Scenario: Integration pattern documented

- **GIVEN** the CLAUDE.md file
- **WHEN** it is reviewed by developers
- **THEN** it SHALL include:
  - How to render Solid components into vanilla DOM containers
  - How to pass callbacks from vanilla to Solid
  - How to update Solid component props from vanilla state changes
  - Example code showing the integration pattern

#### Scenario: Three.js isolation pattern documented

- **GIVEN** the CLAUDE.md file
- **WHEN** developers read the Solid.js section
- **THEN** it SHALL explicitly state:
  - Three.js rendering SHALL remain in vanilla TypeScript
  - Canvas mounting SHALL use vanilla DOM manipulation
  - Solid SHALL only be used for UI controls, not 3D scene management

### Requirement: Gradual Migration Strategy

The project SHALL support a gradual migration path from vanilla to Solid components without breaking existing functionality.

#### Scenario: Vanilla components remain functional

- **GIVEN** Solid.js is added to the project
- **WHEN** existing vanilla components are used
- **THEN** they SHALL continue working without modification
- **AND** no Solid code SHALL be required for vanilla-only features

#### Scenario: Component migration prioritized by complexity

- **GIVEN** the project roadmap
- **WHEN** deciding which components to migrate to Solid
- **THEN** complex UI components (command palette, properties panel) SHALL be prioritized
- **AND** simple components (sliders, toggles) SHALL be allowed to remain vanilla
- **AND** Three.js rendering SHALL never migrate to Solid
