import { type Accessor, Show } from 'solid-js';

interface SaveIndicatorProps {
  hasUnsavedChanges: Accessor<boolean>;
  isSaving: Accessor<boolean>;
  showSaveSuccess: Accessor<boolean>;
  saveError: Accessor<string | null>;
  onSave: () => void;
}

/**
 * Save button + success badge + error tooltip for project content editing.
 * Shows the Save button only when there are unsaved changes.
 */
export function SaveIndicator(props: SaveIndicatorProps) {
  return (
    <>
      <Show when={props.hasUnsavedChanges()}>
        <button
          type="button"
          class="btn btn-primary btn-sm gap-1"
          onClick={props.onSave}
          disabled={props.isSaving()}
          title="Save (Ctrl+S)"
        >
          <Show
            when={!props.isSaving()}
            fallback={<span class="loading loading-spinner loading-xs"></span>}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          </Show>
          Save
        </button>
      </Show>
      <Show when={props.showSaveSuccess()}>
        <span class="badge badge-success badge-sm gap-1">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Saved
        </span>
      </Show>
      <Show when={props.saveError()}>
        <div class="tooltip tooltip-error" data-tip={props.saveError()}>
          <span class="badge badge-error badge-sm">Save failed</span>
        </div>
      </Show>
    </>
  );
}
