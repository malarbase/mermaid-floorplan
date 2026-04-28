## ADDED Requirements

### Requirement: Stair and Lift Floor Cutouts Localized to Actual Footprint

When an upper floor is rendered above a stair or lift on the floor below, the 3D viewer SHALL cut a hole in the upper floor's slab(s) whose horizontal extent is bounded by the actual rendered footprint of the stair or lift mesh — not by the bounding box of the room that contains it, and not by an analytic approximation derived from DSL fields.

The cutout shape SHALL be derived from the same source of truth used by the headless 3D renderer (`floorplan-3d-core`'s `buildFloorplanScene`), so that the same floorplan input produces visually identical floor-slab cutouts in both `make viewer-dev` and `make export-3d-perspective`.

#### Scenario: Straight stair toward bottom — cutout matches stair footprint, not stair-core room

- **GIVEN** a multi-floor floorplan whose ground floor contains a `StairCore` room of size 6 ft × 24 ft
- **AND** that room contains a single straight stair `MainStair` placed at `(1, 9)` with width `4 ft` and `rise = floor.height` climbing `toward bottom`
- **WHEN** the viewer renders the floorplan
- **THEN** the slab of the floor immediately above SHALL contain a hole whose horizontal bounds equal the bounds of the rendered stair mesh (approximately 1.22 m × 3.05 m at the stair's position)
- **AND** the boarding strip and arrival landing of `StairCore` (the parts of the room not directly under the rendered stair geometry) SHALL remain solid floor

#### Scenario: Multi-floor stair stack — each upper slab cut only above the stair below it

- **GIVEN** a triplex floorplan where every floor contains a stair core with a `MainStair` directly above the previous floor's stair
- **WHEN** the viewer renders the building with all floors visible
- **THEN** the ground floor slab SHALL be solid (no stair below it to penetrate up)
- **AND** the first floor slab SHALL contain exactly one cutout, sized and positioned to match the ground floor's `MainStair` mesh
- **AND** the second floor slab SHALL contain exactly one cutout, sized and positioned to match the first floor's `MainStair` mesh

#### Scenario: Lift shaft cuts upper slab in line with lift footprint

- **GIVEN** a floor containing a lift of size `4 ft × 4 ft` at `(1, 1)` inside a `LiftCore` room of size `6 ft × 6 ft`
- **WHEN** the viewer renders the floor immediately above
- **THEN** the cutout in the upper slab SHALL match the rendered lift mesh footprint (4 ft × 4 ft at the lift's position)
- **AND** the remainder of the `LiftCore` room above the lift footprint SHALL remain solid floor

#### Scenario: Viewer cutout matches headless renderer cutout for the same input

- **GIVEN** any floorplan accepted by both `make viewer-dev` and `make export-3d-perspective`
- **WHEN** both pipelines render the same floor
- **THEN** the floor-slab cutout produced by the viewer SHALL be the same shape, size, and position (modulo float epsilon) as the cutout produced by the headless renderer for the same stair or lift entity
