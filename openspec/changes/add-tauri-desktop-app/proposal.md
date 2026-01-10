# Tauri Desktop Application

## Why

The mermaid-floorplan project currently runs only as a web application. Users working on floorplan design want a native desktop experience with file system access, native menus, offline capability, and professional desktop integration. Tauri 2.0 provides this with minimal changes to the existing TypeScript/Vite codebase while keeping bundle sizes small (~5-10MB vs 100MB+ for Electron).

## What Changes

- Add Tauri 2.0 integration to wrap the existing `interactive-editor/` as a native desktop application
- Add native file save/open dialogs for `.floorplan` files
- Add native menu bar with standard File/Edit/View/Help menus
- Support auto-updates for desktop releases
- Build targets: macOS (ARM64 + x86_64), Windows (x64), Linux (x64)
- Add GitHub Actions workflow for cross-platform builds

## Impact

- Affected specs: **NEW** `native-app/` capability
- Affected code:
  - `src-tauri/` (new Tauri backend)
  - `interactive-editor/` (minor: IPC hooks for native features)
  - `.github/workflows/` (new release workflow)
  - Root `package.json` (new scripts)
