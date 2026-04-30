# Gap: Language primitive lifecycle is not connected to editor UI, annotations, or renderer hooks

**Status:** Architectural gap - needs proposal/planning before implementation.  
**Area:** `floorplan-language` <-> `floorplan-viewer-core` <-> `floorplan-editor` <-> `floorplan-app` <-> `skills/mermaid-floorplan`.  
**Affects:** Any language change that adds a primitive, field, shape variant, computed value, annotation, or renderer behavior. Today the grammar can evolve without the editor, annotation controls, 3D labels, renderer hooks, and agent skill evolving with it.

---

## Symptom

The floorplan DSL has grown into a real language surface: `floor`, `room`, `sub-room`, `wall`, `connection`, `stair`, `lift`, vertical connections, styles, config, computed metrics, 2D output, and 3D output. But the lifecycle for adding a language capability is still mostly manual.

The result is drift:

- A primitive gains new syntax, but the Add/Edit UI only exposes a subset of fields.
- A computed value is useful to users, but annotation controls need hand wiring in several files.
- A renderer implementation changes, but related metadata, labels, property panels, docs, and agent skill guidance lag behind.
- Agents need to remember project-specific UX defaults from context rather than from a durable capability contract.

The recent room-label and stair-annotation work shows the problem in miniature: one capability fans out into annotation state, update methods, DOM/CSS classes, vanilla controls, Solid controls, app wiring, and skill/process docs.

---

## Where it lives

The grammar already contains enough structure to bootstrap baseline primitive metadata. For example, `Room` exposes coordinates, dimensions, height, elevation, walls, relative positioning, label, composed sub-rooms, and style:

```124:146:floorplan-language/src/diagrams/floorplans/floorplans.langium
Floor:
    'floor' id=ID ('height' height=ValueWithUnit)? '{' 
        rooms+=Room*
        stairs+=Stair*
        lifts+=Lift*
    '}';

// Room definition
// Position can be explicit (at x,y) OR relative (right-of RoomA)
// Both can optionally be present, but at least one is required for rendering
// Size can be an inline dimension or a variable reference
Room:
    type=('room' | 'sub-room') name=ID 
    ('at' position=Coordinate)?
    'size' (size=Dimension | sizeRef=ID)
    ('height' height=ValueWithUnit)?
    ('elevation' elevation=SignedValueWithUnit)?
    'walls' walls=WallSpec
    relativePosition=RelativePosition?
    ('label' label=STRING)?
    ('composed' 'of' '[' subRooms+=Room* ']')?
    ('style' styleRef=ID)?;
```

Stairs are even richer: shape variants, dimensions, code-related fields, handrails, stringers, material, relative positioning, label, and style:

```228:244:floorplan-language/src/diagrams/floorplans/floorplans.langium
Stair:
    'stair' name=ID
    ('at' position=Coordinate)?
    'shape' shape=StairShape
    'rise' rise=ValueWithUnit
    ('width' width=ValueWithUnit)?
    ('riser' riser=ValueWithUnit)?
    ('tread' tread=ValueWithUnit)?
    ('nosing' nosing=ValueWithUnit)?
    ('headroom' headroom=ValueWithUnit)?
    ('handrail' '(' handrail=HandrailSpec ')')?
    ('stringers' stringers=StringerStyle)?
    ('material' material=StairMaterial)?
    relativePosition=RelativePosition?
    ('label' label=STRING)?
    ('style' styleRef=ID)?;
```

But the Add Room dialog only collects a narrow hand-coded subset:

```256:268:floorplan-viewer-core/src/ui/solid/FloorplanUI.tsx
interface AddRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (room: { name: string; x: number; y: number; width: number; height: number }) => void;
  existingNames?: Set<string>;
}

function AddRoomDialog(props: AddRoomDialogProps) {
  const [name, setName] = createSignal('');
  const [x, setX] = createSignal('0');
  const [y, setY] = createSignal('0');
  const [width, setWidth] = createSignal('4');
  const [height, setHeight] = createSignal('4');
```

And the DSL insertion path hard-codes a single room template rather than delegating to a primitive descriptor / serializer:

```385:391:floorplan-editor/src/main.ts
      // Generate room DSL
      const roomDsl = `    room ${room.name} at (${room.x}, ${room.y}) size (${room.width} x ${room.height}) walls [top: solid, right: solid, bottom: solid, left: solid]\n  `;

      // Insert the room
      const newContent =
        currentContent.slice(0, insertIndex) + roomDsl + currentContent.slice(insertIndex);
      dslEditor.setValue(newContent);
```

