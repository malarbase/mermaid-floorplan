import { For, Show } from 'solid-js';
import type { CascadeConversion } from './dsl-edit-plan';

export interface DeleteEntity {
  type: string;
  id: string;
  /** Human-readable label for the entity in the dialog */
  label: string;
}

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  /** @deprecated Use `entities` instead */
  entityName?: string;
  /** Entities to be deleted (multi-selection support) */
  entities?: DeleteEntity[];
  /** Rooms that will be converted from relative to absolute positioning */
  cascadeConversions?: CascadeConversion[];
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  const entityCount = () => props.entities?.length ?? (props.entityName ? 1 : 0);
  const isSingle = () => entityCount() === 1;
  const hasCascade = () => (props.cascadeConversions?.length ?? 0) > 0;

  return (
    <dialog class="modal" classList={{ 'modal-open': props.isOpen }}>
      <div class="modal-box">
        <h3 class="font-bold text-lg">
          Confirm Delete ({entityCount()} {entityCount() === 1 ? 'item' : 'items'})
        </h3>

        <div class="py-4">
          <Show
            when={props.entities && props.entities.length > 0}
            fallback={
              <p class="text-base-content/80">
                Are you sure you want to delete{' '}
                <span class="font-semibold">{props.entityName}</span>?
              </p>
            }
          >
            <Show when={isSingle()}>
              <p class="text-base-content/80">
                Are you sure you want to delete{' '}
                <span class="font-semibold">{props.entities![0].label}</span>?
              </p>
            </Show>
            <Show when={!isSingle()}>
              <p class="text-base-content/80 mb-2">
                Are you sure you want to delete these {entityCount()} items?
              </p>
              <ul class="list-disc list-inside text-sm text-base-content/70 max-h-40 overflow-y-auto space-y-0.5">
                <For each={props.entities}>
                  {(entity) => (
                    <li>
                      <span class="text-base-content/50 text-xs">{entity.type}:</span>{' '}
                      <span class="font-medium">{entity.label}</span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>

          {/* Cascade warning: rooms converted from relative → absolute */}
          <Show when={hasCascade()}>
            <div class="alert alert-warning mt-3 text-sm py-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p class="font-medium">
                  {props.cascadeConversions!.length === 1
                    ? '1 room will be converted to absolute positioning:'
                    : `${props.cascadeConversions!.length} rooms will be converted to absolute positioning:`}
                </p>
                <ul class="mt-1 space-y-0.5 text-xs opacity-80">
                  <For each={props.cascadeConversions}>
                    {(c) => (
                      <li>
                        <span class="font-semibold">{c.roomName}</span>{' '}
                        <span class="opacity-70">
                          ({c.direction} {c.wasRelativeTo})
                        </span>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </div>
          </Show>

          <p class="text-sm text-base-content/60 mt-2">This action cannot be undone.</p>
        </div>

        <div class="modal-action">
          <button class="btn" onClick={props.onClose}>
            Cancel
          </button>
          <button class="btn btn-error" onClick={props.onConfirm}>
            Delete {entityCount() > 1 ? `(${entityCount()})` : ''}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button onClick={props.onClose}>close</button>
      </form>
    </dialog>
  );
}
