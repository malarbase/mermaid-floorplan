# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-01-12

### Added
- **Hierarchical Editor Selection**: Selecting a parent entity (floor or room) in the Monaco editor now automatically selects its children in the 3D viewer
  - Floor-level selection expands to all rooms and walls on that floor
  - Room-level selection expands to room mesh and all 4 walls
  - Wall/connection selection selects only that specific entity
- **Breadcrumb Context Display**: Shows hierarchy context (e.g., "Kitchen › top wall") in the editor when selecting walls
- **Secondary Selection Visual**: Hierarchical children show same green outline but without emissive glow to indicate they're selected but not focused
- **Distinct Hover Highlight**: Cyan color for hover preview vs green for selection

### Changed
- **Package Naming**: Standardized all packages with `floorplan-` prefix for consistency
- **Keyboard Shortcuts**: Monaco editor now properly receives keyboard shortcuts (e.g., Cmd+A) without being captured by 3D viewer

### Fixed
- Floor source range tracking for proper floor-level selection
- Keyboard shortcut bypass when Monaco editor has focus

## [0.8.0] - Previous Release

See individual package changelogs for earlier history.
