## ADDED Requirements

### Requirement: YAML Frontmatter Configuration

The DSL SHALL support an optional YAML frontmatter block at the beginning of the diagram for configuration, following Mermaid.js v10.5.0+ conventions.

#### Scenario: Frontmatter with theme configuration
- **GIVEN** a floorplan with frontmatter:
  ```
  ---
  title: Villa Layout
  config:
    theme: blueprint
  ---
  floorplan
    floor Ground { ... }
  ```
- **WHEN** the floorplan is parsed
- **THEN** the title SHALL be extracted as metadata
- **AND** the theme SHALL be set to "blueprint"

#### Scenario: Frontmatter with nested floorplan config
- **GIVEN** a floorplan with frontmatter:
  ```
  ---
  config:
    floorplan:
      wallThickness: 0.5
      doorWidth: 1.2
  ---
  floorplan
    floor Ground { ... }
  ```
- **WHEN** the floorplan is parsed
- **THEN** wallThickness SHALL resolve to 0.5
- **AND** doorWidth SHALL resolve to 1.2

#### Scenario: Frontmatter merges with inline config
- **GIVEN** a floorplan with frontmatter `wallThickness: 0.3` and inline `config { wall_thickness: 0.5 }`
- **WHEN** the floorplan is parsed
- **THEN** the inline config SHALL take precedence
- **AND** wallThickness SHALL resolve to 0.5

### Requirement: CamelCase Configuration Keys

The DSL SHALL support camelCase configuration property names in addition to snake_case, aligning with Mermaid.js naming conventions.

#### Scenario: camelCase config accepted
- **WHEN** user writes `config { wallThickness: 0.3, doorWidth: 1.0 }`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** wallThickness and doorWidth SHALL be applied to rendering

#### Scenario: snake_case config still accepted (backward compatibility)
- **WHEN** user writes `config { wall_thickness: 0.3, door_width: 1.0 }`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** the values SHALL be normalized to camelCase internally

#### Scenario: Mixed case styles in same config block
- **WHEN** user writes `config { wallThickness: 0.3, door_height: 2.0 }`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** both properties SHALL be correctly applied

### Requirement: Theme Configuration

The DSL SHALL support a `theme` property for selecting visual presets.

#### Scenario: Theme specified in config
- **WHEN** `config { theme: blueprint }` is defined
- **THEN** the renderer SHALL use the "blueprint" theme colors and styles
- **AND** rooms without explicit styles SHALL inherit theme defaults

#### Scenario: Unknown theme warning
- **WHEN** `config { theme: nonexistent }` is defined
- **AND** no theme named "nonexistent" is registered
- **THEN** the system SHALL emit a warning about unknown theme
- **AND** rendering SHALL proceed with the default theme

### Requirement: Font Configuration

The DSL SHALL support `fontFamily` and `fontSize` properties for text rendering.

#### Scenario: Custom font configuration
- **WHEN** `config { fontFamily: "Roboto, sans-serif", fontSize: 14 }` is defined
- **THEN** all text elements (room labels, dimension annotations) SHALL use Roboto at 14px

#### Scenario: Default font values
- **GIVEN** no fontFamily or fontSize is specified
- **WHEN** the floorplan is rendered
- **THEN** fontFamily SHALL default to "Arial, sans-serif"
- **AND** fontSize SHALL default to 12

### Requirement: Display Toggle Configuration

The DSL SHALL support boolean properties to toggle display of optional elements.

#### Scenario: Hide room labels
- **WHEN** `config { showLabels: false }` is defined
- **THEN** room label text SHALL NOT be rendered in SVG output

#### Scenario: Show dimension annotations
- **WHEN** `config { showDimensions: true }` is defined
- **THEN** dimension annotation lines and values SHALL be rendered on walls

#### Scenario: Dimension unit configuration
- **WHEN** `config { dimensionUnit: "ft" }` is defined
- **AND** showDimensions is true
- **THEN** dimension values SHALL be displayed with "ft" suffix

### Requirement: Configuration Value Types

The DSL SHALL validate configuration values match expected types.

#### Scenario: Invalid number value
- **WHEN** `config { wallThickness: "thick" }` is defined
- **THEN** the system SHALL report a validation error
- **AND** the error SHALL indicate wallThickness requires a number

#### Scenario: Invalid boolean value
- **WHEN** `config { showLabels: 1 }` is defined
- **THEN** the system SHALL report a validation error
- **AND** the error SHALL indicate showLabels requires true or false

### Requirement: Configuration Hierarchy

The DSL SHALL resolve configuration values in order: defaults → site config (via API) → diagram config (frontmatter/inline).

#### Scenario: Default values applied
- **GIVEN** no config block and no frontmatter
- **WHEN** the floorplan is rendered
- **THEN** wallThickness SHALL be 0.2 (default)
- **AND** doorWidth SHALL be 1.0 (default)
- **AND** defaultHeight SHALL be 3.35 (default)

#### Scenario: Diagram config overrides defaults
- **GIVEN** default wallThickness is 0.2
- **WHEN** `config { wallThickness: 0.5 }` is specified
- **THEN** wallThickness SHALL resolve to 0.5

## MODIFIED Requirements

### Requirement: Config Block Syntax

The DSL SHALL support a `config` block for global rendering defaults, with both snake_case and camelCase property names.

#### Scenario: Config block with camelCase wall thickness
- **WHEN** user writes `config { wallThickness: 0.5 }`
- **THEN** the parser SHALL accept this as valid syntax
- **AND** the wall thickness value SHALL be available for rendering

#### Scenario: Config block with multiple properties (mixed case)
- **WHEN** user writes `config { wallThickness: 0.3, door_width: 1.0, defaultStyle: Modern }`
- **THEN** the parser SHALL accept all property definitions
- **AND** all properties SHALL be available for rendering

#### Scenario: Config block with theme
- **WHEN** user writes `config { theme: dark, wallThickness: 0.3 }`
- **THEN** the parser SHALL accept the theme property
- **AND** the dark theme SHALL be applied to rendering

#### Scenario: Config block with display toggles
- **WHEN** user writes `config { showLabels: true, showDimensions: false }`
- **THEN** the parser SHALL accept boolean property values
- **AND** labels SHALL be shown while dimensions are hidden

