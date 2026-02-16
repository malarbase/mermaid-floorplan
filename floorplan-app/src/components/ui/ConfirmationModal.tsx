import { createEffect, createSignal, type JSX, Show } from 'solid-js';
import { Modal } from './Modal';

export interface ConfirmationModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Called when the user requests to close */
  onClose: () => void;
  /** Called when the user confirms the action */
  onConfirm: () => void | Promise<void>;
  /** Modal title */
  title: string;
  /** Optional description below the title */
  description?: string | JSX.Element;
  /** Body content between description and actions (e.g., form fields) */
  children?: JSX.Element;
  /** Button label. Default: "Confirm" */
  confirmLabel?: string;
  /** Button CSS class. Default: "btn-primary" */
  confirmClass?: string;
  /** If set, user must type this exact string to enable confirm button */
  typedConfirmation?: string;
  /** Whether confirm action is in progress */
  isLoading?: boolean;
  /** Error message shown in an alert */
  error?: string;
}

/**
 * A confirmation modal that wraps {@link Modal} with confirm/cancel actions.
 *
 * Supports an optional typed-confirmation gate: the user must type an exact
 * string before the confirm button becomes enabled. Useful for destructive
 * actions like deleting a project.
 *
 * @example
 * ```tsx
 * <ConfirmationModal
 *   isOpen={showDelete()}
 *   onClose={() => setShowDelete(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Project"
 *   description="This action cannot be undone."
 *   confirmLabel="Delete"
 *   confirmClass="btn-error"
 *   typedConfirmation={projectName()}
 * />
 * ```
 */
export function ConfirmationModal(props: ConfirmationModalProps) {
  const [typedValue, setTypedValue] = createSignal('');
  const [localLoading, setLocalLoading] = createSignal(false);

  // Reset typed input when modal closes
  createEffect(() => {
    if (!props.isOpen) {
      setTypedValue('');
    }
  });

  const isLoading = () => props.isLoading || localLoading();

  const isConfirmDisabled = () => {
    if (isLoading()) return true;
    if (props.typedConfirmation && typedValue() !== props.typedConfirmation) return true;
    return false;
  };

  const handleConfirm = async () => {
    if (isConfirmDisabled()) return;
    const result = props.onConfirm();
    if (result instanceof Promise) {
      setLocalLoading(true);
      try {
        await result;
      } finally {
        setLocalLoading(false);
      }
    }
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.title}
      description={props.description}
      error={props.error}
    >
      {props.children}

      <Show when={props.typedConfirmation}>
        <div class="form-control w-full mt-4">
          <label class="label" for="typed-confirmation-input">
            <span class="label-text">
              Type <code class="font-mono font-bold">{props.typedConfirmation}</code> to confirm
            </span>
          </label>
          <input
            id="typed-confirmation-input"
            type="text"
            class="input input-bordered w-full"
            placeholder={props.typedConfirmation}
            value={typedValue()}
            onInput={(e) => setTypedValue(e.currentTarget.value)}
            disabled={isLoading()}
          />
        </div>
      </Show>

      <div class="modal-action">
        <button type="button" class="btn" onClick={() => props.onClose()} disabled={isLoading()}>
          Cancel
        </button>
        <button
          type="button"
          class={`btn ${props.confirmClass ?? 'btn-primary'}`}
          onClick={handleConfirm}
          disabled={isConfirmDisabled()}
        >
          <Show when={isLoading()}>
            <span class="loading loading-spinner loading-xs" />
          </Show>
          {props.confirmLabel ?? 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmationModal;
