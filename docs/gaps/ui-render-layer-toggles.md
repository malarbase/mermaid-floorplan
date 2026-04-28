# Gap: Render-layer toggles (walls / floors / stairs / lifts / connections) aren't exposed in the UI

**Status:** Feature — pending UI session.
**Area:** `floorplan-3d-core` (scene builder already supports it) ↔ `floorplan-viewer-core` / `floorplan-viewer` / `floorplan-editor` / `floorplan-app` (no UI surface yet).
**Affects:** Anyone who wants to inspect interior structure without removing whole floors. Today the only "see through" affordance is per‑floor visibility (Floors panel) and the Exploded View slider — neither of which can, for example, hide just the walls so you can examine the slabs and stairs underneath.

---

## 1. What works today

The shared scene builder already accepts per‑element visibility flags. From the consolidated core:

```37:54:floorplan-3d-core/src/scene-builder.ts
export interface SceneBuildOptions extends SceneBuildHooks {
  /** Which floors to render (undefined = all) */
  floorIndices?: number[];
  /** Theme for default colors */
  theme?: ViewerTheme;
  /** Vertical spacing between floors (default: calculated from heights) */
  floorSpacing?: number;
  /** Show floor slabs (default: true) */
  showFloors?: boolean;
  /** Show walls (default: true) */
  showWalls?: boolean;
  /** Show connections (doors/windows) (default: true) */
  showConnections?: boolean;
  /** Show stairs (default: true) */
  showStairs?: boolean;
  /** Show lifts (default: true) */
  showLifts?: boolean;
}
```

These are honored by `buildFloorplanSceneFromNormalized` and therefore by every consumer (`floorplan-viewer`, `floorplan-editor`, `floorplan-app`, and the headless `floorplan-mcp-server` / `make export-3d*` CLI). The headless renderer already plumbs them through:

```315:322:floorplan-mcp-server/src/utils/puppeteer-renderer.ts
      const sceneOptions = {};
      if (options.showFloors !== undefined) sceneOptions.showFloors = options.showFloors;
      if (options.showWalls !== undefined) sceneOptions.showWalls = options.showWalls;
      if (options.showStairs !== undefined) sceneOptions.showStairs = options.showStairs;
      if (options.showLifts !== undefined) sceneOptions.showLifts = options.showLifts;
      if (options.showConnections !== undefined) sceneOptions.showConnections = options.showConnections;
```

The viewer core exposes `floorGroups: Map<string, THREE.Group>` (one group per floor) and emits well‑named meshes via callbacks (`floor_slab_<room>`, wall‑segment meshes via `onWallMesh`, `stair_<name>` / `lift_<name>` via `onStair/LiftMesh`). All the data needed to drive a fast, no‑rebuild visibility toggle is in place.

## 2. What doesn't work today

There is no UI in `floorplan-viewer`, `floorplan-editor`, or `floorplan-app` to flip these flags. The View section currently has just two controls:

```432:478:floorplan-viewer/src/main.ts
const viewSection = createControlPanelSection({
  title: 'View',
  id: 'view-section',
  collapsed: true,
});
// ... only Theme toggle + Exploded View slider live in here today.
```

Concretely:

