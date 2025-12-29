## ADDED Requirements
### Requirement: 3D Data Export
The system SHALL provide a mechanism to export floorplan data into a machine-readable JSON format suitable for 3D rendering.

#### Scenario: Export 3D Data
- **WHEN** the export command is run with a floorplan file
- **THEN** a JSON file is generated containing:
    - Floor dimensions and elevations.
    - Room coordinates (x, z).
    - Wall specifications (locations, types).

