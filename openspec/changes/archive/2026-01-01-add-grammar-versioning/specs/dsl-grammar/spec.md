## ADDED Requirements

### Requirement: Grammar Version Declaration

The DSL SHALL support an optional version declaration to specify which grammar version the floorplan was authored for.

#### Scenario: YAML frontmatter version declaration

- **GIVEN** a floorplan file starting with YAML frontmatter
- **WHEN** the frontmatter contains `version: "1.0"`
- **THEN** the parser SHALL use grammar version 1.0 rules
- **AND** the version SHALL be accessible in the parsed AST

#### Scenario: Inline directive version declaration

- **GIVEN** a floorplan file starting with `%%{version: 1.0}%%`
- **WHEN** the file is parsed
- **THEN** the parser SHALL use grammar version 1.0 rules
- **AND** the directive SHALL be consumed (not passed to diagram content)

#### Scenario: No version declaration

- **GIVEN** a floorplan file without any version declaration
- **WHEN** the file is parsed
- **THEN** the parser SHALL assume the current (latest) grammar version
- **AND** a warning SHALL be emitted recommending explicit version declaration

### Requirement: Semantic Versioning

The grammar SHALL follow semantic versioning (MAJOR.MINOR.PATCH) where:
- MAJOR: Breaking changes that remove or alter existing syntax
- MINOR: New features that are backward compatible
- PATCH: Bug fixes and clarifications

#### Scenario: Major version breaking change

- **GIVEN** grammar version 2.0 removes the `door_width` config property
- **WHEN** a file declares `version: "2.0"` and uses `door_width`
- **THEN** the parser SHALL emit an error
- **AND** the error message SHALL reference the migration path

#### Scenario: Minor version new feature

- **GIVEN** grammar version 1.1 adds the `size` attribute to connections
- **WHEN** a file declares `version: "1.0"` and uses connection size
- **THEN** the parser SHALL accept the syntax (minor versions are backward compatible within major)

#### Scenario: Patch version compatibility

- **GIVEN** grammar versions 1.0.0 and 1.0.1
- **WHEN** a file declares `version: "1.0"` (without patch)
- **THEN** the parser SHALL use the latest patch version (1.0.1)

### Requirement: Deprecation Warnings

The system SHALL emit deprecation warnings for features scheduled for removal in a future major version.

#### Scenario: Using deprecated feature

- **GIVEN** `door_width` is deprecated in favor of `door_size`
- **WHEN** a floorplan uses `door_width` in config
- **THEN** the system SHALL emit a warning indicating deprecation
- **AND** the warning SHALL specify the replacement (`door_size`)
- **AND** the warning SHALL specify when it becomes an error (version 2.0)

#### Scenario: Deprecated feature in older version file

- **GIVEN** a file declares `version: "1.0"`
- **AND** `door_width` is deprecated in 1.1 for removal in 2.0
- **WHEN** the file is parsed
- **THEN** a deprecation warning SHALL still be emitted
- **AND** parsing SHALL succeed (feature still valid in 1.x)

### Requirement: Version Compatibility Validation

The system SHALL validate version declarations against supported grammar versions.

#### Scenario: Unsupported future version

- **GIVEN** the current grammar version is 1.2.0
- **WHEN** a file declares `version: "2.0"`
- **THEN** the parser SHALL emit an error
- **AND** the error SHALL indicate the maximum supported version

#### Scenario: Unsupported old version

- **GIVEN** grammar versions prior to 1.0 are not supported
- **WHEN** a file declares `version: "0.9"`
- **THEN** the parser SHALL emit an error
- **AND** the error SHALL recommend upgrading to a supported version

### Requirement: Migration Support

The system SHALL provide tooling to migrate floorplan files between grammar versions.

#### Scenario: Migrate command updates syntax

- **GIVEN** a floorplan file using `door_width: 3, door_height: 7`
- **WHEN** the user runs `floorplan migrate file.floorplan --to 2.0`
- **THEN** the file SHALL be updated to use `door_size: (3 x 7)`
- **AND** the version declaration SHALL be updated to `version: "2.0"`

#### Scenario: Dry run mode

- **GIVEN** a floorplan file requiring migration
- **WHEN** the user runs `floorplan migrate file.floorplan --to 2.0 --dry-run`
- **THEN** the system SHALL display proposed changes
- **AND** the file SHALL NOT be modified

#### Scenario: Migration preserves semantics

- **GIVEN** a valid floorplan file in version 1.0
- **WHEN** migrated to version 2.0
- **THEN** the rendered output (SVG/3D) SHALL be identical
- **AND** no functional changes SHALL occur

### Requirement: Version in Export

The grammar version SHALL be included in exported formats.

#### Scenario: JSON export includes version

- **GIVEN** a floorplan file with `version: "1.0"`
- **WHEN** exported to JSON
- **THEN** the JSON SHALL include `"grammarVersion": "1.0"`

#### Scenario: SVG includes version metadata

- **GIVEN** a floorplan file with `version: "1.0"`
- **WHEN** rendered to SVG
- **THEN** the SVG SHALL include version in metadata or comments

