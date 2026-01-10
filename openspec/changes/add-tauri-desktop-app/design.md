# Tauri Desktop Application - Technical Design

## Context

The mermaid-floorplan project provides:
- An `interactive-editor/` web app with Monaco editor + Three.js 3D viewer
- A `viewer/` standalone 3D viewer
- CLI tools for export operations

Users want a native desktop application for:
- Native file system integration (no browser dialogs)
- Offline usage without web server
- Professional desktop integration (dock icon, native menus)
- Auto-updates without manual downloads

### Stakeholders
- **Architects/Designers**: Want professional desktop experience
- **Power users**: Want keyboard shortcuts, native file associations
- **Developers**: Want simple build process, small bundle size

### Constraints
- Must preserve existing web functionality (progressive enhancement)
- Must work with Three.js WebGL rendering
- Must work with Monaco Editor
- Must support monorepo structure with npm workspaces

## Goals / Non-Goals

### Goals
- Package `interactive-editor/` as native desktop app
- Native file open/save dialogs for `.floorplan` files
- Native menu bar with standard keyboard shortcuts
- Cross-platform builds (macOS, Windows, Linux)
- Auto-update capability
- Small installer size (<15MB)

### Non-Goals
- Mobile app support (Tauri mobile is experimental)
- Custom native UI components (use existing web UI)
- Electron support (Tauri chosen deliberately)
- Complete offline capability for all features (OpenAI chat requires network)

## Decisions

### Decision 1: Use Tauri 2.0

**What**: Use Tauri 2.0 as the native app wrapper instead of Electron.

**Why**:
- **Bundle size**: Tauri apps are 5-15MB vs Electron's 100MB+
- **Memory**: Uses system WebView, no bundled Chromium
- **Security**: Rust backend with strict permission model
- **Modern**: Active development, good TypeScript support

**Alternatives Considered**:
- **Electron**: Industry standard but heavy (100MB+), memory-intensive
- **Capacitor**: Primarily for mobile, weaker desktop support
- **React Native (Desktop)**: Would require complete rewrite

### Decision 2: Wrap `interactive-editor/` as Primary App

**What**: Package the interactive editor as the main desktop app.

**Why**:
- Most feature-complete application in the project
- Has both Monaco editor and 3D viewer
- Supports full editing workflow

**Alternatives Considered**:
- `viewer/` only: Read-only, not suitable for primary app
- Separate desktop-specific app: Duplication, maintenance burden

### Decision 3: Use Tauri's IPC for Native Features

**What**: Use `@tauri-apps/api` for file dialogs, menus, and auto-updates.

**Why**:
- Type-safe TypeScript API
- Consistent cross-platform behavior
- Security: Frontend cannot directly access file system

**Implementation Pattern**:
```typescript
// In interactive-editor web code
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

// Feature detection - works in both web and Tauri
const isTauri = '__TAURI_INTERNALS__' in window;

async function saveFile(content: string) {
  if (isTauri) {
    const path = await save({
      filters: [{ name: 'Floorplan', extensions: ['floorplan'] }]
    });
    if (path) await writeTextFile(path, content);
  } else {
    // Web fallback: download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    // ... trigger download
  }
}
```

### Decision 4: Monorepo Structure for Tauri

**What**: Add `src-tauri/` at project root, not inside `interactive-editor/`.

**Why**:
- Tauri CLI expects `src-tauri/` at project root by default
- Allows future expansion to wrap other apps (viewer)
- Clean separation: Rust backend separate from TypeScript frontend

**Structure**:
```
mermaid-floorplan/
├── src-tauri/                 # NEW: Tauri backend
│   ├── Cargo.toml
│   ├── tauri.conf.json        # Points to interactive-editor dist
│   ├── src/
│   │   └── main.rs            # Rust entry point
│   └── icons/
├── interactive-editor/        # Existing: web frontend
│   ├── src/
│   └── dist/                  # Build output (Tauri serves this)
└── package.json               # Add tauri scripts
```

### Decision 5: Native Menu Bar Configuration

**What**: Define menus in Rust with Tauri's menu API.

**Why**:
- Native look and feel on each platform
- Proper keyboard shortcuts (Cmd vs Ctrl)
- Standard menu items (About, Preferences, Quit)

