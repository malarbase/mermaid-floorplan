# Tasks: Tauri Desktop Application

## 1. Project Setup

- [ ] 1.1 Install Tauri CLI (`npm install -D @tauri-apps/cli`)
- [ ] 1.2 Initialize Tauri project (`npm run tauri init`)
- [ ] 1.3 Configure `tauri.conf.json` to point to `interactive-editor/dist` (default offline mode)
- [ ] 1.4 Add Tauri scripts to root `package.json`
- [ ] 1.5 Test basic app launch on development machine

## 1b. Hybrid Mode Setup

- [ ] 1b.1 Create mode selection logic in Rust (`src/mode.rs`)
- [ ] 1b.2 Add startup modal for mode selection (Sign In / Work Offline)
- [ ] 1b.3 Configure external URL loading for Cloud Mode (SolidStart on Vercel)
- [ ] 1b.4 Implement mode persistence in app data
- [ ] 1b.5 Add network connectivity check for auto-fallback
- [ ] 1b.6 Test mode switching via Settings menu

## 2. Tauri Backend (Rust)

- [ ] 2.1 Create `src/main.rs` with window configuration
- [ ] 2.2 Create `src/menu.rs` with native menu bar
- [ ] 2.3 Create `src/commands.rs` with IPC handlers
- [ ] 2.4 Configure capabilities/permissions for file system access
- [ ] 2.5 Add file system plugin (`tauri-plugin-fs`)
- [ ] 2.6 Add dialog plugin (`tauri-plugin-dialog`)

## 3. Frontend Integration (Offline Mode)

- [ ] 3.1 Install `@tauri-apps/api` in `interactive-editor`
- [ ] 3.2 Create `tauri-bridge.ts` with feature detection
- [ ] 3.3 Implement native file open with dialog
- [ ] 3.4 Implement native file save with dialog
- [ ] 3.5 Implement recent files tracking
- [ ] 3.6 Add IPC listeners for menu events
- [ ] 3.7 Test web fallbacks work when not in Tauri

## 3b. Frontend Integration (Cloud Mode)

- [ ] 3b.1 Add Tauri bridge to `floorplan-app/` (SolidStart) - depends on add-solidstart-app
- [ ] 3b.2 Detect Tauri environment in SolidStart
- [ ] 3b.3 Wire native menu events to SolidStart actions
- [ ] 3b.4 Implement hybrid save (cloud + local export option)
- [ ] 3b.5 Test auth flow works in Tauri WebView

## 4. Native Menu Implementation

- [ ] 4.1 Implement File menu (New, Open, Save, Save As, Export)
- [ ] 4.2 Implement Edit menu (Undo, Redo, Cut, Copy, Paste)
- [ ] 4.3 Implement View menu (toggle views, zoom controls)
- [ ] 4.4 Implement Help menu (docs, shortcuts, about)
- [ ] 4.5 Wire menu events to frontend actions
- [ ] 4.6 Test keyboard shortcuts on macOS
- [ ] 4.7 Test keyboard shortcuts on Windows/Linux

## 5. App Icons and Branding

- [ ] 5.1 Design app icon (1024x1024 source)
- [ ] 5.2 Generate icon sizes for all platforms
- [ ] 5.3 Create `.icns` for macOS
- [ ] 5.4 Create `.ico` for Windows
- [ ] 5.5 Update `tauri.conf.json` with app metadata (name, version, identifier)

## 6. Auto-Updater

- [ ] 6.1 Add updater plugin (`tauri-plugin-updater`)
- [ ] 6.2 Configure update endpoint (GitHub Releases)
- [ ] 6.3 Implement update check on startup
- [ ] 6.4 Add "Check for Updates" menu item
- [ ] 6.5 Test update flow with draft release

## 7. Platform Testing

- [ ] 7.1 Test on macOS ARM64 (Apple Silicon)
- [ ] 7.2 Test on macOS x64 (Intel)
- [ ] 7.3 Test on Windows 10/11
- [ ] 7.4 Test on Ubuntu 22.04 (or similar Linux)
- [ ] 7.5 Verify WebGL rendering on each platform
- [ ] 7.6 Verify Monaco Editor on each platform
- [ ] 7.7 Document any platform-specific issues

## 8. CI/CD Setup

- [ ] 8.1 Create `.github/workflows/release-desktop.yml`
- [ ] 8.2 Configure matrix build for all platforms
- [ ] 8.3 Set up artifact upload to GitHub Releases
- [ ] 8.4 Configure update manifest generation
- [ ] 8.5 Test workflow with draft release
- [ ] 8.6 Document release process in README

## 9. Documentation

- [ ] 9.1 Add desktop app section to main README
- [ ] 9.2 Document installation steps for each platform
- [ ] 9.3 Document keyboard shortcuts
- [ ] 9.4 Document known limitations
- [ ] 9.5 Add troubleshooting section (unsigned app warnings)

## 10. Final Validation

- [ ] 10.1 Full workflow test (Offline Mode): create, edit, save, reopen
- [ ] 10.2 Full workflow test (Cloud Mode): sign in, create, sync, sign out
- [ ] 10.3 Test mode switching: Offline → Cloud → Offline
- [ ] 10.4 Test auto-fallback: disconnect network in Cloud Mode
- [ ] 10.5 Test with complex multi-floor floorplan
- [ ] 10.6 Verify bundle size meets target (<15MB)
- [ ] 10.7 Verify startup time meets target (<2s)
- [ ] 10.8 Create and test release installers
