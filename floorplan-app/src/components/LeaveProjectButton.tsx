import { useMutation } from 'convex-solidjs';
import { createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Modal } from '~/components/ui/Modal';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

interface LeaveProjectButtonProps {
  /** Project ID to leave */
  projectId: Id<'projects'>;
  /** Project name for confirmation dialog */
  projectName: string;
  /** Additional classes for the button */
  class?: string;
}

/**
 * Leave project button with confirmation modal.
 * Shows a simple yes/no confirmation dialog before leaving a shared project.
 */
export function LeaveProjectButton(props: LeaveProjectButtonProps) {
  const [isModalOpen, setIsModalOpen] = createSignal(false);
  const [isLeaving, setIsLeaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const leaveMutation = useMutation(api.sharing.leaveProject);

  const handleLeave = async () => {
    setIsLeaving(true);
    setError(null);

    try {
      await leaveMutation.mutate({ projectId: props.projectId });
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave project');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleOpenModal = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  return (
    <>
      {/* Leave Button */}
      <button
        type="button"
        class={`btn btn-ghost btn-sm text-warning hover:bg-warning hover:text-warning-content ${props.class ?? ''}`}
        onClick={handleOpenModal}
        title="Leave project"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>

      <Portal>
        <Modal
          isOpen={isModalOpen()}
          onClose={handleCloseModal}
          useDialog
          title={<span class="text-warning">Leave Project</span>}
          description={
            <>
              Are you sure you want to leave{' '}
              <strong class="text-warning">{props.projectName}</strong>? You will lose access to
              this project and will need to be re-invited.
            </>
          }
          error={error() ?? undefined}
        >
          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={handleCloseModal}
              disabled={isLeaving()}
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-warning"
              onClick={handleLeave}
              disabled={isLeaving()}
            >
              {isLeaving() ? (
                <>
                  <span class="loading loading-spinner loading-sm"></span>
                  Leaving...
                </>
              ) : (
                'Leave Project'
              )}
            </button>
          </div>
        </Modal>
      </Portal>
    </>
  );
}
