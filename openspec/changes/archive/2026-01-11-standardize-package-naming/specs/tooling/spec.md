## ADDED Requirements

### Requirement: Consistent Package Naming Convention

All npm packages in the monorepo SHALL use the `floorplan-` (singular) prefix followed by a descriptive suffix. Folder names SHALL match their package names exactly.

#### Scenario: Correct package naming

- **GIVEN** a developer adds a new package to the workspace
- **WHEN** they name the package
- **THEN** the package name MUST follow the pattern `floorplan-<purpose>` (e.g., `floorplan-renderer`, `floorplan-cli`)
- **AND** the folder name MUST match the package name exactly

#### Scenario: Verifying existing packages follow convention

- **GIVEN** the monorepo contains the following packages
- **WHEN** listing all workspace packages
- **THEN** the packages SHALL be:
  - `floorplan-common` - Shared utilities
  - `floorplan-3d-core` - 3D rendering primitives
  - `floorplan-language` - Langium grammar and parser
  - `floorplan-mcp-server` - MCP server for AI integration
  - `floorplan-viewer` - Web-based viewer application
  - `floorplan-viewer-core` - Shared viewer abstractions
  - `floorplan-editor` - Interactive editor application

### Requirement: MCP Server Binary Name

The MCP server package SHALL expose a CLI binary named `floorplan-mcp` for users to run from the command line.

#### Scenario: Running MCP server via binary

- **WHEN** a user installs `floorplan-mcp-server` globally or via npx
- **THEN** they SHALL be able to invoke it using `floorplan-mcp` command
- **AND** the binary SHALL start the MCP server with stdio transport