Annotations have the same manual fan-out. State and controls are explicit fields:

```13:22:floorplan-viewer-core/src/annotation-manager.ts
// Annotation state
export interface AnnotationState {
  showRoomName: boolean;
  showArea: boolean;
  showDimensions: boolean;
  showFloorSummary: boolean;
  showStairInfo: boolean;
  areaUnit: AreaUnit;
  lengthUnit: LengthUnit;
}
```

And each annotation implementation currently owns its own DOM construction and placement:

```258:287:floorplan-viewer-core/src/annotation-manager.ts
  public updateRoomLabels(): void {
    const floors = this.callbacks.getFloors();
    const floorplanData = this.callbacks.getFloorplanData();

    this.roomLabels.forEach((label) => {
      label.parent?.remove(label);
      label.element.remove();
    });
    this.roomLabels = [];

    if (!this.state.showRoomName && !this.state.showArea) return;
    if (!floorplanData) return;

    floorplanData.floors.forEach((floor, floorIndex) => {
      floor.rooms.forEach((room) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'room-label';

        if (this.state.showRoomName) {
          const nameEl = document.createElement('div');
          nameEl.className = 'room-label__name';
          nameEl.textContent = room.label ?? room.name;
          wrapper.appendChild(nameEl);
        }

        if (this.state.showArea) {
          const areaEl = document.createElement('div');
          areaEl.className = 'room-label__area';
          areaEl.textContent = this.formatArea(room.width * room.height);
```

---

## Root cause hypotheses

The repo has a grammar source of truth, generated AST types, JSON conversion, 2D rendering, 3D rendering, viewer UI, editor UI, annotations, and agent skills, but no shared contract that says:

- What primitive fields exist?
- Which fields should be exposed in create/edit UI?
- Which fields have defaults, constraints, labels, tooltips, grouping, or "advanced" visibility?
- Which metadata fields are direct vs computed?
- Which metadata fields can appear in labels, summaries, property panels, or agent context?
- Which renderer hooks are required when a primitive or field changes?
- Which parts are inferred from syntax and which parts are curated by the project?

Langium grammar can answer syntax questions, but not product/UX questions. A generated AST can tell us that `handrail` is an enum-like field, but not whether it belongs in a basic form, an advanced section, a stair-code group, or an annotation summary.

---

## Desired architecture

Introduce a build-time **primitive capability registry** with two layers:

1. **Generated baseline** from `floorplans.langium`.
2. **Hand-authored overlay** for project semantics, defaults, computed metadata, annotations, and renderer hooks.

The effective descriptor is produced by merging the two:

```text
floorplans.langium
  -> generated primitive descriptor
  + authored primitive overlay
  -> effective primitive capabilities
  -> editor forms, property panels, annotations, renderer stubs, docs, tests
```

The generated baseline should be boring and comprehensive. The authored overlay should be where judgment lives.

### Generated baseline

From grammar alone, the generator can infer first-pass field descriptors:

| Grammar shape | Generated field/control |
| --- | --- |
| `STRING` | text input |
| `NUMBER` | number input |
| `BOOLEAN` | checkbox |
| literal union / terminal alternatives | select dropdown |
| `+=` repeated values | repeated rows / multiselect candidate |
| `?` optional fields | optional / advanced-capable field |
| `Coordinate` | composite X/Y coordinate control |
| `Dimension` | composite width/height control |
| `ValueWithUnit` | number + unit control |
| references like `RoomReference` / `ID` in a reference position | symbol autocomplete candidate |

This gives every new primitive or field a default UI stub and default descriptor entry immediately after grammar generation.

### Authored overlay

The overlay customizes the generated baseline:

- Hide fields from create UI while keeping them editable in the DSL.
- Group fields into Basic / Geometry / Walls / Accessibility / Advanced.
- Add labels, help text, examples, placeholder values, and validation hints.
- Pick better controls than the default, such as slider vs number input or stepper vs freeform number.
- Set sane min/max/step values.
- Supply defaults that are not encoded in grammar.
- Mark fields as version-gated or deprecated.
- Add computed metadata fields like room area, stair step count, stair footprint, floor efficiency, or code-compliance hints.
- Add annotations that reference direct and computed metadata.
- Define renderer hooks and generated TODO stubs for renderer-impacting fields.

The project skill should reinforce this overlay layer. It should not be the only source of truth, but it can document conventions that grammar cannot infer: preferred defaults, regional assumptions, stair-code expectations, which controls belong in "advanced", and what to check when new capabilities are added.

