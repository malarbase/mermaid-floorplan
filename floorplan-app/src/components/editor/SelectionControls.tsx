import { createSignal, createEffect, onMount } from "solid-js";

interface SelectionControlsProps {
  core: any;
  onAddRoom: () => void;
  onDelete: () => void;
}

export default function SelectionControls(props: SelectionControlsProps) {
  const [hasSelection, setHasSelection] = createSignal(false);
  const [selectedCount, setSelectedCount] = createSignal(0);

  onMount(() => {
    const selectionManager = props.core.getSelectionManager?.();
    if (!selectionManager) return;

    selectionManager.on?.('selectionChange', (event: any) => {
      const count = event.selected?.length ?? 0;
      setSelectedCount(count);
      setHasSelection(count > 0);
    });
  });

  const handleCopy = () => {
    const selectionManager = props.core.getSelectionManager?.();
    if (!selectionManager) return;

    const selected = selectionManager.getSelection();
    if (selected.length === 0) return;

    console.log("Copy entities:", selected);
  };

  const handleFocus = () => {
    const selectionManager = props.core.getSelectionManager?.();
    if (!selectionManager) return;

    const selected = selectionManager.getSelection();
    if (selected.length === 0) return;

    props.core.cameraManager?.focusOnEntity?.(selected[0]);
  };

  return (
    <div class="flex flex-col gap-2 p-4 bg-base-100/95 backdrop-blur-sm border-l border-base-300">
      <div class="text-sm font-medium text-base-content/70 mb-2">
        Selection Tools
      </div>

      <button
        class="btn btn-sm btn-primary"
        onClick={props.onAddRoom}
      >
        <span class="text-lg">+</span>
        Add Room
      </button>

      <button
        class="btn btn-sm"
        onClick={handleCopy}
        disabled={!hasSelection()}
      >
        Copy
      </button>

      <button
        class="btn btn-sm"
        onClick={handleFocus}
        disabled={!hasSelection()}
      >
        Focus
      </button>

      <button
        class="btn btn-sm btn-error"
        onClick={props.onDelete}
        disabled={!hasSelection()}
      >
        Delete
      </button>

      {hasSelection() && (
        <div class="mt-2 text-xs text-base-content/60">
          {selectedCount()} selected
        </div>
      )}
    </div>
  );
}
