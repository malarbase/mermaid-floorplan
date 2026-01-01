## ADDED Requirements

### Requirement: Scene Theme Toggle

The viewer SHALL provide controls to toggle between light and dark visual themes for the 3D scene.

#### Scenario: Toggle to dark theme
- **WHEN** the user clicks the theme toggle button (showing sun icon)
- **THEN** the scene background SHALL change to a dark color (e.g., `0x1a1a2e`)
- **AND** the toggle icon SHALL change to a moon icon
- **AND** grid lines and ambient lighting SHALL adjust for dark mode visibility

#### Scenario: Toggle to light theme
- **WHEN** the user clicks the theme toggle button (showing moon icon)
- **THEN** the scene background SHALL change to a light color (e.g., `0xf5f5f7`)
- **AND** the toggle icon SHALL change to a sun icon
- **AND** grid lines and ambient lighting SHALL adjust for light mode

#### Scenario: Theme persists during session
- **GIVEN** the user has toggled to dark theme
- **WHEN** the user interacts with other controls (camera, exploded view, etc.)
- **THEN** the dark theme SHALL remain applied

### Requirement: DSL Theme Synchronization

The viewer SHALL respect theme settings defined in the DSL configuration when loading a floorplan.

#### Scenario: DSL darkMode applies to viewer
- **GIVEN** a floorplan with `config { darkMode: true }`
- **WHEN** the floorplan is loaded in the 3D viewer
- **THEN** the viewer SHALL initialize with dark theme
- **AND** the theme toggle SHALL show the moon icon (indicating dark mode active)

#### Scenario: DSL theme: dark applies to viewer
- **GIVEN** a floorplan with `config { theme: dark }`
- **WHEN** the floorplan is loaded in the 3D viewer
- **THEN** the viewer SHALL initialize with dark theme

#### Scenario: DSL theme: blueprint applies to viewer
- **GIVEN** a floorplan with `config { theme: blueprint }`
- **WHEN** the floorplan is loaded in the 3D viewer
- **THEN** the viewer SHALL initialize with a blue-tinted dark theme
- **AND** scene background SHALL use blueprint-style colors

#### Scenario: No DSL theme defaults to light
- **GIVEN** a floorplan with no `theme` or `darkMode` config
- **WHEN** the floorplan is loaded in the 3D viewer
- **THEN** the viewer SHALL initialize with light theme (default)

### Requirement: Theme Override Control

The viewer SHALL allow users to temporarily override the DSL-defined theme without modifying the source file.

#### Scenario: Override DSL light theme to dark
- **GIVEN** a floorplan with default (light) theme
- **WHEN** the user toggles to dark theme in the viewer
- **THEN** the viewer SHALL display in dark theme
- **AND** the DSL source SHALL NOT be modified
- **AND** a visual indicator MAY show that theme is overridden

#### Scenario: Reset to DSL theme
- **GIVEN** the user has overridden the theme
- **WHEN** the floorplan is reloaded
- **THEN** the viewer SHALL reset to the DSL-defined theme

### Requirement: Dark Theme Color Constants

The viewer SHALL define color constants for dark theme rendering.

#### Scenario: Dark theme colors defined
- **GIVEN** the dark theme is active
- **THEN** the following colors SHALL be used:
  | Element | Dark Theme Color |
  |---------|-----------------|
  | Scene background | Dark blue-gray (`0x1a1a2e`) |
  | Grid lines | Light gray (`0x444444`) |
  | Ambient light | Reduced intensity (`0x404040`) |
  | Text labels | Light (`0xe0e0e0`) |

#### Scenario: Light theme colors (default)
- **GIVEN** the light theme is active
- **THEN** the following colors SHALL be used:
  | Element | Light Theme Color |
  |---------|------------------|
  | Scene background | Off-white (`0xf5f5f7`) |
  | Grid lines | Light gray (`0xcccccc`) |
  | Ambient light | Standard intensity (`0xffffff`) |
  | Text labels | Dark (`0x333333`) |

## MODIFIED Requirements

### Requirement: Expanded Controls Panel

The viewer SHALL organize all controls in an expandable/collapsible panel, including theme controls.

#### Scenario: Collapsible control sections
- **WHEN** viewing the controls panel
- **THEN** controls SHALL be organized into collapsible sections:
  - Theme (light/dark toggle)
  - Camera (mode, FOV, presets)
  - Lighting (azimuth, elevation, intensity)
  - View (exploded view)
  - Annotations (area, dimensions, floor summary)
  - Validation (warnings display toggle)
  - Export (GLTF, GLB buttons)

#### Scenario: Theme section contents
- **WHEN** expanding the Theme section
- **THEN** it SHALL contain:
  - Light/Dark toggle button with sun/moon icon
  - (Optional) Theme preset dropdown if multiple themes available

#### Scenario: Panel remembers state
- **WHEN** the user collapses a section
- **THEN** the collapsed state MAY persist during the session