---

## Descriptor shape

A plausible TypeScript shape:

```ts
interface PrimitiveDescriptor<TAst = unknown, TJson = unknown> {
  kind: string;
  label: string;
  description?: string;
  version?: { introduced: string; deprecated?: string };

  fields: FieldDescriptor[];
  createForm?: FormDescriptor;
  editForm?: FormDescriptor;

  defaults?: Record<string, unknown>;
  toJson?: (ast: TAst, ctx: ConvertContext) => TJson;
  toDsl?: (value: TJson, ctx: DslEmitContext) => string;

  metadata?: MetadataDescriptor<TJson>[];
  annotations?: AnnotationDescriptor<TJson>[];

  render2d?: RendererHook<TJson>;
  render3d?: RendererHook<TJson>;
  bounds?: BoundsProvider<TJson>;
  anchors?: AnchorProvider<TJson>;
}

interface FieldDescriptor {
  name: string;
  syntaxPath: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'dimension' | 'coordinate' | 'valueWithUnit' | 'reference' | 'list' | 'object';
  required: boolean;
  control?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'multiselect' | 'slider' | 'stepper' | 'composite' | 'autocomplete';
  label?: string;
  help?: string;
  group?: string;
  advanced?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  generated?: boolean;
}
```

The important part is not the exact interface. The important part is that the repo gains a durable contract that each primitive can carry through the implementation lifecycle.

---

## Metadata and annotations

Annotations should become descriptors over direct/computed metadata rather than one-off UI features.

Example:

```ts
const roomDescriptor = {
  kind: 'room',
  metadata: [
    { id: 'displayName', source: 'direct', value: (room) => room.label ?? room.name },
    { id: 'area', source: 'computed', value: (room) => room.width * room.height, format: 'area' },
    { id: 'dimensions', source: 'computed', value: (room) => [room.width, room.height], format: 'dimensions' },
  ],
  annotations: [
    {
      id: 'roomLabel',
      label: 'Show Room Names',
      fields: ['displayName'],
      defaultVisible: true,
      anchor: 'roomCenterAbove',
      className: 'room-label',
    },
    {
      id: 'roomArea',
      label: 'Show Room Areas',
      fields: ['area'],
      defaultVisible: false,
      anchor: 'roomCenterAbove',
      className: 'room-label__area',
    },
  ],
};
```

For stairs:

```ts
const stairDescriptor = {
  kind: 'stair',
  metadata: [
    { id: 'displayName', source: 'direct', value: (stair) => stair.label ?? stair.name },
    { id: 'stepCount', source: 'computed', value: computeStairStepCount },
    { id: 'rise', source: 'direct', format: 'length' },
  ],
  annotations: [
    {
      id: 'stairInfo',
      label: 'Show Stair Info',
      fields: ['displayName', 'stepCount', 'rise'],
      defaultVisible: false,
      anchor: 'stairOriginAbove',
      className: 'stair-info-label',
    },
  ],
};
```

With this shape, the annotation control panel can render annotation descriptors, the annotation manager can dispatch per-primitive label updates, and tests can assert every annotation descriptor has a state key, default value, label renderer, and control.

---

## Entity bridge

The primitive registry defines what each primitive can do. The **entity bridge** defines how one concrete primitive instance is found across every representation of the plan:

```text
DSL source node
  -> generated AST node
  -> JSON export entity
  -> rendered Object3D / mesh group
  -> selection state
  -> contextual UI actions
  -> targeted DSL edit
```

This bridge is what makes the registry useful inside the editor. Without it, descriptors can generate forms and annotation controls, but the app still cannot confidently answer questions like:

- "Which 3D object corresponds to the cursor's current DSL line?"
- "Which DSL range should be edited when the user clicks this wall?"
- "What actions should appear for this selected stair?"
- "Can I duplicate this room/floor using the primitive's serializer?"
- "What context should be sent to an agent when the user says 'fix this'?"

### Current partial bridge

There is already a partial source-to-scene bridge. `InteractiveEditorCore` tracks entity locations:

```31:40:floorplan-viewer-core/src/interactive-editor-core.ts
/**
 * Entity location information for DSL <-> 3D sync.
 * Maps entity names to their source locations in the DSL.
 */
export interface EntityLocation {
  name: string;
  type: 'room' | 'wall' | 'floor' | 'connection' | 'stair' | 'lift';
  floorId: string;
  sourceRange?: SourceRange;
}
```

