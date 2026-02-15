import { Show } from 'solid-js';

interface SelectionControlsProps {
  hasSelection: boolean;
  selectedCount: number;
  /** Human-readable summary like "1 room, 2 walls" */
  summary: string;
  /** Entity names for small selections */
  entityNames: string[];
  onAddRoom: () => void;
  onCopy: () => void;
  onFocus: () => void;
  onDelete: () => void;
}

/**
 * Compact horizontal toolbar for selection actions.
 * Pure presentational component -- receives selection state as props.
 * Shows detailed type/count breakdown instead of just "N selected".
 */
export default function SelectionControls(props: SelectionControlsProps) {
  return (
    <div class="flex flex-nowrap items-center gap-1 px-2 py-1.5 overflow-hidden flex-1 min-w-0">
      {/* Add Room - always enabled */}
      <button
        type="button"
        class="btn btn-xs btn-primary gap-1 flex-shrink-0"
        onClick={props.onAddRoom}
        title="Add Room"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>Add</title>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span class="hidden lg:inline">Add Room</span>
      </button>

      {/* Divider */}
      <div class="w-px h-4 bg-base-content/15 mx-0.5 flex-shrink-0" />

      {/* Selection-dependent actions */}
      <button
        type="button"
        class="btn btn-xs btn-ghost gap-1 flex-shrink-0"
        onClick={props.onCopy}
        disabled={!props.hasSelection}
        title="Copy selection"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>Copy</title>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </button>

      <button
        type="button"
        class="btn btn-xs btn-ghost gap-1 flex-shrink-0"
        onClick={props.onFocus}
        disabled={!props.hasSelection}
        title="Focus on selection"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>Focus</title>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </button>

      <button
        type="button"
        class="btn btn-xs btn-ghost text-error gap-1 flex-shrink-0"
        onClick={props.onDelete}
        disabled={!props.hasSelection}
        title="Delete selection"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <title>Delete</title>
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      {/* Selection info - fills remaining space and truncates */}
      <Show when={props.hasSelection}>
        <div class="ml-auto flex items-center gap-1.5 min-w-0 overflow-hidden">
          {/* Show entity names when 1-3 selected */}
          <Show when={props.entityNames.length > 0 && props.entityNames.length <= 3}>
            <span
              class="text-xs text-base-content/60 truncate"
              title={props.entityNames.join(', ')}
            >
              {props.entityNames.join(', ')}
            </span>
            <div class="w-px h-3 bg-base-content/15 flex-shrink-0" />
          </Show>
          {/* Type/count breakdown badge */}
          <span class="badge badge-sm badge-ghost text-xs whitespace-nowrap flex-shrink-0">
            {props.summary || `${props.selectedCount} selected`}
          </span>
        </div>
      </Show>
    </div>
  );
}
