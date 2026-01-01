## ADDED Requirements

### Requirement: Theme Selection Configuration

The DSL SHALL support a `theme` property in the config block for selecting rendering theme presets.

#### Scenario: Theme specified in config
- **WHEN** `config { theme: dark }` is defined
- **THEN** the renderer SHALL use the "dark" theme colors and styles
- **AND** all SVG elements SHALL use dark theme CSS classes

#### Scenario: Blueprint theme selection
- **WHEN** `config { theme: blueprint }` is defined
- **THEN** the renderer SHALL use blue background with light blue lines
- **AND** text elements SHALL use light colors for contrast

#### Scenario: Default theme when not specified
- **GIVEN** no `theme` property is set in config
- **WHEN** the floorplan is rendered
- **THEN** the "default" theme SHALL be applied (beige floor, black walls)

#### Scenario: Unknown theme warning
- **WHEN** `config { theme: nonexistent }` is defined
- **AND** no theme named "nonexistent" is registered
- **THEN** the system SHALL emit a validation warning about unknown theme
- **AND** rendering SHALL proceed with the default theme

### Requirement: Dark Mode Toggle

The DSL SHALL support a `darkMode` boolean property matching Mermaid.js configuration schema for quick theme switching.

#### Scenario: Dark mode enabled
- **WHEN** `config { darkMode: true }` is defined
- **THEN** the renderer SHALL use the "dark" theme preset
- **AND** this SHALL be equivalent to `config { theme: dark }`

#### Scenario: Dark mode disabled explicitly
- **WHEN** `config { darkMode: false }` is defined
- **THEN** the renderer SHALL use the default (light) theme

#### Scenario: Theme takes precedence over darkMode
- **WHEN** `config { theme: blueprint, darkMode: true }` is defined
- **THEN** the `theme` property SHALL take precedence
- **AND** the blueprint theme SHALL be applied (not dark)
- **AND** a validation warning MAY be emitted about conflicting settings

### Requirement: Naming Convention Normalization

The DSL SHALL support both camelCase (Mermaid convention) and snake_case (existing DSL convention) for configuration property names.

#### Scenario: camelCase config accepted
- **WHEN** `config { wallThickness: 0.3, fontFamily: "Roboto" }` is defined
- **THEN** the parser SHALL accept camelCase property names
- **AND** values SHALL be correctly applied to rendering

#### Scenario: snake_case config accepted (backward compatibility)
- **WHEN** `config { wall_thickness: 0.3, font_family: "Roboto" }` is defined
- **THEN** the parser SHALL accept snake_case property names
- **AND** values SHALL be correctly applied to rendering

#### Scenario: Mixed naming conventions
- **WHEN** `config { wallThickness: 0.3, door_width: 1.0 }` is defined
- **THEN** the parser SHALL accept both conventions in the same block
- **AND** all values SHALL be normalized internally to camelCase

#### Scenario: Normalization mapping
- **GIVEN** the following key mappings:
  | snake_case | camelCase |
  |------------|-----------|
  | `wall_thickness` | `wallThickness` |
  | `font_family` | `fontFamily` |
  | `font_size` | `fontSize` |
  | `show_labels` | `showLabels` |
  | `show_dimensions` | `showDimensions` |
  | `dark_mode` | `darkMode` |
- **WHEN** either naming convention is used
- **THEN** the value SHALL be accessible via the camelCase normalized key

### Requirement: Font Configuration

The DSL SHALL support `fontFamily` and `fontSize` properties in the config block for text rendering customization.

#### Scenario: Custom font family (camelCase)
- **WHEN** `config { fontFamily: "Roboto, sans-serif" }` is defined
- **THEN** all text elements (room labels, dimension annotations) SHALL use the specified font

#### Scenario: Custom font family (snake_case)
- **WHEN** `config { font_family: "Roboto, sans-serif" }` is defined
- **THEN** all text elements SHALL use the specified font

#### Scenario: Custom font size
- **WHEN** `config { fontSize: 14 }` is defined
- **THEN** the base font size SHALL be 14 (in SVG user units)

#### Scenario: Default font values
- **GIVEN** no `fontFamily` or `fontSize` is specified
- **WHEN** the floorplan is rendered
- **THEN** fontFamily SHALL default to "Arial, sans-serif"
- **AND** fontSize SHALL default to 0.8 (SVG user units)

### Requirement: Label Display Toggle

The DSL SHALL support a `showLabels` boolean property to toggle room label display.

#### Scenario: Hide room labels
- **WHEN** `config { showLabels: false }` is defined
- **THEN** room name text elements SHALL NOT be rendered in SVG output
- **AND** room size text elements SHALL NOT be rendered

#### Scenario: Show labels by default
- **GIVEN** no `showLabels` property is set in config
- **WHEN** the floorplan is rendered
- **THEN** room labels SHALL be displayed (default: true)

