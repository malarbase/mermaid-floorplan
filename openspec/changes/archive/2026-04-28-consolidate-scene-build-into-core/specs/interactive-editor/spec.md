## ADDED Requirements

### Requirement: Editor Stair and Lift Floor Cutouts Match the Viewer

The interactive editor's 3D pane SHALL produce stair and lift floor-slab cutouts that are identical to the read-only viewer's cutouts for the same floorplan input. The editor MUST NOT carry a separate analytic cutout-bounds implementation that can drift from the renderer's mesh-derived bounds.

This requirement preserves the editor's interactive concerns (mesh-to-DSL source-range mapping, click-to-select walls and stairs, exploded view, theme runtime swap, annotations) while ensuring that any future fix to stair geometry, lift geometry, or floor-slab CSG in `floorplan-3d-core` is automatically reflected in the editor's preview.

#### Scenario: Editor and viewer agree on cutout shape

- **GIVEN** a multi-floor floorplan opened simultaneously in the editor's 3D pane and in `make viewer-dev`
- **WHEN** both panes render the same floor
- **THEN** the floor-slab cutouts above stairs and lifts SHALL be identical in shape, size, and position (modulo float epsilon)

#### Scenario: Editor stair selection survives consolidation

- **GIVEN** a floorplan with a stair `MainStair` defined at a known DSL source range
- **WHEN** the user clicks any part of the rendered stair group in the editor
- **THEN** the editor SHALL highlight the stair as a unit (preserving existing selection behaviour)
- **AND** the editor SHALL be able to navigate to the stair's source range in the DSL

#### Scenario: Editor wall selection survives consolidation

- **GIVEN** a floorplan with walls defined at known DSL source ranges
- **WHEN** the user clicks any wall in the editor
- **THEN** the editor SHALL highlight the wall mesh
- **AND** the editor SHALL be able to navigate to that wall's source range in the DSL