**Menu Structure**:
```
File
├── New                 Cmd/Ctrl+N
├── Open...             Cmd/Ctrl+O
├── Open Recent        →
├── ─────────────────
├── Save                Cmd/Ctrl+S
├── Save As...          Cmd/Ctrl+Shift+S
├── Export             →
│   ├── PNG
│   ├── SVG
│   └── JSON
├── ─────────────────
└── Quit                Cmd/Ctrl+Q (Windows/Linux only)

Edit
├── Undo                Cmd/Ctrl+Z
├── Redo                Cmd/Ctrl+Shift+Z
├── ─────────────────
├── Cut                 Cmd/Ctrl+X
├── Copy                Cmd/Ctrl+C
└── Paste               Cmd/Ctrl+V

View
├── Toggle 3D View      Cmd/Ctrl+3
├── Toggle 2D View      Cmd/Ctrl+2
├── ─────────────────
├── Zoom In             Cmd/Ctrl++
├── Zoom Out            Cmd/Ctrl+-
├── Reset Zoom          Cmd/Ctrl+0
└── ─────────────────
└── Toggle Fullscreen   F11

Help
├── Documentation       F1
├── Keyboard Shortcuts  Cmd/Ctrl+?
├── ─────────────────
├── Check for Updates
└── About
```

### Decision 6: GitHub Actions for Cross-Platform Builds

**What**: Use `tauri-apps/tauri-action` for automated releases.

**Why**:
- Official Tauri action with proper signing support
- Builds all platforms in parallel
- Auto-publishes to GitHub Releases

**Artifacts**:
| Platform | Format | Notes |
|----------|--------|-------|
| macOS ARM64 | `.dmg`, `.app` | Apple Silicon |
| macOS x64 | `.dmg`, `.app` | Intel Macs |
| Windows x64 | `.msi`, `.exe` | NSIS installer |
| Linux x64 | `.deb`, `.AppImage` | Debian + Universal |

## Risks / Trade-offs

### Risk 1: WebGL Performance in System WebView
- **Risk**: System WebViews may have inconsistent WebGL support
- **Mitigation**: 
  - macOS WebKit has excellent WebGL support
  - Windows WebView2 (Chromium-based) has full WebGL
  - Linux: WebKitGTK has good WebGL, document minimum version
- **Acceptance**: Document supported OS versions

### Risk 2: Monaco Editor Compatibility
- **Risk**: Monaco Editor may have quirks in non-Chromium WebViews
- **Mitigation**: 
  - Test on all platforms during development
  - Monaco is well-tested in VS Code's Electron (WebView2)
  - Fall back to simpler editor if critical issues found
- **Testing**: Early platform testing in Phase 1

### Risk 3: Code Signing Requirements
- **Risk**: macOS requires notarization, Windows needs signing for trust
- **Mitigation**:
  - macOS: Apple Developer account ($99/year) or distribute unsigned with instructions
  - Windows: Consider self-signed or unsigned initial releases
  - Document installation steps for unsigned apps
- **Decision**: Start unsigned, add signing when user base grows

### Risk 4: Auto-Update Security
- **Risk**: Auto-updates are a security-sensitive feature
- **Mitigation**:
  - Use Tauri's built-in updater with signature verification
  - Host updates on GitHub Releases (trusted source)
  - Allow manual update check only (no silent updates)

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Tauri Application                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Native Shell (Rust)                        │   │
│  │  • Window management                                          │   │
│  │  • Menu bar                                                   │   │
│  │  • File system access                                         │   │
│  │  • Auto-updater                                               │   │
│  └─────────────────────────┬────────────────────────────────────┘   │
│                            │ IPC                                     │
│  ┌─────────────────────────▼────────────────────────────────────┐   │
│  │                    WebView (Frontend)                         │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │              interactive-editor (unchanged)              │ │   │
│  │  │  • Monaco Editor                                         │ │   │
│  │  │  • Three.js 3D Viewer                                    │ │   │
│  │  │  • Langium Parser                                        │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │              Tauri Bridge (new)                          │ │   │
│  │  │  • @tauri-apps/api                                       │ │   │
│  │  │  • Feature detection (web vs native)                     │ │   │
│  │  │  • IPC handlers                                          │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
mermaid-floorplan/
├── src-tauri/                     # NEW
│   ├── Cargo.toml                 # Rust dependencies
│   ├── Cargo.lock
│   ├── build.rs                   # Build script
│   ├── tauri.conf.json            # Tauri configuration
│   ├── capabilities/              # Permission definitions
│   │   └── default.json
│   ├── icons/                     # App icons (all sizes)
│   │   ├── 32x32.png
│   │   ├── 128x128.png
│   │   ├── icon.icns              # macOS
│   │   └── icon.ico               # Windows
│   └── src/
│       ├── main.rs                # Entry point
│       ├── menu.rs                # Menu bar setup
│       └── commands.rs            # IPC command handlers
│
├── interactive-editor/
│   └── src/
│       ├── tauri-bridge.ts        # NEW: IPC wrapper
│       └── ... (existing files)
│
├── .github/workflows/
│   └── release-desktop.yml        # NEW: Build workflow
│
└── package.json                   # Add: "tauri:dev", "tauri:build"
```

### Key Interfaces

```typescript
// interactive-editor/src/tauri-bridge.ts

