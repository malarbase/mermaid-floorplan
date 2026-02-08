import { createSignal } from "solid-js";
import EditorPanel from "./EditorPanel";
import SelectionControls from "./SelectionControls";
import PropertiesPanel from "./PropertiesPanel";
import AddRoomDialog from "./AddRoomDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { useSelection } from "~/hooks/useSelection";

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
 * │ [+Add] [Copy] [Focus] [Del] │ ← Toolbar (compact, single row)
 * ├──────────────────────────────┤
 * │                              │
 * │     Monaco Editor            │ ← Flex-1, takes remaining space
 * │                              │
 * ├──────────────────────────────┤
 * │ Properties: LivingRoom       │ ← Collapsible, expands on selection
 * │ X: 0   Y: 0   W: 20  H: 15 │
 * └──────────────────────────────┘
 * 
 * Selection state is managed by useSelection hook (single subscription)
 * and passed down as props to presentational children.
 */
export default function EditorBundle(props: EditorBundleProps) {
  const [showAddRoomDialog, setShowAddRoomDialog] = createSignal(false);
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
  const [selectedEntityName, setSelectedEntityName] = createSignal("");

  // Single reactive selection subscription for the entire editor panel
  const selection = useSelection(() => props.core);

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
    console.log("Property change:", property, value);
  };

  return (
    <div class="flex flex-col h-full w-full overflow-hidden">
      {/* Top: Compact toolbar */}
      <div class="flex-shrink-0">
        <SelectionControls
          hasSelection={selection().hasSelection}
          selectedCount={selection().count}
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

      {/* Bottom: Properties panel - collapses when no selection */}
      <div class="flex-shrink-0 max-h-48 overflow-y-auto">
        <PropertiesPanel
          hasSelection={selection().hasSelection}
          entityType={selection().primaryType}
          entityId={selection().primaryId}
          properties={selection().properties}
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
