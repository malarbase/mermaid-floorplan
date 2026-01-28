## ADDED Requirements

### Requirement: DaisyUI-Based Theming

The viewer SHALL use DaisyUI's `data-theme` attribute for theming instead of CSS class selectors.

#### Scenario: Theme applied via data-theme attribute

- **GIVEN** the viewer is initialized with theme "dark"
- **WHEN** the UI renders
- **THEN** the root container SHALL have `data-theme="dark"` attribute
- **AND** all DaisyUI components SHALL automatically use dark theme colors
- **AND** no `body.dark-theme` CSS selectors SHALL be required

#### Scenario: Theme toggle updates data-theme

- **WHEN** the user toggles the theme via UI or keyboard shortcut
- **THEN** the `data-theme` attribute SHALL change from "light" to "dark" or vice versa
- **AND** all UI components SHALL update colors without page reload
- **AND** the 3D scene background SHALL update to match the theme

#### Scenario: DaisyUI theme colors match existing design

- **GIVEN** the viewer uses DaisyUI theming
- **WHEN** the light theme is active
- **THEN** `base-100` (background) SHALL be `#ffffff`
- **AND** `primary` (accent) SHALL be `#4a90d9`
- **AND** `base-content` (text) SHALL be `#333333`

### Requirement: Unified UI Factory

The viewer SHALL use a unified `createFloorplanUI()` factory with mode configuration to support both viewer and editor modes.

#### Scenario: Viewer mode initialization

- **GIVEN** a developer wants to create a read-only viewer
- **WHEN** they call `createFloorplanUI(core, { mode: 'viewer' })`
- **THEN** it SHALL return a Solid.js UI root
- **AND** the UI SHALL NOT include properties editing panel
- **AND** the UI SHALL NOT include Add Room button
- **AND** the UI SHALL include HeaderBar, FileDropdown, and CommandPalette

#### Scenario: Editor mode initialization

- **GIVEN** a developer wants to create a full editor
- **WHEN** they call `createFloorplanUI(core, { mode: 'editor', onPropertyChange: fn })`
- **THEN** it SHALL return a Solid.js UI root
- **AND** the UI SHALL include PropertiesPanel for editing
- **AND** the UI SHALL include Add Room button
- **AND** the UI SHALL include DeleteConfirmDialog

#### Scenario: Feature flag overrides

- **GIVEN** a developer wants viewer mode with export menu disabled
- **WHEN** they call `createFloorplanUI(core, { mode: 'viewer', showExportMenu: false })`
- **THEN** the export menu SHALL NOT be rendered
- **AND** other viewer features SHALL remain enabled

### Requirement: DaisyUI Component Usage

The viewer UI components SHALL use DaisyUI semantic classes for consistent styling.

#### Scenario: Control panel uses DaisyUI card and collapse

- **WHEN** the control panel is rendered
- **THEN** it SHALL use `card` class for the container
- **AND** collapsible sections SHALL use `collapse` component
- **AND** buttons SHALL use `btn` classes

#### Scenario: Modals use DaisyUI modal component

- **WHEN** command palette or dialogs are rendered
- **THEN** they SHALL use DaisyUI `modal` and `modal-box` classes
- **AND** actions SHALL use `modal-action` container
- **AND** backdrop SHALL use `modal-backdrop` for click-to-close

#### Scenario: Form controls use DaisyUI classes

- **WHEN** form inputs are rendered (sliders, checkboxes, selects)
- **THEN** sliders SHALL use `range` class
- **AND** checkboxes SHALL use `checkbox` or `toggle` class
- **AND** selects SHALL use `select select-bordered` classes

## REMOVED Requirements

### Requirement: shared-styles.css Dependency

**Reason**: Replaced by DaisyUI component classes and Tailwind utilities.

**Migration**: 
- All `.fp-*` class usages must be replaced with DaisyUI equivalents
- `injectStyles()` must inject Tailwind CSS instead of shared-styles.css
- Custom theme CSS variables are preserved for layout positioning only
