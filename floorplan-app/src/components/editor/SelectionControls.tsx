import { Show } from "solid-js";

interface SelectionControlsProps {
  hasSelection: boolean;
  selectedCount: number;
  onAddRoom: () => void;
  onCopy: () => void;
  onFocus: () => void;
  onDelete: () => void;
}

/**
 * Compact horizontal toolbar for selection actions.
 * Pure presentational component -- receives selection state as props.
 */
export default function SelectionControls(props: SelectionControlsProps) {
  return (
    <div class="flex items-center gap-1 px-2 py-1.5 bg-base-200/80 border-b border-base-300">
      {/* Add Room - always enabled */}
      <button
        class="btn btn-xs btn-primary gap-1"
        onClick={props.onAddRoom}
        title="Add Room"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span class="hidden sm:inline">Add Room</span>
      </button>

      {/* Divider */}
      <div class="w-px h-4 bg-base-content/15 mx-0.5" />

      {/* Selection-dependent actions */}
      <button
        class="btn btn-xs btn-ghost gap-1"
        onClick={props.onCopy}
        disabled={!props.hasSelection}
        title="Copy selection"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span class="hidden sm:inline">Copy</span>
      </button>

      <button
        class="btn btn-xs btn-ghost gap-1"
        onClick={props.onFocus}
        disabled={!props.hasSelection}
        title="Focus on selection"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span class="hidden sm:inline">Focus</span>
      </button>

      <button
        class="btn btn-xs btn-ghost text-error gap-1"
        onClick={props.onDelete}
        disabled={!props.hasSelection}
        title="Delete selection"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        <span class="hidden sm:inline">Delete</span>
      </button>

      {/* Selection count badge */}
      <Show when={props.hasSelection}>
        <span class="badge badge-sm badge-ghost ml-auto text-xs">
          {props.selectedCount} selected
        </span>
      </Show>
    </div>
  );
}
