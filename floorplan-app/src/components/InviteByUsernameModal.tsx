import { useMutation } from 'convex-solidjs';
import { createEffect, createMemo, createSignal, Show } from 'solid-js';
import { Modal } from '~/components/ui/Modal';
import { convexApi } from '~/lib/project-types';

interface InviteByUsernameModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Project ID to invite to */
  projectId: string;
  /** Callback when invitation is successful */
  onSuccess?: (username: string, role: 'viewer' | 'editor') => void;
}

/**
 * Modal for inviting a user to collaborate on a project by username.
 * Only project owners can use this functionality.
 */
export function InviteByUsernameModal(props: InviteByUsernameModalProps) {
  const [username, setUsername] = createSignal('');
  const [role, setRole] = createSignal<'viewer' | 'editor'>('viewer');
  const [error, setError] = createSignal('');
  const [success, setSuccess] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Mutation to invite by username
  const inviteByUsernameMutation = useMutation(convexApi.sharing.inviteByUsername);

  // Reset form when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setUsername('');
      setRole('viewer');
      setError('');
      setSuccess('');
    }
  });

  // Normalize username (lowercase, alphanumeric + underscores)
  const handleUsernameChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(normalized);
    setError('');
    setSuccess('');
  };

  // Validation
  const isValid = createMemo(() => {
    const name = username();
    if (name.length < 3) return false;
    if (name.length > 30) return false;
    return true;
  });

  const validationMessage = createMemo(() => {
    const name = username();
    if (name.length === 0) return '';
    if (name.length < 3) return 'Username must be at least 3 characters';
    if (name.length > 30) return 'Username must be 30 characters or less';
    return '';
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!isValid()) {
      setError('Please enter a valid username');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const result = (await inviteByUsernameMutation.mutate({
        projectId: props.projectId,
        username: username(),
        role: role(),
      })) as { success: boolean; action: string };

      // Show success message based on action
      const actionMessage =
        result.action === 'created'
          ? `@${username()} has been invited as ${role()}`
          : result.action === 'updated'
            ? `@${username()}'s role has been updated to ${role()}`
            : `@${username()} already has ${role()} access`;

      setSuccess(actionMessage);
      props.onSuccess?.(username(), role());

      // Close modal after a short delay on success
      setTimeout(() => {
        props.onClose();
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to invite user';
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
        <span class="flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          Invite Collaborator
        </span>
      }
      description="Invite a user to collaborate on this project. They will receive access to the project with the role you specify."
      error={error()}
    >
      <form onSubmit={handleSubmit}>
        {/* Username input */}
        <div class="form-control w-full">
          <label class="label">
            <span class="label-text">Username</span>
            <span class="label-text-alt text-base-content/50">3-30 characters</span>
          </label>
          <div class="join w-full">
            <span class="join-item btn btn-disabled no-animation">@</span>
            <input
              type="text"
              placeholder="username"
              class={`input input-bordered join-item w-full ${
                username().length > 0 ? (isValid() ? 'input-success' : 'input-error') : ''
              }`}
              value={username()}
              onInput={(e) => handleUsernameChange(e.currentTarget.value)}
              maxLength={30}
              required
              autofocus
            />
          </div>

          {/* Validation message */}
          <label class="label">
            <Show when={validationMessage()}>
              <span class="label-text-alt text-warning">{validationMessage()}</span>
            </Show>
          </label>
        </div>

        {/* Role selection */}
        <div class="form-control w-full mt-4">
          <label class="label">
            <span class="label-text">Role</span>
          </label>
          <div class="flex gap-4">
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="radio"
                name="role"
                class="radio radio-primary"
                checked={role() === 'viewer'}
                onChange={() => setRole('viewer')}
              />
              <span class="label-text flex flex-col">
                <span class="font-medium">Viewer</span>
                <span class="text-xs text-base-content/60">Can view the project but not edit</span>
              </span>
            </label>
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="radio"
                name="role"
                class="radio radio-primary"
                checked={role() === 'editor'}
                onChange={() => setRole('editor')}
              />
              <span class="label-text flex flex-col">
                <span class="font-medium">Editor</span>
                <span class="text-xs text-base-content/60">Can view and edit the project</span>
              </span>
            </label>
          </div>
        </div>

        {/* Success message */}
        <Show when={success()}>
          <div class="alert alert-success mt-4">
            <svg class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{success()}</span>
          </div>
        </Show>

        {/* Actions */}
        <div class="modal-action">
          <button
            type="button"
            class="btn"
            onClick={() => props.onClose()}
            disabled={isSubmitting()}
          >
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={!isValid() || isSubmitting()}>
            <Show when={isSubmitting()}>
              <span class="loading loading-spinner loading-sm"></span>
            </Show>
            Send Invite
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default InviteByUsernameModal;
