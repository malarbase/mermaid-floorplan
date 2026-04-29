## Why

Three rendering defects were discovered and fixed in the 3D viewer across stair
geometry, wall joints, and door CSG holes:

1. **Sawtooth stair shimmer** — per-step tread/riser boxes caused visible seam shimmer
   on oblique camera angles because adjacent mesh faces overlapped at the X-axis boundary.

2. **T-junction wall bump** — horizontal wall segments incorrectly extended past shared
   vertical boundaries, producing an outward bump at T-junctions (e.g. a corridor wall
   protruding into an adjacent room's wall face).

3. **Misaligned door CSG holes** — `createConnectionHole` computed the hole position as a
   raw percentage of the source room's full wall length rather than within the shared
   overlap between the two connected rooms. This caused door holes to land outside the
   wall segment for rooms whose origin differs from the corridor (e.g. Linen, Closets,
   Mech), and `filterHolesForSegment` silently discarded them, leaving walls solid.

Alongside these fixes, stair and room annotation quality was improved: room name + area
labels were unified into a single CSS2DObject per room (eliminating accidental overlap),
and two new annotation overlays were added — per-stair info labels (name, step count,
rise) and per-stair dimension labels (width × depth).

## What Changed

- **Sawtooth stair geometry**: replaced per-step `BoxGeometry` tread/riser meshes with a
  single `ExtrudeGeometry` sawtooth flight for closed-stringer stairs; added
  `SOFFIT_THICKNESS` constant (150 mm) and `buildSawtoothFlight()` helper; open and glass
  stringers retain per-step meshes; added unit tests (`stair-sawtooth.test.ts`)

- **T-junction wall fix**: added `hasContinuousWallAt()` in new `wall-ownership.ts`
  to detect shared vertical boundaries; wired into `adjustSegmentsForCorners` in
  `wall-builder.ts` so horizontal segments do not extend at T-joints

- **Door CSG hole fix**: in `createConnectionHole` (`wall-builder.ts`), imported
  `calculatePositionWithFallback` and `RoomBounds` from `floorplan-common`, looked up
  `targetRoom`, and replaced raw `sourceRoom.height * ratio` math with the overlap-aware
  call — matching the formula used by `connection-geometry.ts` for door mesh positions

- **Merged room labels**: replaced separate `roomNameLabels` / `areaLabels` arrays with a
  single `CSS2DObject` per room using `.room-label__name` and `.room-label__area` children,
  toggled independently via CSS class state

- **Stair info annotations**: new `showStairInfo` toggle renders a per-stair label
  showing name, step count, and rise (`AnnotationManager.updateStairInfoAnnotations()`);
  wired into all three viewer entry points

- **Stair dimension annotations**: new `showStairDimensions` toggle renders a per-stair
  `w × d` overlay (`AnnotationManager.updateStairDimensionAnnotations()`); wired into
  vanilla-JS UI, SolidJS ControlPanels, and floorplan-viewer

- **Sample file**: added `ImprovedTriplexVilla.floorplan` demonstrating the fixed rendering

- **Gap doc**: registered `language-primitive-registry-codegen` in `docs/gaps/README.md`

- **Type fixes** in `floorplan-app`: added `skipLibCheck`, corrected `Id<'users'>` casts
  and JSX expression in `admin/users.tsx`

## Capabilities

- **Modified**: `3d-viewer` — stair sawtooth geometry, T-junction wall fix, door CSG hole
  fix, merged room labels, stair info + dimension annotation overlays

## Impact

- **floorplan-3d-core**: `stair-geometry.ts` (new sawtooth extrusion path),
  `wall-builder.ts` (T-junction + door hole fixes), `wall-ownership.ts` (new file)
- **floorplan-viewer-core**: `annotation-manager.ts` (merged labels, new annotation
  overlay methods), `annotation-controls-ui.ts`, `shared-styles.css`, `styles.ts`
- **floorplan-app**: `ControlPanels.tsx`, `admin/users.tsx`, `tsconfig.json`
- **floorplan-viewer**: `main.ts`
- **Sample data**: new `ImprovedTriplexVilla.floorplan`
