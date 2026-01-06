## ADDED Requirements

### Requirement: DXF Export
The system SHALL provide DXF (Drawing Exchange Format) export for 2D floor plan geometry.

#### Scenario: Export single floor to DXF
- **GIVEN** a valid floorplan with one floor
- **WHEN** the user runs `make export-dxf FILE=plan.floorplan`
- **THEN** the system produces `plan-FloorName.dxf`
- **AND** the DXF file contains walls, doors, windows, and room labels

#### Scenario: Export multi-floor floorplan
- **GIVEN** a floorplan with multiple floors
- **WHEN** the user runs `make export-dxf FILE=building.floorplan`
- **THEN** the system produces one DXF file per floor
- **AND** each file is named `building-FloorName.dxf`

#### Scenario: DXF layer organization
- **WHEN** a floor is exported to DXF
- **THEN** the DXF file SHALL contain layers:
  - `WALLS` - Wall geometry (LINE/POLYLINE)
  - `DOORS` - Door arcs and frames
  - `WINDOWS` - Window representations
  - `ROOMS` - Room boundary polylines
  - `LABELS` - Room names and area text
  - `DIMENSIONS` - Dimension annotations (if enabled)

#### Scenario: DXF compatibility
- **WHEN** a DXF file is exported
- **THEN** it SHALL open without errors in AutoCAD 2018+
- **AND** it SHALL open without errors in LibreCAD 2.x
- **AND** layers SHALL be toggleable in CAD software

### Requirement: DXF Unit Support
The DXF export SHALL respect the floorplan's configured units.

#### Scenario: Metric units export
- **GIVEN** a floorplan with `config { default_unit: m }`
- **WHEN** exported to DXF
- **THEN** the DXF INSUNITS variable SHALL be set to Meters (6)
- **AND** coordinates SHALL be in meters

#### Scenario: Imperial units export
- **GIVEN** a floorplan with `config { default_unit: ft }`
- **WHEN** exported to DXF
- **THEN** the DXF INSUNITS variable SHALL be set to Feet (2)
- **AND** coordinates SHALL be in feet

### Requirement: MCP Server DXF Format
The `render_floorplan` MCP tool SHALL support DXF format output.

#### Scenario: Request DXF via MCP
- **WHEN** `render_floorplan` is called with `format: "dxf"`
- **THEN** the response SHALL include base64-encoded DXF content
- **AND** the `mimeType` SHALL be `application/dxf`

#### Scenario: Multi-floor DXF via MCP
- **GIVEN** a floorplan with multiple floors
- **WHEN** `render_floorplan` is called with `format: "dxf"` and `floorIndex: 0`
- **THEN** only the specified floor SHALL be exported

