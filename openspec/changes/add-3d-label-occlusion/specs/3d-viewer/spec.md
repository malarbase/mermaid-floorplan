## ADDED Requirements

### Requirement: CSS2D Label Occlusion via Raycasting

The 3D viewer SHALL hide CSS2D labels (room names, areas, dimensions, stair info) when an opaque mesh lies between the active camera and the label's world position.

#### Scenario: Label behind wall is hidden
- **GIVEN** a floorplan is loaded with room name labels visible
- **AND** the camera is positioned so a wall is between the camera and a room label
- **THEN** that room label is hidden
- **AND** room labels on the near side of the wall remain visible

#### Scenario: Dimension labels follow occlusion rules
- **GIVEN** dimension labels are visible
- **WHEN** the camera orbits to place a floor slab between the camera and a dimension label
- **THEN** that dimension label is hidden

#### Scenario: Stair labels follow occlusion rules
- **GIVEN** stair info and stair dimension labels are visible
- **WHEN** a wall or floor slab occludes the label
- **THEN** the label is hidden

#### Scenario: No flicker at standard distances
- **GIVEN** a label sits on or near a wall plane
- **WHEN** the camera moves around the scene
- **THEN** the label does not rapidly toggle visible/hidden

#### Scenario: Occlusion toggle disables behavior
- **GIVEN** the "Occlude Labels" checkbox is checked (default)
- **WHEN** the user unchecks it
- **THEN** all labels immediately become visible regardless of geometry
- **AND** raycasting stops until the checkbox is re-checked

#### Scenario: Hidden floors do not occlude labels
- **GIVEN** Floor 2 (e.g., a roof) is hidden via the Floors panel
- **AND** a label on Floor 1 is behind where Floor 2's geometry would be
- **THEN** the Floor 1 label remains visible (hidden floor geometry is ignored by the raycast)

### Requirement: Ancestor-Aware Visibility Filtering

The occlusion raycaster SHALL ignore hits from objects whose parent chain includes an invisible object, so that hidden floors, layers, or groups do not spuriously occlude labels.

#### Scenario: Invisible parent group ignored
- **GIVEN** a floor group has `visible = false`
- **AND** a raycast from the camera to a label intersects a mesh inside that floor group
- **THEN** the hit is ignored for occlusion purposes
