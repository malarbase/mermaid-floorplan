## Why

The floorplan DSL supports custom segmented stairs (composed of `flight` and `landing` segments with turn directions) and sub-rooms nested inside parent rooms via `composed of [...]`. However, the 3D stair generator used a Vector3-based coordinate tracking approach that diverged from the 2D SVG renderer's scalar tracking, causing misalignment between 2D and 3D renders for custom segmented stair shapes. Additionally, the connection renderer and validator did not handle nested sub-rooms: connections between a parent room and its child sub-rooms would fail validation because they don't share wall segments explicitly, and the renderer couldn't resolve absolute positions for nested rooms.

This change aligns the 3D stair coordinate tracking with the 2D renderer, adds sub-room connection support to the renderer and validator, improves the static analysis critic for custom stairs, and adds documentation for floorplan alignment workflows and tooling improvements.

## What Changes

### 1. 3D Stair Geometry Coordinate Tracking

- **Refactored `StairGenerator`** in `floorplan-3d-core/src/stair-geometry.ts`
  - Replaced `THREE.Vector3`-based position tracking with scalar `currentX`/`currentY` (mapped to 3D X/Z) to exactly match the 2D SVG renderer's trace accumulation
  - Fixed custom segmented stair (`shape: custom` with `segments` array) coordinate computation so flight and landing segments accumulate positions correctly
  - Added `applyTurn` helper for clockwise/counter-clockwise direction changes
  - Updated bounding box normalization to match traced boundaries instead of simple width/height

### 2. Sub-Room Connection Renderer

- **Added `RoomFindResult` interface** and **`findRoomAndParent()`** function in `floorplan-language/src/diagrams/floorplans/connection.ts`
  - Recursively searches rooms and their `subRooms` to locate a room by name and identify its parent
- **Refactored `getRoomPosition` → `getAbsoluteRoomPosition`**
  - Computes absolute coordinates for nested sub-rooms by recursively adding parent offsets
- **Updated `generateConnection()`** to use absolute positions for both endpoints
  - Connections between parent and child rooms now render correctly

### 3. Validator Parent-Child Connection Support

- **Added parent-child relationship mapping** in `floorplan-language/src/floorplans-validator.ts`
  - Built `parentMap` from sub-room declarations during connection validation
- **Updated shared-segment check** to allow connections between parent rooms and their child sub-rooms
  - Previously rejected because parent-child rooms don't have explicit shared wall segments
  - Now recognizes `isParentChild` as a valid connection case alongside shared-segment connections

### 4. Critic Custom Stair Footprint

- **Added custom segmented stair footprint computation** in `skills/mermaid-floorplan/scripts/_critic/geometry.mjs`
  - Implemented coordinate tracing for `flight` and `landing` segments with direction turn handling
  - Re-adjusted bounding box to match exact traced boundaries for custom stair shapes

### 5. Skill Documentation Improvements

- **Updated `skills/mermaid-floorplan/SKILL.md`**
  - Clarified that script commands must be prefixed with `skills/mermaid-floorplan/scripts/`
  - Added wall type guidance (`solid` for structural, `open` for passages, `window` for glazing)
  - Added fallback instructions for hand-editing `.floorplan` files when modify script fails

### 6. Workspace Configuration

- **Added `work/` to `.gitignore`** for temporary workspace files
- **Symlinked `.agents/skills/mermaid-floorplan/`** to `skills/mermaid-floorplan/` for AI harness workspace convenience

### 7. Floorplan Documentation

- **Added `docs/aligned_floorplan_walkthrough.md`** — walkthrough for aligning floor plan layouts with target images
- **Added `docs/floorplan_improvement_report.md`** — report on structural and semantic floorplan improvements with verification benchmarks

## Capabilities

### New Capabilities

- `custom-segmented-stair-3d` — Custom stair shapes with `flight`/`landing` segments render correctly in 3D with coordinate tracking aligned to 2D renderer
- `sub-room-connections` — Connections between parent rooms and their nested sub-rooms are supported in renderer and validator

### Modified Capabilities

- `floorplan-language`: Connection rendering supports nested sub-room absolute position resolution
- `floorplan-validator`: Connection validation allows parent-child room connections without shared wall segments
- `mermaid-floorplan-skill`: Script path prefixes, wall type guidance, and fallback editing documented
- `stair-geometry-3d`: Coordinate tracking uses scalar accumulation matching 2D renderer

## Impact

- **Files**: `floorplan-3d-core/src/stair-geometry.ts`, `floorplan-language/src/diagrams/floorplans/connection.ts`, `floorplan-language/src/floorplans-validator.ts`, `skills/mermaid-floorplan/SKILL.md`, `skills/mermaid-floorplan/scripts/_critic/geometry.mjs`, `.gitignore`, `.agents/skills/mermaid-floorplan`, `docs/aligned_floorplan_walkthrough.md`, `docs/floorplan_improvement_report.md`
- **APIs**: No external API changes
- **Dependencies**: No new dependencies
- **Risk**: Low — changes are localized to stair geometry, connection rendering, and validation logic; no breaking changes to existing floorplan syntax