`MeshRegistry` maps rendered objects back to selectable entities:

```32:40:floorplan-viewer-core/src/mesh-registry.ts
/**
 * Bidirectional registry mapping entities to meshes and vice versa.
 */
export class MeshRegistry {
  /** Map from entity key string to registry entry */
  private entityToMeshes = new Map<string, RegistryEntry>();

  /** Map from mesh UUID to entity key string */
  private meshToEntity = new Map<string, string>();
```

The editor already uses the mesh registry to select a 3D entity from a DSL cursor/entity key:

```406:424:floorplan-editor/src/main.ts
  // Handle editor cursor -> 3D selection (simple mode)
  editorSync.onEditorSelect((entityKey, isAdditive) => {
    const parts = entityKey.split(':');
    if (parts.length !== 3) return;

    const [floorId, entityType, entityId] = parts;
    const registry = editorCore.meshRegistry;
    const entities = registry.getAllEntities();

    for (const entity of entities) {
      if (
        entity.floorId === floorId &&
        entity.entityType === entityType &&
        entity.entityId === entityId
      ) {
        selectionManager.select(entity, isAdditive);
        break;
      }
    }
  });
```

But the bridge is not yet complete:

- `floor` exists in `EntityLocation`, but `SelectableEntityType` does not include it, so floors are not first-class selectable entities.
- `BaseViewer` currently wires room/wall registry hooks, while stairs/lifts/floors are only partially surfaced through scene-builder hooks and entity locations.
- Entity IDs are hand-constructed (`room.name`, `${room.name}_${wall.direction}`, connection string keys) instead of coming from a shared descriptor identity strategy.
- Property panel fields, duplicate actions, contextual menus, and Add Floor/Add Stair/Add Lift flows are not descriptor-driven.
- The bridge does not yet expose a stable "entity snapshot" for agents or contextual UI.

### Bridge contract

A stronger contract should make every concrete entity addressable by a stable key:

```ts
type PrimitiveKind = 'floor' | 'room' | 'wall' | 'connection' | 'stair' | 'lift';

interface EntityKey {
  kind: PrimitiveKind;
  id: string;
  floorId?: string;
  parentId?: string;
}

interface EntityBridgeEntry<TJson = unknown> {
  key: EntityKey;
  descriptor: PrimitiveDescriptor<unknown, TJson>;

  sourceRange?: SourceRange;
  astPath?: string;
  json: TJson;

  meshes: THREE.Object3D[];
  anchors?: Record<string, THREE.Vector3>;
  bounds?: THREE.Box3;

  selection: {
    selectable: boolean;
    highlightMode?: 'mesh' | 'group' | 'bounds' | 'outline';
  };

  actions: EntityActionDescriptor<TJson>[];
  metadata: Record<string, unknown>;
}
```

The bridge entry is deliberately the meeting point of several systems:

- **Parser/Langium** provides source range and AST path.
- **JSON converter** provides normalized entity data.
- **Renderer** registers meshes, groups, bounds, and anchors.
- **Primitive descriptor** provides fields, labels, metadata, serializers, and actions.
- **Editor sync** maps cursor position to entity key.
- **Selection manager** maps clicked mesh to entity key.
- **Contextual UI** renders available actions for the selected key.
- **Agent context** serializes the selected key plus metadata/source range.

### Descriptor-owned identity

The primitive descriptor should own identity and display conventions. Today identity is scattered across call sites. Instead:

```ts
interface PrimitiveDescriptor<TAst = unknown, TJson = unknown> {
  kind: string;
  identity: {
    getId: (entity: TJson) => string;
    getFloorId?: (entity: TJson, ctx: EntityContext) => string | undefined;
    getDisplayName?: (entity: TJson) => string;
  };
  // ...
}
```

Examples:

- `floor`: id is `floor.id`.
- `room`: id is `room.name`, floor id is containing floor.
- `wall`: id might remain `${room.name}_${wall.direction}` for rectangular rooms, but the wall-network rebuild could later replace it with an edge id while preserving a room-wall alias.
- `stair`: id is `stair.name`, floor id is containing floor.
- `connection`: id should become a stable descriptor-generated key, not an ad hoc string split.

This is especially important for renderer changes. A wall-network renderer may replace many per-room wall meshes with one edge mesh. The entity bridge can preserve user-facing aliases while the low-level renderer changes its topology.

### Contextual actions

Once entities have stable bridge entries, actions can be declared per primitive:

