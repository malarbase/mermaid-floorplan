# Gap: UI selection isn't passed as context to the agent

**Status:** Feature — pending separate feature session.
**Area:** `floorplan-app` (chat / agent feedback flow) ↔ `floorplan-viewer-core` (selection API).
**Affects:** Any user trying to give the agent feedback like *"this stair is wrong"*, *"move this room"*, *"this wall is too short"*. Today they have to describe the element verbosely or attach a screenshot.

---

## 1. What works today

The 3D viewer **already** supports selection of multiple entity kinds. From `floorplan-viewer-core/src/scene-context.ts`:

```30:30:floorplan-viewer-core/src/scene-context.ts
export type SelectableEntityType = 'room' | 'wall' | 'connection' | 'stair' | 'lift';
```

There is a full `SelectionAPI` (see `floorplan-viewer-core/src/selection-api.ts`) with:

- `select / selectMultiple / deselect / toggleSelection / selectAll`
- `onSelectionChange(listener)` — emits `{ selection, added, removed, source }`
- `getSelection(): SelectionEntity[]` — returns plain `{ entityType, entityId, floorId }` objects (already serialization‑friendly, no Three.js refs).
- Hover preview via `highlight / clearHighlight`.

The interactive editor surface (`floorplan-viewer-core/src/interactive-editor-core.ts`) already tracks `room`, `wall`, `floor`, `connection`, `stair`, `lift` source ranges so a click can map to a specific DSL line range.

The Solid app wraps this in `floorplan-app/src/hooks/useSelection.ts`, which exposes selection as reactive signals and a `SelectionEntity[]`.

So **the plumbing exists** — the user can already click rooms / walls / connections and the system knows what was clicked.

## 2. What doesn't work today

There are two related sub‑gaps the user has flagged. They can be tackled independently.

### 2.1 Stairs aren't yet wired into the UI selection flow

`SelectableEntityType` includes `'stair'` and the editor location index emits stair entries (`floorplan-viewer-core/src/interactive-editor-core.ts` around line 295), but in practice clicking a stair in the 3D scene either:

- Doesn't pick anything, or
- Picks the stair container *room* instead of the stair element.

Things to verify in the feature session:

- Whether `SelectableObject` instances are actually being created for stair meshes in the scene graph (search for `entityType: 'stair'` set sites in `floorplan-viewer-core` and `floorplan-3d-core`).
- Whether the raycaster / picker registers stair meshes as selectable (`mesh-registry.ts`, `selection-manager.ts`).
- Whether the viewer UI's properties panel and selection‑info panel render anything for `entityType === 'stair'` and `'lift'`.

### 2.2 The selection isn't sent as agent context

Today, when the user describes a problem to the agent (chat, feedback box, "fix this" prompt, etc.), the message body is the **only** thing the agent sees. The agent does not receive:

- Which entities are currently selected in the viewer.
- The DSL source ranges of those entities.
- The floor / room / wall identifiers required to act precisely.

So when a user types *"the stair is going through the wall"* with a stair selected, the agent has to guess which stair. Today the workaround is screenshots + verbose description.

## 3. Desired behavior

When the user submits a chat / feedback message in the floorplan‑app, the request to the agent should include a structured "context" payload alongside the prose:

```ts
interface AgentRequest {
  message: string;
  // NEW: structured selection context
  selection?: SelectionContext;
}

interface SelectionContext {
  // The current 3D viewer selection (plural — already supported by the API).
  entities: Array<{
    entityType: 'room' | 'wall' | 'connection' | 'stair' | 'lift';
    entityId: string;
    floorId: string;
    // Optional: the DSL source range so the agent can locate it instantly.
    sourceRange?: { startLine: number; endLine: number };
    // Optional: a tiny structured snapshot for read-only context.
    snapshot?: Record<string, unknown>;
  }>;
  // The current floor being viewed (helps when the user means "this floor").
  activeFloorId?: string;
  // The current camera / view direction, if it disambiguates "this side".
  viewHint?: { yaw: number; pitch: number };
}
```

This payload is already 99% derivable from existing primitives:

