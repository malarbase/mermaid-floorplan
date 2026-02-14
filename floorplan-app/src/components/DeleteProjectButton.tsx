import { useMutation } from 'convex-solidjs';
import { createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Modal } from '~/components/ui/Modal';
import { convexApi } from '~/lib/project-types';

interface DeleteProjectButtonProps {
  /** Project ID to delete (string type for when generated files don't exist) */
  projectId: string;
  /** Project name for confirmation dialog */
  projectName: string;
  /** Callback when deletion completes */
  onDeleted?: () => void;
  /** Additional classes for the button */
  class?: string;
}

/**
 * Delete project button with confirmation modal.
 * Shows a confirmation dialog requiring the user to type the project name.
 */
export function DeleteProjectButton(props: DeleteProjectButtonProps) {
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [confirmText, setConfirmText] = createSignal('');
  const [isDeleting, setIsDeleting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const removeMutation = useMutation(convexApi.projects.remove);

  const canDelete = () => confirmText() === props.projectName;

  const handleDelete = async () => {
    if (!canDelete()) return;

    setIsDeleting(true);
    setError(null);

    try {
      await removeMutation.mutate({ projectId: props.projectId });
      setIsModalOpen(false);
      setConfirmText('');
      props.onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenModal = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setConfirmText('');
    setError(null);
  };

  return (
    <>
      {/* Delete Button */}
      <button
        type="button"
        class={`btn btn-ghost btn-sm text-error hover:bg-error hover:text-error-content ${props.class ?? ''}`}
        onClick={handleOpenModal}
        title="Delete project"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>

      <Portal>
        <Modal
          isOpen={isModalOpen()}
          onClose={handleCloseModal}
          useDialog
          title={<span class="text-error">Delete Project</span>}
          description={
            <>
              Are you sure you want to delete{' '}
              <strong class="text-error">{props.projectName}</strong>? This action cannot be undone.
            </>
          }
          error={error() ?? undefined}
        >
          <p class="text-sm text-base-content/70 mb-4">
            All versions, snapshots, and collaborator access will be permanently deleted.
          </p>

          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">
                Type <strong>{props.projectName}</strong> to confirm:
              </span>
            </label>
            <input
              type="text"
              class="input input-bordered w-full"
              placeholder="Project name"
              value={confirmText()}
              onInput={(e) => setConfirmText(e.currentTarget.value)}
              disabled={isDeleting()}
            />
          </div>

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={handleCloseModal}
              disabled={isDeleting()}
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-error"
              onClick={handleDelete}
              disabled={!canDelete() || isDeleting()}
            >
              {isDeleting() ? (
                <>
                  <span class="loading loading-spinner loading-sm"></span>
                  Deleting...
                </>
              ) : (
                'Delete Project'
              )}
            </button>
          </div>
        </Modal>
      </Portal>
    </>
  );
}
