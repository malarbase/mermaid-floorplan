## Why

Package names in the monorepo are inconsistent—some use `floorplan-` (singular), others use `floorplans-` (plural), and two packages have no domain prefix at all. This creates confusion for contributors and makes the project harder to understand at a glance.

## What Changes

- **BREAKING** Rename all packages to use consistent `floorplan-` (singular) prefix
- Rename folder names to match package names for discoverability
- Update all internal workspace dependencies and imports
- Update root `package.json` workspace configuration

### Package Renames

| Current Folder | Current npm Name | New Folder | New npm Name |
|----------------|------------------|------------|--------------|
| `floorplan-common` | `floorplan-common` | (unchanged) | (unchanged) |
| `floorplan-3d-core` | `floorplan-3d-core` | (unchanged) | (unchanged) |
| `language` | `floorplans-language` | `floorplan-language` | `floorplan-language` |
| `mcp-server` | `floorplans-mcp-server` | `floorplan-mcp-server` | `floorplan-mcp-server` |
| `viewer` | `floorplans-viewer` | `floorplan-viewer` | `floorplan-viewer` |
| `viewer-core` | `viewer-core` | `floorplan-viewer-core` | `floorplan-viewer-core` |
| `interactive-editor` | `interactive-editor` | `floorplan-editor` | `floorplan-editor` |

## Impact

- **Affected specs**: None (this is a tooling/infrastructure change)
- **Affected code**:
  - Root `package.json` (workspaces array)
  - All 7 package `package.json` files
  - All TypeScript files with workspace imports
  - `openspec/project.md` documentation
  - MCP server binary name (`floorplans-mcp` → `floorplan-mcp`)
  - GitHub Actions / CI scripts (if any reference package names)
- **Migration**: Users of the MCP server will need to update their configuration to use the new binary name `floorplan-mcp`
