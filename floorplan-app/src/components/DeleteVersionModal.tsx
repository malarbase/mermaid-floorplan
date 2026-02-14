import { useMutation } from 'convex-solidjs';
import { createEffect, createSignal, Show } from 'solid-js';
import { Modal } from '~/components/ui/Modal';
import { api } from '../../convex/_generated/api';

interface DeleteVersionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Project ID */
  projectId: string;
  /** Version name to delete */
  versionName: string;
  /** Callback when version is deleted successfully */
  onSuccess?: () => void;
}

/**
 * Confirmation modal for deleting a non-default version (branch).
 * Snapshots are NOT deleted — they remain accessible via permalinks.
 */
export function DeleteVersionModal(props: DeleteVersionModalProps) {
  const [error, setError] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const deleteVersionMutation = useMutation(api.projects.deleteVersion);

  // Reset error when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setError('');
    }
  });

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await deleteVersionMutation.mutate({
        projectId: props.projectId,
        versionName: props.versionName,
      });

      props.onSuccess?.();
      props.onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete version';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={
        <span class="flex items-center gap-2 text-error">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete Version
        </span>
      }
      error={error()}
    >
      <div class="py-2">
        <p class="text-base-content/80">
          Are you sure you want to delete version{' '}
          <span class="font-mono font-semibold text-base-content">"{props.versionName}"</span>?
        </p>
        <div class="alert alert-warning mt-3">
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span class="text-sm">
            This action is permanent. Snapshots will be preserved and remain accessible via
            permalinks.
          </span>
        </div>
      </div>

      <div class="modal-action">
        <button type="button" class="btn" onClick={() => props.onClose()} disabled={isSubmitting()}>
          Cancel
        </button>
        <button
          type="button"
          class="btn btn-error"
          onClick={handleDelete}
          disabled={isSubmitting()}
        >
          <Show when={isSubmitting()}>
            <span class="loading loading-spinner loading-sm"></span>
          </Show>
          Delete Version
        </button>
      </div>
    </Modal>
  );
}

export default DeleteVersionModal;
