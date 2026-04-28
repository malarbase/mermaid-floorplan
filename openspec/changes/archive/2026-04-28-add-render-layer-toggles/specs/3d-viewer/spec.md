## ADDED Requirements

### Requirement: Render-Layer Toggles in View Panel

The 3D viewer SHALL expose five layer-visibility checkboxes (Floors, Walls, Doors & Windows,
Stairs, Lifts) inside the existing View section of the control panel, all defaulting to on.

#### Scenario: Layer toggle hides matching geometry
- **GIVEN** a floorplan is loaded with walls, stairs, and connections
- **WHEN** the user unchecks "Walls"
- **THEN** all wall geometry disappears immediately without a scene rebuild
- **AND** floors, stairs, lifts, and connections remain visible

#### Scenario: Layer toggle shows matching geometry
- **GIVEN** the Walls layer is hidden
- **WHEN** the user re-checks "Walls"
- **THEN** all wall geometry reappears immediately

#### Scenario: Layer state persists across file reloads
- **GIVEN** the user has unchecked "Stairs"
- **WHEN** a new floorplan file is loaded
- **THEN** stairs remain hidden in the new floorplan

#### Scenario: Per-floor visibility composes correctly
- **GIVEN** Floor 2 is hidden via the Floors panel
- **AND** the Walls layer is visible
- **WHEN** the user views the scene
- **THEN** Floor 2's walls remain hidden (floor-level visibility takes precedence)

#### Scenario: Doors & Windows toggled independently of walls
- **GIVEN** both Walls and Doors & Windows are visible
- **WHEN** the user unchecks "Doors & Windows"
- **THEN** door and window meshes disappear
- **AND** wall segments remain visible

### Requirement: Layer Tags on Scene Geometry

The scene builder SHALL stamp `userData.layer` on every emitted group so the
`LayerVisibilityManager` can toggle visibility without rebuilding the scene.

#### Scenario: Floor slabs tagged
- **WHEN** `buildFloorplanSceneFromNormalized` builds a floor
- **THEN** the floor-slabs group has `userData.layer === 'floor'`

#### Scenario: Wall segments isolated from connections
- **WHEN** the scene is built with walls enabled
- **THEN** a `walls_<floorId>` group (`userData.layer === 'wall'`) contains only wall-segment meshes
- **AND** a sibling `connections_<floorId>` group (`userData.layer === 'connection'`) contains door and window meshes
