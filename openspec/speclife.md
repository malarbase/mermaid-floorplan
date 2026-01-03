# SpecLife Configuration

This file provides context for AI agents using speclife slash commands.

## Commands

- **Test:** `npm test` (runs tests in `language/` and `mcp-server/` workspaces)
- **Build:** `npm run build` (generates Langium parser + builds all workspaces + Vite)
- **Lint:** Not configured

Alternative via Makefile:
- `make test`
- `make build`
- `make install`

## Release Policy

- **Auto-release:** patch and minor versions
- **Manual release:** major versions (breaking changes)

## Publish

- **Registry:** N/A (private packages - demo/tool project)
- **Workflow:** Not needed (all packages marked private)
- **Secret:** None required

This is a demonstration and development tool project with a monorepo structure:
- Root package: Web demo app (Vite-based)
- `language/`: Langium grammar and parser (standalone package)
- `mcp-server/`: Model Context Protocol server for AI assistant integration
- `viewer/`: Three.js-based 3D floorplan viewer

All packages are private and not published to npm. The project is deployed to GitHub Pages for the demo.

## Context Files

When implementing changes, always read:
- `openspec/project.md` - project context and conventions
- `openspec/AGENTS.md` - agent guidelines
- `README.md` - project overview

## Important Project-Specific Notes

- **Node.js version:** Requires >= 20.10.0 (Langium 4.x dependency)
- **Grammar changes:** Run `npm run langium:generate` after modifying `floorplans.langium`
- **Sandbox testing:** Tests may fail in Cursor sandbox with "RangeError" - use `required_permissions: ["all"]`
- **Entry point:** Root package builds the web demo; language package is consumed by mcp-server and viewer
