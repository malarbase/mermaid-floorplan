# rendering Specification (Delta)

## ADDED Requirements

### Requirement: Export Format Selection

The system SHALL support multiple export formats for floorplan data.

#### Scenario: Export to JSON (existing)

- **GIVEN** a valid floorplan
- **WHEN** exported to JSON format
- **THEN** the existing JSON export behavior SHALL be unchanged

#### Scenario: Export to Fragments (new)

- **GIVEN** a valid floorplan
- **WHEN** exported to Fragments format
- **THEN** a binary Fragments file SHALL be generated
- **AND** the file SHALL be compatible with That Open tools

#### Scenario: Export to IFC text (future)

- **GIVEN** a valid floorplan
- **WHEN** exported to IFC format (Phase 4)
- **THEN** a STEP-format IFC text file SHALL be generated
- **AND** the file SHALL be valid IFC4 or IFC4X3

### Requirement: Export API

The rendering module SHALL provide a unified export API for all formats.

#### Scenario: Unified export function

- **GIVEN** a parsed floorplan document
- **WHEN** `exportFloorplan(document, { format: 'fragments' })` is called
- **THEN** the appropriate exporter SHALL be invoked
- **AND** the result SHALL be returned in the requested format

#### Scenario: Export options validation

- **GIVEN** an invalid format option
- **WHEN** `exportFloorplan(document, { format: 'invalid' })` is called
- **THEN** an error SHALL be thrown
- **AND** the error SHALL list valid format options

### Requirement: IFC Metadata in JSON Export

The JSON export SHALL include IFC metadata when present.

#### Scenario: IFC metadata exported to JSON

- **GIVEN** a floorplan with `ifc { project_name: "My Building" }`
- **WHEN** exported to JSON
- **THEN** the JSON SHALL contain an `ifcMetadata` property
- **AND** the property SHALL include `projectName: "My Building"`

#### Scenario: GUID information in JSON

- **GIVEN** rooms with explicit `guid` clauses
- **WHEN** exported to JSON
- **THEN** each room object SHALL include a `guid` property

### Requirement: Export Progress Reporting

Export operations SHALL report progress for large floorplans.

#### Scenario: Progress callback for Fragments export

- **GIVEN** a large floorplan (100+ rooms)
- **WHEN** exported to Fragments with a progress callback
- **THEN** the callback SHALL be invoked with progress percentages
- **AND** progress SHALL range from 0 to 100

#### Scenario: Progress callback for IFC import

- **GIVEN** a large IFC file (10MB+)
- **WHEN** imported with a progress callback
- **THEN** the callback SHALL be invoked during parsing
- **AND** progress SHALL include stage information (parsing, converting, generating)