```ts
interface EntityActionDescriptor<TJson = unknown> {
  id: string;
  label: string;
  appliesTo: PrimitiveKind;
  placement?: Array<'textEditor' | 'viewportMenu' | 'propertyPanel' | 'commandPalette'>;
  enabled?: (entry: EntityBridgeEntry<TJson>, ctx: ActionContext) => boolean;
  run: (entry: EntityBridgeEntry<TJson>, ctx: ActionContext) => DslEditOperation[] | Promise<DslEditOperation[]>;
}
```

Examples:

- `floor.add`: insert a new `floor` block.
- `floor.duplicate`: clone a selected floor, optionally preserving rooms/stairs/lifts and prompting for a new id.
- `floor.setHeight`: update the `height` field.
- `room.duplicate`: insert a copied room with a generated unique name and offset/relative placement.
- `room.addAdjacent`: create a new room using relative positioning from the selected room.
- `wall.changeType`: toggle `solid` / `door` / `window` / `open`.
- `stair.duplicateToFloor`: copy stair core to another floor and propose a `vertical` connection.
- `stair.editCodeFields`: expose riser/tread/headroom/handrail controls.
- `connection.flipSwing`: update swing/open direction if present.

These actions should be available from both sides:

- In the text editor, when the cursor is inside an entity range.
- In the 3D viewport, when a rendered object is selected or right-clicked.
- In the properties panel, as buttons below generated fields.
- In command palette / agent context, as structured operations.

### Add Floor implications

Adding a floor is a good example of why the bridge and registry should evolve together.

The grammar can bootstrap the fields:

- `id: ID`
- `height?: ValueWithUnit`
- child collections: `rooms`, `stairs`, `lifts`

The authored overlay supplies UX semantics:

- Default floor id strategy: `Floor2`, `Level2`, or copy/increment the selected floor id.
- Default height from config or previous floor.
- Whether the new floor starts empty or duplicates the selected floor footprint.
- Whether duplicated stairs/lifts should create or update `vertical` links.
- Whether to preserve source comments/styles.

The entity bridge supplies the target:

- If no floor is selected, insert after the last floor.
- If a floor is selected, insert after/above that floor.
- If the cursor is inside a floor block, use that floor as the context.
- After insertion, select the new floor in both the DSL and viewport.

### Agent context

The bridge should be the source for structured agent context. Instead of sending only prose like "make this taller", the app can send:

```ts
interface AgentEntityContext {
  key: EntityKey;
  displayName: string;
  sourceRange?: SourceRange;
  fields: Record<string, unknown>;
  metadata: Record<string, unknown>;
  availableActions: string[];
}
```

That lets the agent operate on stable entities instead of re-discovering by search:

- "make this room bigger" can target the selected room source range.
- "duplicate this floor" can call the `floor.duplicate` action semantics.
- "show stair info here" can inspect the stair metadata descriptor.
- "why is this wall weird?" can include wall identity, source range, mesh bounds, and renderer strategy.

### Acceptance for the bridge

- Every descriptor-backed primitive has a stable `EntityKey` strategy.
- Every parsed entity that has a source range appears in an entity bridge index.
- Every rendered entity that should be selectable registers meshes/groups against the same key.
- Cursor-to-viewport and viewport-to-cursor navigation work for `floor`, `room`, `wall`, `connection`, `stair`, and `lift`.
- Selecting an entity exposes descriptor-backed fields, metadata, annotations, and actions.
- Contextual actions produce targeted DSL edit operations instead of ad hoc string edits.
- Adding or duplicating a floor is implemented as a descriptor-backed action and selects the new floor after insertion.
- Agent requests can include selected bridge entries with source ranges, metadata, and available action IDs.

---

## Renderer generation boundary

Renderer work can be generated only up to a point.

Generated safely:

- Renderer registration stubs for each primitive.
- Compile-time errors or TODO stubs when a new primitive lacks `render2d` / `render3d`.
- Default fallback rendering for simple label-only or bounding-box primitives.
- Anchor/bounds stubs for annotations and selection.
- Layer/selection metadata registration.
- Tests that fail when a primitive has no renderer strategy.

Not safely generated from grammar alone:

- Real 3D geometry.
- CSG cutouts.
- Stair mesh generation.
- Wall ownership / wall-network topology.
- Material assignment.
- Collision/clearance logic.
- Camera framing semantics.

So "pluggable primitives" should start as **build-time, version-controlled extensions**, not arbitrary runtime plugins. A primitive can be pluggable in the sense that it registers fields, metadata, annotations, serializers, renderers, anchors, and tests through one descriptor module. The grammar still needs to be built by Langium.

