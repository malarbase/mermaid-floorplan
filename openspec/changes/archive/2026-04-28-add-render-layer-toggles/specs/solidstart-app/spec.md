## ADDED Requirements

### Requirement: Layer Toggles in App Control Panel

The SolidStart app's viewer control panel SHALL include the same five layer-visibility
checkboxes in its View section, wired to `viewer.layerVisibilityManager`.

#### Scenario: Layer toggles present in app viewer
- **GIVEN** a user opens a project in the floorplan-app viewer
- **WHEN** the View section of the control panel is expanded
- **THEN** five layer checkboxes (Floors / Walls / Doors & Windows / Stairs / Lifts)
       are visible below the Exploded View slider