export interface TauriBridge {
  /** Check if running in Tauri context */
  readonly isNative: boolean;
  
  /** Show native open dialog */
  openFile(): Promise<{ path: string; content: string } | null>;
  
  /** Show native save dialog */
  saveFile(content: string, suggestedName?: string): Promise<string | null>;
  
  /** Get recently opened files */
  getRecentFiles(): Promise<string[]>;
  
  /** Add to recent files */
  addRecentFile(path: string): Promise<void>;
  
  /** Get current file path (if opened from file system) */
  getCurrentFilePath(): string | null;
}

// Usage in editor
const bridge = createTauriBridge();
if (bridge.isNative) {
  // Use native file dialogs
} else {
  // Use web fallbacks
}
```

```rust
// src-tauri/src/commands.rs

#[tauri::command]
async fn read_floorplan(path: &str) -> Result<String, String> {
    std::fs::read_to_string(path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_floorplan(path: &str, content: &str) -> Result<(), String> {
    std::fs::write(path, content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_recent_files() -> Vec<String> {
    // Read from app data
}
```

## Migration Plan

### Phase 1: Initial Setup (Week 1)
- Add Tauri to project
- Configure build for `interactive-editor`
- Test WebGL/Monaco compatibility on all platforms

### Phase 2: Native Features (Week 2)
- Implement file open/save with native dialogs
- Add recent files menu
- Implement native menu bar

### Phase 3: Polish (Week 3)
- Add app icons for all platforms
- Configure auto-updater
- Add keyboard shortcuts

### Phase 4: Release (Week 4)
- Set up GitHub Actions workflow
- Test installers on all platforms
- Publish initial release

### Rollback Plan
Tauri is additive - if issues arise:
1. Remove `src-tauri/` directory
2. Remove Tauri dependencies from `package.json`
3. Web application continues to work unchanged

## Open Questions

1. **App Name**: "Floorplan Studio"? "Mermaid Floorplan Desktop"?
   - Recommendation: "Floorplan Studio" (shorter, professional)

2. **Code Signing Budget**: Invest in Apple Developer account ($99/year)?
   - Recommendation: Skip initially, add based on user demand

3. **Auto-Update Frequency**: Check on startup? Manual only?
   - Recommendation: Check on startup, but never auto-install

4. **File Association**: Register `.floorplan` extension with OS?
   - Recommendation: Yes, makes double-click-to-open work

5. **Offline Mode**: Cache OpenAI responses? Disable AI features?
   - Recommendation: Graceful degradation - AI features show "offline" badge

## Performance Considerations

### Bundle Size Target
| Component | Size |
|-----------|------|
| Tauri runtime | ~2MB |
| WebView (system) | 0MB (uses OS) |
| App code | ~5MB |
| Monaco Editor | ~3MB |
| Three.js + assets | ~2MB |
| **Total** | **~12MB** |

### Startup Time Target
- Cold start: <2 seconds
- Warm start: <1 second
- Parser initialization: Already optimized for web

## Testing Strategy

### Unit Tests
- `tauri-bridge.test.ts`: Feature detection, IPC wrappers
- Existing tests continue to work (parser, renderer)

### Integration Tests
- File open/save round-trip
- Menu item activation
- Keyboard shortcut triggers

### Platform Tests
- Manual testing on macOS (ARM64 + x64)
- Manual testing on Windows 10/11
- Manual testing on Ubuntu 22.04

### Checklist Before Release
- [ ] WebGL renders correctly on all platforms
- [ ] Monaco Editor keyboard shortcuts work
- [ ] File save/open works with large files
- [ ] Menu items trigger correct actions
- [ ] Auto-updater can find new versions
- [ ] Installers create proper shortcuts/associations

## References

- [Tauri 2.0 Documentation](https://v2.tauri.app/)
- [Tauri + Vite Guide](https://v2.tauri.app/start/frontend/vite/)
- [Tauri GitHub Action](https://github.com/tauri-apps/tauri-action)
- [Monaco Editor in Tauri](https://github.com/nicholasq/monaco-editor-tauri-example)
- [Three.js WebGL Support](https://threejs.org/docs/#manual/en/introduction/WebGL-compatibility-check)