- `entities[]` ← `SelectionAPI.getSelection()` (returns `SelectionEntity[]`).
- `sourceRange` ← already tracked per entity in `interactive-editor-core.ts`'s location index.
- `activeFloorId` ← `FloorplanContainer` / `FloorplanBase` already knows the visible floor.
- `viewHint` ← `CameraManager` (camera-manager.ts).

So the feature is mostly **wiring existing data into the chat send path**, plus making sure stair / lift picking actually works (the 2.1 sub‑gap).

## 4. Suggested implementation sketch

For the feature session, in roughly this order:

1. **Audit selection coverage in the 3D scene** — confirm every `SelectableEntityType` (especially `stair`, `lift`, `connection`) is registered with `mesh-registry.ts` so the raycaster picks them. Add coverage tests under `floorplan-app/src/test/` that simulate a click on each kind and assert `selection.getSelection()` returns the expected entity.
2. **Add a stair / lift selection visualization** — even a simple emissive outline (already supported by `BaseSelectionManager.applyHighlight`) is enough for the user to confirm they grabbed the right element.
3. **Surface selection in the editor's chat / feedback UI** — render a "Context" chip strip above the message input that shows the current selection (e.g. `[stair MainStair @ Floor 2]  [room Living @ Floor 1]`), with an `x` to drop individual chips. Use `useSelection` to drive this reactively.
4. **Ship a `buildAgentContext()` helper** — co‑locate it with the chat UI. It assembles the `SelectionContext` payload from `SelectionAPI.getSelection()`, the editor's location index (for `sourceRange`), and the active floor.
5. **Append to the agent request** — wherever the chat UI POSTs the user's message (Convex action / HTTP route / etc.), include `context` so the agent receives both prose and structure.
6. **Document the contract in `docs/agent-skill.md`** — tell the skill that incoming messages can include `selection.entities[]` and instruct it to scope its edits using those `entityId` / `sourceRange` values when present.

### Nice‑to‑haves (later)

- A keyboard shortcut to "tag" the current selection into the message (e.g. `@stair`, similar to `@file` in code editors).
- Differentiate between *primary* selection (what the user explicitly clicked) and *implicit* selection (e.g. the floor / room enclosing it). The selection API already distinguishes these via `SelectMultipleOptions.primaryEntities` and the `'primary' | 'secondary'` highlight level.
- Multi‑select via shift/ctrl click to send multiple entities at once.

## 5. Acceptance criteria

- Clicking a stair (`straight`, `L`, `U`, `spiral`) selects the stair entity (not the surrounding room) and the selection chip shows `stair <name> @ <floor>`.
- Same for lifts.
- Submitting a chat message with N entities selected delivers a `SelectionContext` payload with N entries to the agent backend; the agent can act on the named entity without further clarification (verified via an end‑to‑end test that selects a wall, asks "make this 4 ft taller", and asserts the resulting DSL diff touches only that wall's source range).
- Deselecting (clicking empty space / pressing `Escape`) removes the chips and the agent stops receiving selection context.
- Existing room / wall / connection selection flows are unchanged.

## 6. Related code

- `floorplan-viewer-core/src/selection-api.ts` — `SelectionAPI` and `BaseSelectionManager`.
- `floorplan-viewer-core/src/selection-manager.ts` — viewer‑side concrete impl.
- `floorplan-viewer-core/src/scene-context.ts` — `SelectableEntityType`, `SelectableObject`.
- `floorplan-viewer-core/src/interactive-editor-core.ts` — DSL source‑range index per entity (incl. stair / lift).
- `floorplan-viewer-core/src/mesh-registry.ts` — picker registration; verify stair / lift coverage.
- `floorplan-viewer-core/src/ui/selection-info-ui.ts` — properties panel rendering.
- `floorplan-app/src/hooks/useSelection.ts` — Solid hook exposing the selection.
- `floorplan-app/src/components/viewer/FloorplanContainer.tsx` — viewer host (active floor lives here).
- `docs/agent-skill.md` — agent contract; update once the payload shape lands.

## 7. Out of scope for this gap

- Generative UI / agent UI improvements unrelated to selection (history, branching, etc.).
- Authoring new entity kinds (furniture, fixtures) — selection should keep working as new kinds get added.
- The 3D rendering bug for stair floor holes — see [`3d-stair-floor-holes.md`](./3d-stair-floor-holes.md).