### Requirement: Dimension Display Toggle in Config

The DSL SHALL support a `showDimensions` boolean property in the config block to enable dimension annotations.

#### Scenario: Enable dimension annotations via config
- **WHEN** `config { showDimensions: true }` is defined
- **THEN** dimension annotation lines and values SHALL be rendered on room boundaries

#### Scenario: Dimensions disabled by default
- **GIVEN** no `showDimensions` property is set in config
- **WHEN** the floorplan is rendered
- **THEN** dimension annotations SHALL NOT be displayed (default: false)

### Requirement: YAML Frontmatter Configuration

The DSL SHALL support an optional YAML frontmatter block at the beginning of the diagram for configuration, following Mermaid.js v10.5.0+ conventions.

#### Scenario: Frontmatter with title
- **GIVEN** a floorplan with frontmatter:
  ```
  ---
  title: Villa Layout
  ---
  floorplan
    floor Ground { ... }
  ```
- **WHEN** the floorplan is parsed
- **THEN** the title "Villa Layout" SHALL be extracted as metadata

#### Scenario: Frontmatter with camelCase config (Mermaid-style)
- **GIVEN** a floorplan with frontmatter:
  ```
  ---
  config:
    theme: blueprint
    wallThickness: 0.5
    fontFamily: "Roboto"
  ---
  floorplan
    floor Ground { ... }
  ```
- **WHEN** the floorplan is parsed
- **THEN** the theme SHALL be set to "blueprint"
- **AND** wallThickness SHALL resolve to 0.5
- **AND** fontFamily SHALL be "Roboto"

#### Scenario: Frontmatter merges with inline config
- **GIVEN** a floorplan with frontmatter `config: { theme: dark }` and inline `config { theme: blueprint }`
- **WHEN** the floorplan is parsed
- **THEN** the inline config SHALL take precedence
- **AND** theme SHALL resolve to "blueprint"

#### Scenario: Frontmatter only (no inline config)
- **GIVEN** a floorplan with frontmatter config but no `config { }` block
- **WHEN** the floorplan is parsed
- **THEN** frontmatter config values SHALL be applied

### Requirement: Boolean Config Values

The DSL SHALL support boolean values (`true`, `false`) for config properties that require them.

#### Scenario: Boolean true value
- **WHEN** `config { showLabels: true }` is defined
- **THEN** the parser SHALL accept `true` as a valid boolean value

#### Scenario: Boolean false value
- **WHEN** `config { showDimensions: false }` is defined
- **THEN** the parser SHALL accept `false` as a valid boolean value

#### Scenario: Invalid boolean value
- **WHEN** `config { showLabels: yes }` is defined
- **THEN** the parser SHALL report a syntax error
- **AND** the error SHALL indicate expected `true` or `false`

## MODIFIED Requirements

### Requirement: Config Block Syntax

The DSL SHALL support a `config` block for global rendering defaults, including theme selection, font configuration, display toggles, and both camelCase and snake_case property naming.

#### Scenario: Config block with wall thickness
- **WHEN** user writes `config { wall_thickness: 0.5 }`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** the wall thickness value SHALL be available for rendering

#### Scenario: Config block with multiple properties
- **WHEN** user writes `config { wall_thickness: 0.3, door_width: 1.0 }`
- **THEN** the parser SHALL accept multiple property definitions
- **AND** all properties SHALL be available for rendering

#### Scenario: Config block with theme
- **WHEN** user writes `config { theme: dark, wallThickness: 0.3 }`
- **THEN** the parser SHALL accept the theme property
- **AND** the dark theme SHALL be applied to rendering

#### Scenario: Config block with darkMode
- **WHEN** user writes `config { darkMode: true }`
- **THEN** the parser SHALL accept the boolean darkMode property
- **AND** the dark theme SHALL be applied to rendering

#### Scenario: Config block with font configuration
- **WHEN** user writes `config { fontFamily: "Helvetica", fontSize: 12 }`
- **THEN** the parser SHALL accept string and number values
- **AND** font settings SHALL be applied to text elements

#### Scenario: Config block with display toggles
- **WHEN** user writes `config { showLabels: true, showDimensions: false }`
- **THEN** the parser SHALL accept boolean property values
- **AND** labels SHALL be shown while dimensions are hidden

#### Scenario: All config properties together (camelCase)
- **WHEN** user writes:
  ```
  config { 
    theme: blueprint,
    darkMode: false,
    wallThickness: 0.3,
    fontFamily: "Roboto",
    fontSize: 12,
    showLabels: true,
    showDimensions: true,
    defaultUnit: m
  }
  ```
- **THEN** the parser SHALL accept all property types together
- **AND** all properties SHALL be correctly applied to rendering
