# Tauri Desktop Application

## Why

The mermaid-floorplan project currently runs only as a web application. Users working on floorplan design want a native desktop experience with file system access, native menus, offline capability, and professional desktop integration. Tauri 2.0 provides this with minimal changes to the existing TypeScript/Vite codebase while keeping bundle sizes small (~5-10MB vs 100MB+ for Electron).

## What Changes

- Add Tauri 2.0 integration as a **hybrid desktop application** (like Slack/Discord)
- **Cloud Mode**: Load SolidStart web app (`floorplan-app/`) from Vercel for cloud sync
- **Offline Mode**: Load bundled `interactive-editor/` for local file editing
- Add native file save/open dialogs for `.floorplan` files
- Add native menu bar with standard File/Edit/View/Help menus
- Support auto-updates for desktop releases
- Build targets: macOS (ARM64 + x86_64), Windows (x64), Linux (x64)
- Add GitHub Actions workflow for cross-platform builds

### Hybrid Mode Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Tauri Desktop App                         │
├─────────────────────────────────────────────────────────────┤
│  Startup Mode Selection:                                     │
│  ┌─────────────────┐    ┌─────────────────────┐            │
│  │ Sign In         │    │ Work Offline        │            │
│  │ (Cloud Mode)    │    │ (Local Mode)        │            │
│  └────────┬────────┘    └──────────┬──────────┘            │
│           │                        │                         │
│  Load Vercel URL          Load bundled dist/                │
│  (floorplan-app)          (interactive-editor)              │
│           │                        │                         │
│  • Better Auth            • Native file dialogs              │
│  • Convex cloud sync      • Recent files list                │
│  • Real-time features     • Full offline support             │
└─────────────────────────────────────────────────────────────┘
```

Users can switch modes via Settings or auto-fallback when offline.

## Impact

- Affected specs: **NEW** `native-app/` capability
- Affected code:
  - `src-tauri/` (new Tauri backend)
  - `interactive-editor/` (minor: IPC hooks for native features)
  - `floorplan-app/` (minor: Tauri bridge for cloud mode) - via `add-solidstart-app`
  - `.github/workflows/` (new release workflow)
  - Root `package.json` (new scripts)

### Dependencies
- **Optional**: `add-solidstart-app` for Cloud Mode (can work without it in Offline Mode only)