For a new renderer-impacting field, the lifecycle should be:

1. Grammar changes.
2. Descriptor codegen notices the field.
3. Baseline UI/schema/serializer stubs appear.
4. If the field is marked renderer-impacting or has no default renderer behavior, generated tests fail with a targeted message.
5. The implementer fills the authored overlay and renderer hook.
6. The skill documents any project-specific default or review checklist update.

---

## Skill loop: floorplan-builder and floorplan-evolver

The current `skills/mermaid-floorplan` skill behaves mostly like a **floorplan builder**: it creates, edits, reverse-engineers, renders, and critiques plans using the DSL capabilities that exist today. That role should probably be named more explicitly over time, such as `floorplan-builder`.

This gap introduces a second role: a **floorplan evolver** skill. The evolver does not build user floorplans directly. It ingests structured capability gaps found by the builder and turns them into lifecycle plans for the language, descriptor registry, UI, metadata, renderer, validation, entity bridge, and builder guidance.

The desired loop is:

```text
Image / PDF / brief / existing plan
  -> floorplan-builder extracts intent
  -> builder tries current DSL primitives
  -> builder detects expressibility gap
  -> builder emits structured capability gap
  -> floorplan-evolver triages the gap
  -> evolver creates implementation plans
  -> grammar / descriptors / UI / renderer / validation / skill guidance land
  -> builder learns the new capability
  -> original limitation can be represented with less loss
```

### Builder responsibility

The builder should continue to do its best with current primitives. But when the source material contains a concept that cannot be represented faithfully, it should not silently invent a misleading workaround. It should record the limitation in a structured format.

Examples:

- A source image has a polygonal room, but the DSL only supports rectangular rooms.
- A site plan has exterior land shape, driveway, paths, or landscaping, but the DSL has no site/exterior primitives.
- A wall has compound segments, partial-height sections, retaining walls, or curved portions that cannot be expressed by current `WallSpecification`.
- A stair has a geometry variant that the grammar can name but the renderer cannot faithfully emit.
- A source has annotations, setbacks, dimensions, or labels that are important but not mapped to current metadata/annotation primitives.

The builder may still provide an approximation, but it should mark the approximation quality:

- `acceptable`: current DSL captures the intent well enough.
- `lossy`: current DSL is useful but misses important geometry/semantics.
- `misleading`: current DSL would imply something materially different.
- `not-possible`: no reasonable DSL representation exists.

### Capability gap report

A builder-emitted gap should be machine-readable enough for the evolver to ingest:

```ts
interface FloorplanCapabilityGap {
  id: string;
  title: string;
  discoveredBy: 'floorplan-builder';
  sourceUseCase: {
    description: string;
    sourceType?: 'image' | 'pdf' | 'brief' | 'existing-dsl' | 'user-feedback';
    evidence?: Array<{
      page?: number;
      regionDescription?: string;
      observedFeature: string;
    }>;
  };

  currentLimitation: {
    missingCapability: string;
    affectedPrimitiveKinds: string[];
    currentWorkaround?: string;
    workaroundQuality: 'acceptable' | 'lossy' | 'misleading' | 'not-possible';
  };

  proposedLanguageShape?: {
    primitiveName?: string;
    exampleDsl?: string;
    fields?: Array<{
      name: string;
      type: string;
      required?: boolean;
      notes?: string;
    }>;
  };

  lifecycleImpact: {
    grammar?: string[];
    generatedDescriptors?: string[];
    authoredOverlay?: string[];
    entityBridge?: string[];
    ui?: string[];
    annotations?: string[];
    renderer2d?: string[];
    renderer3d?: string[];
    validation?: string[];
    builderSkill?: string[];
    migration?: string[];
  };

  examples: Array<{
    beforeWorkaround?: string;
    desiredDsl?: string;
    expectedRenderBehavior?: string;
  }>;
}
```

These reports should live somewhere durable, not only in chat. Possible homes:

- `docs/gaps/capabilities/` for human-readable gap reports.
- `skills/mermaid-floorplan/capability-gaps/` if the builder skill should carry a local backlog.
- An OpenSpec change when the gap has been triaged and accepted for implementation.

### Evolver responsibility

The `floorplan-evolver` skill should ingest capability reports and decide what kind of response is appropriate. Not every source limitation should become a new primitive.

Triage categories:

