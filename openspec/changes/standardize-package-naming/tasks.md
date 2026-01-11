## 1. Rename Folders

- [ ] 1.1 Rename `language/` → `floorplan-language/`
- [ ] 1.2 Rename `mcp-server/` → `floorplan-mcp-server/`
- [ ] 1.3 Rename `viewer/` → `floorplan-viewer/`
- [ ] 1.4 Rename `viewer-core/` → `floorplan-viewer-core/`
- [ ] 1.5 Rename `interactive-editor/` → `floorplan-editor/`

## 2. Update Package Names

- [ ] 2.1 Update `floorplan-language/package.json`: name `floorplans-language` → `floorplan-language`
- [ ] 2.2 Update `floorplan-mcp-server/package.json`: name `floorplans-mcp-server` → `floorplan-mcp-server`, bin `floorplans-mcp` → `floorplan-mcp`
- [ ] 2.3 Update `floorplan-viewer/package.json`: name `floorplans-viewer` → `floorplan-viewer`
- [ ] 2.4 Update `floorplan-viewer-core/package.json`: name `viewer-core` → `floorplan-viewer-core`
- [ ] 2.5 Update `floorplan-editor/package.json`: name `interactive-editor` → `floorplan-editor`

## 3. Update Root Workspace Configuration

- [ ] 3.1 Update root `package.json` workspaces array with new folder names
- [ ] 3.2 Update root `package.json` scripts that reference old workspace names

## 4. Update Internal Dependencies

- [ ] 4.1 Update `floorplan-language/package.json` dependencies (uses `floorplan-common`)
- [ ] 4.2 Update `floorplan-3d-core/package.json` dependencies (uses `floorplan-common`)
- [ ] 4.3 Update `floorplan-viewer-core/package.json` dependencies: `floorplans-language` → `floorplan-language`
- [ ] 4.4 Update `floorplan-mcp-server/package.json` dependencies: `floorplans-language` → `floorplan-language`
- [ ] 4.5 Update `floorplan-viewer/package.json` dependencies: `floorplans-language` → `floorplan-language`, `viewer-core` → `floorplan-viewer-core`
- [ ] 4.6 Update `floorplan-editor/package.json` dependencies: `floorplans-language` → `floorplan-language`, `viewer-core` → `floorplan-viewer-core`

## 5. Update TypeScript Imports

- [ ] 5.1 Find and replace all imports of `floorplans-language` → `floorplan-language`
- [ ] 5.2 Find and replace all imports of `viewer-core` → `floorplan-viewer-core`

## 6. Update Documentation

- [ ] 6.1 Update `openspec/project.md` to reflect new package names
- [ ] 6.2 Update `floorplan-mcp-server/README.md` with new binary name
- [ ] 6.3 Update root `README.md` if it references package names
- [ ] 6.4 Update any example configurations for MCP server

## 7. Verify and Test

- [ ] 7.1 Delete `node_modules` and `package-lock.json`
- [ ] 7.2 Run `npm install` to regenerate lockfile
- [ ] 7.3 Run `npm run build` to verify all packages build
- [ ] 7.4 Run `npm run test` to verify all tests pass
