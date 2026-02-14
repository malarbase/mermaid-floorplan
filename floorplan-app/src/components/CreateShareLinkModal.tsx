import { useMutation } from 'convex-solidjs';
import { createSignal, Show } from 'solid-js';
import { Modal } from '~/components/ui/Modal';
import { convexApi } from '~/lib/project-types';

interface CreateShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: (token: string, role: 'viewer' | 'editor') => void;
}

/**
 * Modal for creating share links with viewer/editor roles.
 * Allows setting optional expiration.
 */
export function CreateShareLinkModal(props: CreateShareLinkModalProps) {
  const [role, setRole] = createSignal<'viewer' | 'editor'>('viewer');
  const [expiresInDays, setExpiresInDays] = createSignal<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');
  const [createdLink, setCreatedLink] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal(false);

  const createShareLink = useMutation(convexApi.sharing.createShareLink);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setCreatedLink(null);

    try {
      const result = (await createShareLink.mutate({
        projectId: props.projectId,
        role: role(),
        expiresInDays: expiresInDays(),
      })) as { success: boolean; linkId: string; token: string };

      if (result.success && result.token) {
        // Build the full share link URL
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/share/${result.token}`;
        setCreatedLink(shareUrl);
        props.onSuccess?.(result.token, role());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create share link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    const link = createdLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setRole('viewer');
    setExpiresInDays(undefined);
    setError('');
    setCreatedLink(null);
    setCopied(false);
    props.onClose();
  };

  const handleCreateAnother = () => {
    setRole('viewer');
    setExpiresInDays(undefined);
    setError('');
    setCreatedLink(null);
    setCopied(false);
  };

  return (
    <Modal
      isOpen={props.isOpen}
      onClose={handleClose}
      title="Create Share Link"
      useDialog
      error={error()}
    >
      <Show
        when={!createdLink()}
        fallback={
          /* Success state - show created link */
          <div class="py-4">
            <div class="alert alert-success mb-4">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Share link created!</span>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Share URL</span>
                <span
                  class={`label-text-alt badge badge-sm ${
                    role() === 'editor' ? 'badge-warning' : 'badge-info'
                  }`}
                >
                  {role()}
                </span>
              </label>
              <div class="join w-full">
                <input
                  type="text"
                  class="input input-bordered join-item flex-1 font-mono text-sm"
                  value={createdLink() ?? ''}
                  readonly
                />
                <button
                  type="button"
                  class={`btn join-item ${copied() ? 'btn-success' : 'btn-primary'}`}
                  onClick={handleCopyLink}
                >
                  <Show
                    when={!copied()}
                    fallback={
                      <>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Copied
                      </>
                    }
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    Copy
                  </Show>
                </button>
              </div>
              <label class="label">
                <span class="label-text-alt text-base-content/50">
                  Anyone with this link can {role() === 'editor' ? 'view and edit' : 'view'} this
                  project
                </span>
              </label>
            </div>

            <div class="modal-action">
              <button type="button" class="btn btn-ghost" onClick={handleCreateAnother}>
                Create Another
              </button>
              <button type="button" class="btn btn-primary" onClick={handleClose}>
                Done
              </button>
            </div>
          </div>
        }
      >
        {/* Form state - create new link */}
        <form onSubmit={handleSubmit} class="py-4 space-y-4">
          <p class="text-sm text-base-content/60">
            Create a link that gives anyone access to this project without requiring a username.
          </p>

          {/* Role Selection */}
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">Access Level</span>
            </label>
            <div class="flex gap-4">
              <label class="label cursor-pointer flex gap-2">
                <input
                  type="radio"
                  name="role"
                  class="radio radio-primary"
                  checked={role() === 'viewer'}
                  onChange={() => setRole('viewer')}
                />
                <div>
                  <span class="label-text font-medium">Viewer</span>
                  <p class="text-xs text-base-content/50">Can view only</p>
                </div>
              </label>
              <label class="label cursor-pointer flex gap-2">
                <input
                  type="radio"
                  name="role"
                  class="radio radio-warning"
                  checked={role() === 'editor'}
                  onChange={() => setRole('editor')}
                />
                <div>
                  <span class="label-text font-medium">Editor</span>
                  <p class="text-xs text-base-content/50">Can view and edit</p>
                </div>
              </label>
            </div>
          </div>

          {/* Expiration */}
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text">Expiration</span>
              <span class="label-text-alt text-base-content/50">Optional</span>
            </label>
            <select
              class="select select-bordered w-full"
              value={expiresInDays() ?? 'never'}
              onChange={(e) => {
                const val = e.currentTarget.value;
                setExpiresInDays(val === 'never' ? undefined : parseInt(val, 10));
              }}
            >
              <option value="never">Never expires</option>
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
            <label class="label">
              <span class="label-text-alt text-base-content/50">
                {expiresInDays()
                  ? `Link will expire in ${expiresInDays()} day${expiresInDays()! > 1 ? 's' : ''}`
                  : 'Link will remain active until you revoke it'}
              </span>
            </label>
          </div>

          {/* Warning for editor links */}
          <Show when={role() === 'editor'}>
            <div class="alert alert-warning">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span class="text-sm">
                Anyone with this link will be able to edit your project. Only share with people you
                trust.
              </span>
            </div>
          </Show>

          {/* Actions */}
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={isSubmitting()}>
              <Show when={isSubmitting()}>
                <span class="loading loading-spinner loading-sm"></span>
              </Show>
              Create Link
            </button>
          </div>
        </form>
      </Show>
    </Modal>
  );
}