- **Builder guidance only**: the DSL can already represent this, but the builder needs better examples or constraints.
- **Descriptor/UI gap**: grammar exists, but forms, contextual actions, or annotations are stale.
- **Computed metadata gap**: no grammar change needed, but derived values should be exposed.
- **New primitive or field**: grammar, descriptors, serializers, UI, validation, and renderer hooks are needed.
- **Renderer architecture prerequisite**: implementation depends on lower-level work such as wall-network rebuild.
- **Out of scope**: the feature belongs to landscaping/CAD/site modeling rather than the floorplan DSL; document the rejection and best approximation.

For accepted language work, the evolver should create plans covering the full lifecycle:

- Grammar and versioning.
- Descriptor codegen and authored overlay.
- Add/Edit UI stubs and contextual actions.
- Entity bridge identity, source mapping, selection, and agent context.
- Metadata and annotations.
- 2D and 3D renderer hooks or implementation.
- Validation rules and examples.
- Builder skill updates so future reconstruction attempts use the new capability.
- Tests and drift checks.

### Relationship to executable truth

The builder and evolver skills should guide the loop, but they should not be the executable source of truth.

Good skill responsibilities:

- Builder: detect and record expressibility gaps with evidence and approximation quality.
- Builder: avoid silently representing unsupported geometry as if it were exact.
- Evolver: triage capability gaps into builder guidance, descriptor work, grammar work, renderer work, or out-of-scope decisions.
- Evolver: turn accepted gaps into implementation plans that cover the whole lifecycle.
- Evolver: update builder guidance once capabilities land.
- Both: document examples that future agents can reuse.

Bad skill responsibilities:

- Being the only place that says a field exists.
- Being the only place that says a renderer hook is required.
- Being the only place that says an annotation control must exist.
- Depending on agent memory instead of tests/codegen.

In other words: the registry enforces, the builder discovers, and the evolver plans.

---

## Suggested fix shape

This should probably be split into several implementation plans rather than one large change.

### Plan 1: Primitive descriptor generator spike

Goal: generate baseline descriptors from `floorplans.langium` without changing runtime behavior.

Deliverables:

- Script that reads the Langium grammar or generated AST/type metadata and emits descriptor JSON/TS.
- Generated field descriptors for `Room`, `WallSpecification`, `Connection`, `Stair`, `Lift`, and config.
- Snapshot tests for generated descriptors.
- No UI or renderer migration yet.

Acceptance:

- Adding a simple optional grammar field produces a generated descriptor field.
- Enums/literal unions produce option lists.
- `Coordinate`, `Dimension`, and `ValueWithUnit` are recognized as composite controls.

### Plan 2: Authored overlay and merge contract

Goal: define how generated descriptors are customized.

Deliverables:

- `primitive-overrides.ts` or per-primitive overlay modules.
- Merge logic with clear precedence: authored overlay wins over generated baseline.
- Tests that prevent stale overlays from referencing removed fields.
- Initial overlays for `room` and `stair`.
- Skill update documenting descriptor authoring conventions.

Acceptance:

- A generated number input can be promoted to slider/stepper with min/max/step.
- A generated field can be hidden from create UI while still visible in edit UI.
- A computed metadata field can be added without grammar changes.

### Plan 3: Descriptor-driven Add/Edit UI

Goal: remove hand-coded primitive form drift.

Deliverables:

- Generic form renderer for `FieldDescriptor`.
- Add Room dialog driven by the `room` descriptor.
- Property panel driven by edit descriptors.
- `toDsl` generation delegated to descriptor-backed serializers.

Acceptance:

- Room create UI exposes baseline generated fields plus authored grouping/defaults.
- Adding a new non-renderer room field to grammar creates a usable form stub after codegen.
- Existing room creation behavior remains available.

### Plan 4: Entity bridge and contextual actions

Goal: make each parsed/rendered primitive instance addressable across DSL, JSON, meshes, selection, actions, and agent context.

Deliverables:

- Shared `EntityKey` and `EntityBridgeEntry` types.
- Descriptor-owned identity strategies for `floor`, `room`, `wall`, `connection`, `stair`, and `lift`.
- Bridge index that joins source ranges, JSON entities, mesh registry entries, metadata, and descriptor actions.
- `floor` added as a selectable/contextual entity where practical.
- Viewport-to-text and text-to-viewport navigation using the same bridge key.
- Initial contextual actions: Add Floor, Duplicate Floor, Duplicate Room, Change Wall Type, Edit Stair Fields.
- Agent context payload sourced from bridge entries.

Acceptance:

- Clicking or cursoring into any supported entity resolves to the same `EntityKey`.
- A selected floor can be duplicated or edited through descriptor-backed actions.
- Context menus/property panels show action buttons from descriptors, not hand-coded entity switches.
- Agent requests can include selected entity keys, source ranges, metadata, and available action IDs.

### Plan 5: Descriptor-driven annotations

Goal: make annotation controls and labels data-driven.

Deliverables:

- Annotation registry derived from primitive descriptors.
- Shared annotation state generated from annotation descriptors.
- Control-panel rows rendered from descriptors.
- Room name, room area, dimensions, floor summary, and stair info migrated.
- Shared metadata formatters for area, length, dimensions, step count.

Acceptance:

- Adding an annotation descriptor creates the state default, control row, and label-update path.
- Direct and computed metadata can be mixed in one label.
- Existing room/stair labels keep current behavior.

### Plan 6: Renderer hook registry and drift tests

Goal: make primitive rendering requirements explicit.

Deliverables:

- Renderer hook registration in descriptors.
- Tests that every renderable primitive has `render2d`, `render3d`, `bounds`, and `anchors` strategy, or an explicit `notRenderable` reason.
- Generated TODO stubs for new primitives/shape variants.
- Layer/selection/annotation anchor registration through descriptors where practical.

Acceptance:

- Adding a new primitive without renderer hooks fails with an actionable test.
- Adding a new field can mark whether it affects rendering, annotations, selection, serialization, or only docs.
- Existing renderer implementations remain hand-authored but discoverable through the registry.

### Plan 7: Builder/evolver capability feedback loop

Goal: close the loop between real reconstruction failures and language evolution.

Deliverables:

- Rename or alias the current `mermaid-floorplan` skill role as `floorplan-builder` in docs.
- Define a structured capability-gap report schema for builder-discovered limitations.
- Add builder guidance for when to emit a gap report vs when to approximate with current primitives.
- Create a `floorplan-evolver` skill (or section) that ingests capability reports and produces lifecycle plans.
- Add a durable backlog location for discovered capability gaps.
- Add examples: polygon room, site/exterior boundary, compound wall, landscaping, unsupported stair shape.

Acceptance:

- Reverse-engineering an unsupported feature produces a capability report with evidence, workaround quality, proposed language shape, and lifecycle impact.
- The evolver can triage that report into builder guidance, descriptor/UI work, grammar work, renderer prerequisite, or out-of-scope.
- Accepted capability reports become plans that cover grammar, descriptors, UI, entity bridge, annotations, renderer, validation, tests, and builder skill updates.
- Once a capability lands, the builder documentation points to the new grammar and stops using the old lossy workaround.

---

## Acceptance criteria for closing this gap

- Grammar-derived descriptors are generated as part of the language build or a dedicated codegen command.
- Authored overlays exist for at least `room`, `stair`, and `lift`.
- Add/Edit UI can render from effective descriptors.
- Entity bridge entries connect source ranges, JSON entities, rendered meshes/groups, selection state, metadata, and contextual actions.
- Annotation controls and CSS2D labels can render from annotation descriptors.
- Computed metadata has a shared home and is reusable by annotations, summaries, property panels, and agent context.
- Renderer hooks are explicit, version-controlled, and covered by drift tests.
- The builder/evolver skill loop is documented: builder emits capability gaps, evolver turns accepted gaps into full lifecycle plans, and builder guidance updates after capabilities land.
- `skills/mermaid-floorplan/SKILL.md` or its successor `floorplan-builder` documents primitive usage, sane defaults, and capability-gap reporting.
- A language change cannot silently skip UI, annotation, serializer, renderer, or skill updates without either generated stubs or failing checks.

---

## Out of scope

- Runtime third-party plugin loading. Start with build-time, repo-owned primitive extensions.
- Replacing Langium itself.
- Fully generating real 3D geometry from grammar.
- Solving wall-network topology or complex room shapes directly. This registry can make those capabilities easier to integrate, but their geometry still needs dedicated design.
- Rewriting every editor UI in one pass.

---

## Related docs

- [`ui-render-layer-toggles.md`](./ui-render-layer-toggles.md) - another example of core capabilities existing without matching UI surface.
- [`ui-selection-agent-context.md`](./ui-selection-agent-context.md) - selection/agent context should eventually consume primitive descriptors for labels, source ranges, and snapshots.
- [`3d-wall-network-rebuild.md`](./3d-wall-network-rebuild.md) - example of renderer semantics that cannot be inferred from grammar alone.