- A user who wants to see how the slabs and stairs interact has to either hide whole floors (loses context) or lean on the Exploded View (good for separation, doesn't peek inside).
- Demo / screenshot workflows that the headless renderer already supports (e.g. "walls hidden so the cutouts are obvious") aren't reachable from the interactive apps.
- Debugging UX issues (e.g. is the slab cutout missing, or is it just hidden by a wall?) requires editing the DSL or using `make export-3d*`.

## 3. Desired behavior

Add a "Layers" sub‑group inside the existing **View** section (next to Theme / Exploded View — same panel, no new top‑level section). Five checkboxes, all default‑on:

| Label | Backing flag |
|---|---|
| Floors | `showFloors` |
| Walls | `showWalls` |
| Doors & windows | `showConnections` |
| Stairs | `showStairs` |
| Lifts | `showLifts` |

Toggling a checkbox should hide / show all meshes of that kind across all visible floors. Per‑floor visibility (existing Floors panel) and per‑layer visibility (new) compose: a slab is rendered iff its floor is on **and** Floors layer is on.

## 4. Suggested implementation sketch

Two viable approaches; recommend the second.

### 4.1 Rebuild on toggle (simple, but heavy)

Re‑invoke `BaseViewer.loadFloorplan(currentFloorplanData)` with the new `SceneBuildOptions` whenever a checkbox changes. Pros: zero new state. Cons: every toggle triggers a full CSG rebuild (slabs + walls), which on `StairsAndLifts.floorplan` and `ImprovedTriplexVilla.floorplan` is noticeable, and it would invalidate selection / hover state.

### 4.2 Toggle `.visible` on existing meshes (recommended)

Walk `floorGroups` once per toggle. The mesh names are predictable and already documented by the scene builder:

- Slabs: `THREE.Group` named `floor_slabs_<floorId>`, each child mesh `floor_slab_<roomName>`.
- Walls: meshes added to the floor group via `WallBuilder.generateWall`. Today they are flat in the floor group — add a `userData.layer = 'wall'` tag inside the core, or wrap them in a `THREE.Group` named `walls_<floorId>`. Either works; the wrapper is easier to toggle.
- Connections (when walls are off): `THREE.Group` from `generateFloorConnections`.
- Stairs: child group `stair_<name>` (already named).
- Lifts: child group `lift_<name>` (already named).

So the work is:

1. **Stamp a `userData.layer` on every emitted mesh / group** in `floorplan-3d-core/src/scene-builder.ts` (low‑risk; backward compatible). Layers: `'floor' | 'wall' | 'connection' | 'stair' | 'lift'`.
2. **Add a `LayerVisibilityManager`** in `floorplan-viewer-core/src/` (sibling of `floor-manager.ts`). API: `setLayerVisible(layer, visible)`, `isLayerVisible(layer)`, plus an init that walks `BaseViewer._floors` and indexes children by `userData.layer`. Re‑run on `loadFloorplan` (after `onFloorplanLoaded`).
3. **Surface in the apps:**
   - `floorplan-viewer/src/main.ts` — append a `Layers` block inside the existing View section (same `viewContent`).
   - `floorplan-app/src/components/viewer/ControlPanels.tsx` — same control, Solid version.
   - The standalone `floorplan-editor` inherits via `FloorplanUI` shared controls.
4. **Headless parity** — make sure the `make export-3d*` CLI gets matching `--show-walls=false` / `--show-floors=false` flags so the scripts can produce the same screenshots the UI now permits. The renderer already accepts the underlying options; only the `scripts/generate-3d-images.ts` flag wiring is missing.

## 5. Acceptance criteria

- Inside the View panel, a Layers group renders five checkboxes (Floors / Walls / Doors & windows / Stairs / Lifts), all default‑on.
- Toggling any one hides only that element class; other elements remain visible. Per‑floor visibility from the Floors panel still composes correctly (hidden floors stay hidden; visible floors respect the layer toggles).
- Selecting a stair, then hiding the Stairs layer, gracefully clears the selection (or hides its outline) — no orphaned highlight rings.
- The CLI exposes equivalent flags (`--show-walls`, `--show-floors`, `--show-stairs`, `--show-lifts`, `--show-connections`); a regression test renders a Roof‑only PNG with `--show-walls=false --show-floors=false` and asserts it matches a fixture.
- Loading a new floorplan (drag‑drop, DSL edit, file open) preserves the user's layer toggles.

## 6. Out of scope

- Per‑floor layer toggles (e.g. "hide walls only on Penthouse"). The current Floors panel covers per‑floor on/off; per‑floor‑per‑layer is a future enhancement and would warrant a matrix UI.
- Per‑element opacity / X‑ray rendering — different feature; the scene builder doesn't expose a "ghost" mode today.
- Hiding annotations (room labels, dimensions) — already covered by the existing Annotations section.
- Selection plumbing for stairs / lifts — see [`ui-selection-agent-context.md`](./ui-selection-agent-context.md), §2.1.

## 7. Related code

- `floorplan-3d-core/src/scene-builder.ts` — `SceneBuildOptions` (lines 37‑54), the show‑* flags consumed at build time.
- `floorplan-3d-core/src/floor-geometry.ts` — emits `floor_slab_<room>` meshes.
- `floorplan-3d-core/src/wall-builder.ts` — emits wall‑segment meshes via the `onWallMesh` hook.
- `floorplan-3d-core/src/stair-geometry.ts` — emits `stair_<name>` and `lift_<name>` groups.
- `floorplan-viewer-core/src/floor-manager.ts` — pattern to mirror for a `LayerVisibilityManager`.
- `floorplan-viewer/src/main.ts` (lines 432‑478) — current View section; add Layers checkboxes here.
- `floorplan-app/src/components/viewer/ControlPanels.tsx` — Solid mirror for the standalone web app.
- `floorplan-mcp-server/src/utils/puppeteer-renderer.ts` (lines 315‑322) — already plumbs the flags through; CLI flag wiring lives in `scripts/generate-3d-images.ts`.
