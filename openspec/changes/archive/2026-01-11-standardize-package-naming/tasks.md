## 1. Rename Folders

- [x] 1.1 Rename `language/` → `floorplan-language/`
- [x] 1.2 Rename `mcp-server/` → `floorplan-mcp-server/`
- [x] 1.3 Rename `viewer/` → `floorplan-viewer/`
- [x] 1.4 Rename `viewer-core/` → `floorplan-viewer-core/`
- [x] 1.5 Rename `interactive-editor/` → `floorplan-editor/`

## 2. Update Package Names

- [x] 2.1 Update `floorplan-language/package.json`: name `floorplans-language` → `floorplan-language`
- [x] 2.2 Update `floorplan-mcp-server/package.json`: name `floorplans-mcp-server` → `floorplan-mcp-server`, bin `floorplans-mcp` → `floorplan-mcp`
- [x] 2.3 Update `floorplan-viewer/package.json`: name `floorplans-viewer` → `floorplan-viewer`
- [x] 2.4 Update `floorplan-viewer-core/package.json`: name `viewer-core` → `floorplan-viewer-core`
- [x] 2.5 Update `floorplan-editor/package.json`: name `interactive-editor` → `floorplan-editor`

## 3. Update Root Workspace Configuration

- [x] 3.1 Update root `package.json` workspaces array with new folder names
- [x] 3.2 Update root `package.json` scripts that reference old workspace names

## 4. Update Internal Dependencies

- [x] 4.1 Update `floorplan-language/package.json` dependencies (uses `floorplan-common`)
- [x] 4.2 Update `floorplan-3d-core/package.json` dependencies (uses `floorplan-common`)
- [x] 4.3 Update `floorplan-viewer-core/package.json` dependencies: `floorplans-language` → `floorplan-language`
- [x] 4.4 Update `floorplan-mcp-server/package.json` dependencies: `floorplans-language` → `floorplan-language`
- [x] 4.5 Update `floorplan-viewer/package.json` dependencies: `floorplans-language` → `floorplan-language`, `viewer-core` → `floorplan-viewer-core`
- [x] 4.6 Update `floorplan-editor/package.json` dependencies: `floorplans-language` → `floorplan-language`, `viewer-core` → `floorplan-viewer-core`

## 5. Update TypeScript Imports

- [x] 5.1 Find and replace all imports of `floorplans-language` → `floorplan-language`
- [x] 5.2 Find and replace all imports of `viewer-core` → `floorplan-viewer-core`

## 6. Update Documentation

- [x] 6.1 Update `openspec/project.md` to reflect new package names
- [x] 6.2 Update `floorplan-mcp-server/README.md` with new binary name
- [x] 6.3 Update root `README.md` if it references package names
- [x] 6.4 Update any example configurations for MCP server

## 7. Update Config Files

- [x] 7.1 Update `floorplan-mcp-server/tsconfig.json` path reference
- [x] 7.2 Update `floorplan-viewer/vite.config.ts` path references
- [x] 7.3 Update `floorplan-editor/vite.config.ts` path references
- [x] 7.4 Update `Makefile` workspace references

## 8. Verify and Test

- [x] 8.1 Delete `node_modules` and `package-lock.json`
- [x] 8.2 Run `npm install` to regenerate lockfile
- [x] 8.3 Run `npm run build` to verify all packages build
- [x] 8.4 Run `npm run test` to verify all tests pass (306 tests passing)
