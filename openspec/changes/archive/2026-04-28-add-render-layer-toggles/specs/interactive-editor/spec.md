## ADDED Requirements

### Requirement: Layer Toggles in Editor View Panel

The interactive editor SHALL expose the same five layer-visibility checkboxes
(Floors, Walls, Doors & Windows, Stairs, Lifts) in its View section, wired to
`editorCore.layerVisibilityManager`.

#### Scenario: Layer toggles available in editor
- **GIVEN** the editor is open with a floorplan loaded
- **WHEN** the user expands the View section of the right-side panel
- **THEN** five layer checkboxes are visible below the Exploded View slider
- **AND** all checkboxes are checked by default

#### Scenario: Hiding walls in editor does not affect DSL
- **WHEN** the user unchecks "Walls" in the editor's View panel
- **THEN** wall geometry disappears from the 3D view
- **AND** the DSL source code is unchanged
- **AND** re-checking "Walls" restores wall geometry
