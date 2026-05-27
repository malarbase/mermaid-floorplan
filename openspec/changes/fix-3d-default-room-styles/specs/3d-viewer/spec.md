## ADDED Requirements

### Requirement: Default Style Application in 3D Geometry

The 3D geometry pipeline SHALL resolve room materials using the same order as the SVG renderer: room's explicit `style` attribute first, then `config.default_style`, then built-in defaults.

#### Scenario: Room with explicit style renders correctly in 3D

- **GIVEN** a floorplan with a style `Modern { floor_color: "#E0E0E0" }` and a room `Office` declared with `style Modern`
- **WHEN** the 3D scene is built
- **THEN** the Office floor slab SHALL use color `#E0E0E0`
- **AND** the Office walls SHALL use the `Modern` wall color

#### Scenario: Room without explicit style falls back to default_style

- **GIVEN** a config block `{ default_style: Modern }` and a room `Kitchen` with no explicit style
- **WHEN** the 3D scene is built
- **THEN** the Kitchen floor slab SHALL use the `Modern` floor color
- **AND** the Kitchen walls SHALL use the `Modern` wall color

#### Scenario: Room without style or default_style uses built-in defaults

- **GIVEN** a floorplan with no `default_style` config and a room `Bedroom` with no explicit style
- **WHEN** the 3D scene is built
- **THEN** the Bedroom floor slab SHALL use the built-in default floor color `#E0E0E0`
- **AND** the Bedroom walls SHALL use the built-in default wall color `#000000`
