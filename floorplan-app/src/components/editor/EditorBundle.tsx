import { createSignal } from "solid-js";
import EditorPanel from "./EditorPanel";
import SelectionControls from "./SelectionControls";
import PropertiesPanel from "./PropertiesPanel";
import AddRoomDialog from "./AddRoomDialog";
import DeleteConfirmDialog from "./DeleteConfirmDialog";

interface EditorBundleProps {
  core: any;
  dsl: string;
  theme: "light" | "dark";
  onDslChange: (dsl: string) => void;
}

export default function EditorBundle(props: EditorBundleProps) {
  const [showAddRoomDialog, setShowAddRoomDialog] = createSignal(false);
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
  const [selectedEntityName, setSelectedEntityName] = createSignal("");

  const handleAddRoom = (data: {
    name: string;
    type: string;
    width: number;
    height: number;
  }) => {
    console.log("Add room:", data);
  };

  const handleDelete = () => {
    const selectionManager = props.core.getSelectionManager?.();
    if (!selectionManager) return;

    const selected = selectionManager.getSelection();
    if (selected.length === 0) return;

    setSelectedEntityName(selected[0].entityId || "this entity");
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
    <div class="flex h-full w-full">
      <div class="flex-1 relative">
        <EditorPanel
          core={props.core}
          dsl={props.dsl}
          theme={props.theme}
          onDslChange={props.onDslChange}
        />
      </div>

      <div class="flex">
        <SelectionControls
          core={props.core}
          onAddRoom={() => setShowAddRoomDialog(true)}
          onDelete={handleDelete}
        />

        <PropertiesPanel core={props.core} onPropertyChange={handlePropertyChange} />
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
