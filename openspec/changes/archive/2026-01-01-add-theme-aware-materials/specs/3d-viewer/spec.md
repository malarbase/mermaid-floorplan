## ADDED Requirements

### Requirement: Theme-Aware Material Colors

The 3D viewer SHALL apply theme-appropriate colors to floor, wall, door, and window materials when no explicit room style is specified.

#### Scenario: Dark theme material colors
- **WHEN** the viewer theme is set to `dark`
- **AND** a room has no explicit style
- **THEN** floor material uses dark theme floor color
- **AND** wall material uses dark theme wall color
- **AND** door material uses dark theme door color
- **AND** window material uses dark theme window color

#### Scenario: Blueprint theme material colors
- **WHEN** the viewer theme is set to `blueprint`
- **AND** a room has no explicit style
- **THEN** materials use the blueprint color palette

#### Scenario: Explicit style takes precedence
- **WHEN** a room has an explicit style defined
- **AND** the viewer theme changes
- **THEN** the room's materials remain unchanged

### Requirement: Dynamic Material Updates

The 3D viewer SHALL update material colors dynamically when the theme changes without requiring a full scene reload.

#### Scenario: Theme toggle updates materials
- **WHEN** the user toggles the theme
- **THEN** non-styled room materials update to match the new theme
- **AND** the scene does not reload from scratch

