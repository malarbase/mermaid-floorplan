# rendering Spec Deltas

## ADDED Requirements

### Requirement: Floor Visibility API
The rendering system SHALL accept an array of floor IDs to control which floors are rendered in the output.

#### Scenario: Render specific floors by ID
- **WHEN** `RenderOptions.visibleFloors` is set to `["f1", "f3"]`
- **THEN** only floors with IDs "f1" and "f3" are rendered
- **AND** floors "f2" and any others are excluded from the output

#### Scenario: Empty visibleFloors array
- **WHEN** `RenderOptions.visibleFloors` is set to `[]`
- **THEN** an empty SVG is rendered (no floors visible)

#### Scenario: Undefined visibleFloors renders all
- **WHEN** `RenderOptions.visibleFloors` is undefined
- **AND** deprecated options are not set
- **THEN** all floors are rendered (backward compatible default)

#### Scenario: Single floor in visibleFloors
- **WHEN** `RenderOptions.visibleFloors` contains exactly one floor ID
- **THEN** that floor is rendered using single-floor layout
- **AND** no floor labels are displayed

#### Scenario: Multiple floors in visibleFloors
- **WHEN** `RenderOptions.visibleFloors` contains multiple floor IDs
- **THEN** those floors are rendered using multi-floor layout
- **AND** floor labels are displayed for each floor
- **AND** layout respects `multiFloorLayout` setting (stacked or sideBySide)

## MODIFIED Requirements

### Requirement: Multi-Floor Rendering
The system SHALL support rendering multiple floors from a single floorplan document using the visibleFloors API. Legacy options floorIndex and renderAllFloors are deprecated but still functional for backward compatibility.

#### Scenario: Default single floor rendering
- **WHEN** a floorplan contains multiple floors and no floor visibility options are specified
- **THEN** only the first floor is rendered (backward compatible via deprecated floorIndex default of 0)

#### Scenario: Specific floor selection (deprecated)
- **WHEN** `RenderOptions.floorIndex` is set to 1
- **THEN** the second floor (index 1) is rendered
- **AND** a deprecation warning is logged recommending visibleFloors usage

#### Scenario: All floors stacked view (deprecated)
- **WHEN** `RenderOptions.renderAllFloors` is true with layout `stacked`
- **THEN** all floors are rendered vertically with floor labels
- **AND** a deprecation warning is logged recommending visibleFloors usage

#### Scenario: All floors side-by-side view (deprecated)
- **WHEN** `RenderOptions.renderAllFloors` is true with layout `sideBySide`
- **THEN** all floors are rendered horizontally with floor labels
- **AND** a deprecation warning is logged recommending visibleFloors usage

#### Scenario: visibleFloors takes precedence over deprecated options
- **WHEN** both `visibleFloors` and deprecated options (floorIndex/renderAllFloors) are specified
- **THEN** `visibleFloors` is used and deprecated options are ignored
- **AND** no deprecation warning is logged (user is using new API)

### Requirement: Door Swing Direction
The system SHALL render door swing arcs according to the specified swing direction, accounting for wall orientation perspective.

#### Scenario: Left swing door
- **WHEN** a connection specifies `swing: left`
- **THEN** the door arc curves to the left of the door opening

#### Scenario: Right swing door
- **WHEN** a connection specifies `swing: right`
- **THEN** the door arc curves to the right of the door opening

#### Scenario: Opens-into room direction
- **WHEN** a connection specifies `opens into Kitchen`
- **THEN** the door arc direction indicates opening toward the Kitchen room

#### Scenario: Right wall swing inversion
- **WHEN** a door is on a right wall (vertical, positive X-facing)
- **THEN** the swing direction is inverted from left wall to match "facing from inside" perspective
- **AND** left swing on right wall opens upward (toward min Y/top)
- **AND** right swing on right wall opens downward (toward max Y/bottom)

