import { createSignal } from "solid-js";
import EditorPanel from "./EditorPanel";
import SelectionControls from "./SelectionControls";
import PropertiesPanel from "./PropertiesPanel";
import AddRoomDialog from "./AddRoomDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { useSelection, type GetEntityDataFn } from "~/hooks/useSelection";

interface EditorBundleProps {
  core: any;
  dsl: string;
  theme: "light" | "dark";
  onDslChange: (dsl: string) => void;
}

/**
 * Editor panel bundle layout:
 * 
 * ┌──────────────────────────────┐
 * │ [+Add] [Copy] [Focus] [Del] │ ← Toolbar (compact, with type breakdown)
 * ├──────────────────────────────┤
 * │                              │
 * │     Monaco Editor            │ ← Flex-1, takes remaining space
 * │                              │
 * ├──────────────────────────────┤
 * │ Properties: LivingRoom       │ ← Rich properties with select dropdowns
 * │ X: 0   Y: 0   W: 20  H: 15 │
 * │ Room Height: 2.8  Style: ...│
 * └──────────────────────────────┘
 * 
 * Selection state is managed by useSelection hook (single subscription)
 * and passed down as props to presentational children.
 */
export default function EditorBundle(props: EditorBundleProps) {
  const [showAddRoomDialog, setShowAddRoomDialog] = createSignal(false);
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
  const [selectedEntityName, setSelectedEntityName] = createSignal("");

  /**
   * Callback to fetch entity data for the properties panel.
   * Queries EditorViewerSync (or similar) for the full entity data dictionary.
   */
  const getEntityData: GetEntityDataFn = (entityType: string, entityId: string) => {
    const c = props.core;
    if (!c) return { name: entityId };

    // Try the EditorViewerSync's getEntityData if available
    const sync = c.editorViewerSync ?? c.getEditorViewerSync?.();
    if (sync?.getEntityData) {
      return sync.getEntityData(entityType, entityId);
    }

    // Try the SceneContext directly
    const scene = c.sceneContext ?? c.getSceneContext?.();
    if (scene?.getEntityData) {
      return scene.getEntityData(entityType, entityId);
    }

    // Fallback: return minimal data
    return { name: entityId };
  };

  // Single reactive selection subscription with entity data callback
  const selection = useSelection(() => props.core, getEntityData);

  const handleAddRoom = (data: {
    name: string;
    type: string;
    width: number;
    height: number;
  }) => {
    console.log("Add room:", data);
  };

  const handleCopy = () => {
    const sel = selection();
    if (sel.entities.length === 0) return;
    console.log("Copy entities:", sel.entities);
  };

  const handleFocus = () => {
    const sel = selection();
    if (!sel.primary) return;
    props.core?.cameraManager?.focusOnEntity?.(sel.primary);
  };

  const handleDelete = () => {
    const sel = selection();
    if (!sel.primary) return;
    setSelectedEntityName(sel.primaryId || "this entity");
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    console.log("Delete confirmed");
    setShowDeleteDialog(false);
  };

  const handlePropertyChange = (property: string, value: any) => {
    const sel = selection();
    if (!sel.primary) return;

    // Delegate to EditorViewerSync for DSL mutation
    const c = props.core;
    const sync = c?.editorViewerSync ?? c?.getEditorViewerSync?.();
    if (sync?.updateEntityProperty) {
      sync.updateEntityProperty(sel.primaryType, sel.primaryId, property, value);
    } else {
      console.log("Property change (no sync):", sel.primaryType, sel.primaryId, property, value);
    }
  };

  return (
    <div class="flex flex-col h-full w-full overflow-hidden">
      {/* Top: Compact toolbar with type breakdown */}
      <div class="flex-shrink-0">
        <SelectionControls
          hasSelection={selection().hasSelection}
          selectedCount={selection().count}
          summary={selection().summary}
          entityNames={selection().entityNames}
          onAddRoom={() => setShowAddRoomDialog(true)}
          onCopy={handleCopy}
          onFocus={handleFocus}
          onDelete={handleDelete}
        />
      </div>

      {/* Middle: Monaco Editor - takes remaining space */}
      <div class="flex-1 min-h-0 relative">
        <EditorPanel
          core={props.core}
          dsl={props.dsl}
          theme={props.theme}
          onDslChange={props.onDslChange}
        />
      </div>

      {/* Bottom: Properties panel with rich property definitions */}
      <div class="flex-shrink-0 max-h-48 overflow-y-auto">
        <PropertiesPanel
          hasSelection={selection().hasSelection}
          entityType={selection().primaryType}
          entityId={selection().primaryId}
          propertyDefs={selection().propertyDefs}
          onPropertyChange={handlePropertyChange}
        />
      </div>

      <AddRoomDialog
        isOpen={showAddRoomDialog()}
        onClose={() => setShowAddRoomDialog(false)}
        onConfirm={handleAddRoom}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog()}
        entityName={selectedEntityName()}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
