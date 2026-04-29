## MODIFIED Requirements

### Requirement: Wall Rendering

The 3D viewer SHALL render walls using CSG-based geometry with accurate T-junction
handling so horizontal wall segments do not extend past shared vertical boundaries.

#### Scenario: Wall renders with correct geometry
- **GIVEN** a floor with multiple rooms sharing walls
- **WHEN** walls are generated
- **THEN** walls SHALL be rendered using CSG operations that produce clean openings for doors and windows
- **AND** wall materials SHALL be preserved after CSG operations

#### Scenario: Horizontal wall does not bump at T-junction
- **GIVEN** a horizontal wall that meets a shared vertical boundary (e.g. corridor abutting a room's side wall)
- **WHEN** `adjustSegmentsForCorners` computes segment endpoints
- **THEN** the horizontal segment SHALL NOT extend beyond the shared boundary
- **AND** `hasContinuousWallAt()` SHALL return true for the shared boundary point
- **AND** the room face SHALL appear flush with no outward bump

### Requirement: Door Rendering in 3D

The 3D viewer SHALL render doors as mesh geometry placed at CSG holes in the wall,
computing hole positions within the shared overlap between connected rooms.

#### Scenario: Door hole and mesh use same overlap-aware position
- **GIVEN** two connected rooms whose origins differ along the wall axis
- **WHEN** `createConnectionHole` computes the CSG hole position
- **THEN** the position SHALL be calculated within the shared overlap between the two rooms using `calculatePositionWithFallback`
- **AND** it SHALL match the position used by `connection-geometry.ts` for the door mesh
- **AND** `filterHolesForSegment` SHALL NOT discard the hole

#### Scenario: Door hole visible for offset rooms
- **GIVEN** a corridor at z=1.83 m connecting to Linen_1 at z=9.14 m (door at 43%)
- **WHEN** the wall is built
- **THEN** the CSG hole SHALL land at ≈9.93 m (overlap-aware) not at ≈7.60 m (raw)
- **AND** the wall segment SHALL have the expected opening

### Requirement: Room Name Annotations

Room name and area labels SHALL be merged into a single CSS2DObject per room with
independently togglable child elements to prevent overlap.

#### Scenario: Single label object per room
- **GIVEN** a floor is loaded with room name and area display enabled
- **WHEN** `updateRoomLabels()` is called
- **THEN** exactly one `CSS2DObject` SHALL exist per room
- **AND** it SHALL contain a `.room-label__name` child and a `.room-label__area` child
- **AND** toggling name or area visibility SHALL not affect the other child

## ADDED Requirements

### Requirement: Stair 3D Geometry

The 3D viewer SHALL render closed-stringer stairs as a single `ExtrudeGeometry` sawtooth
flight to eliminate inter-step seam shimmer on oblique views.

#### Scenario: Closed-stringer stair uses sawtooth extrusion
- **GIVEN** a stair with a closed stringer type (default)
- **WHEN** the stair geometry is built
- **THEN** a single `ExtrudeGeometry` flight SHALL be generated via `buildSawtoothFlight()`
- **AND** the soffit SHALL be sloped with `SOFFIT_THICKNESS` = 150 mm
- **AND** no per-step BoxGeometry seam artifacts SHALL appear on oblique camera angles

#### Scenario: Open/glass stringers retain per-step meshes
- **GIVEN** a stair with an open or glass stringer type
- **WHEN** the stair geometry is built
- **THEN** individual tread and riser meshes SHALL be generated as before

### Requirement: Stair Annotation Overlays

The 3D viewer SHALL display optional per-stair CSS2D annotation overlays for stair
info (name, step count, rise) and stair dimensions (width × depth), controllable via
checkboxes in all viewer UI variants.

#### Scenario: Stair info label shown when enabled
- **GIVEN** `showStairInfo` is true
- **WHEN** annotations are updated after loading a floorplan
- **THEN** each stair SHALL have a CSS2D label with `.stair-info-label` class
- **AND** it SHALL show the stair name, step count, and rise in a three-line layout
- **AND** hiding `showStairInfo` SHALL remove all stair info labels

#### Scenario: Stair dimension label shown when enabled
- **GIVEN** `showStairDimensions` is true
- **WHEN** annotations are updated
- **THEN** each stair SHALL have a CSS2D label showing `w × d` dimensions
- **AND** hiding `showStairDimensions` SHALL remove all stair dimension labels

#### Scenario: Stair annotation checkboxes present in all UIs
- **GIVEN** the 3D viewer is displayed in any UI variant (vanilla-JS, SolidJS app, or floorplan-viewer)
- **WHEN** the control panel is rendered
- **THEN** "Show Stair Info" and "Show Stair Dimensions" checkboxes SHALL be present
- **AND** toggling either checkbox SHALL immediately update the scene annotations
