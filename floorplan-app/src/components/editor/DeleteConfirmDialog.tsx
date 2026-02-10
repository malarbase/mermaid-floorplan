import { For, Show } from 'solid-js';

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
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  const entityCount = () => props.entities?.length ?? (props.entityName ? 1 : 0);
  const isSingle = () => entityCount() === 1;

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
