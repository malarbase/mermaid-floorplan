import type { FunctionReference } from 'convex/server';
import { useMutation } from 'convex-solidjs';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';

// Type-safe API reference builder for when generated files don't exist yet
// This will be replaced with proper imports once `npx convex dev` generates the API
const api = {
  projects: {
    createVersion: 'projects:createVersion' as unknown as FunctionReference<'mutation'>,
  },
};

interface CreateVersionModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Project ID to create version for */
  projectId: string;
  /** Current version name to branch from (defaults to project's default) */
  fromVersion?: string;
  /** Callback when version is created successfully */
  onSuccess?: (versionId: string, versionName: string) => void;
  /** Username for URL preview */
  username: string;
  /** Project slug for URL preview */
  projectSlug: string;
}

/**
 * Modal for creating a new version (branch) from an existing version.
 * Similar to Git's branch creation - creates a new named reference
 * pointing to the same snapshot as the source version.
 */
export function CreateVersionModal(props: CreateVersionModalProps) {
  const [versionName, setVersionName] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [error, setError] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Mutation to create version
  const createVersionMutation = useMutation(api.projects.createVersion);

  // Reset form when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setVersionName('');
      setDescription('');
      setError('');
    }
  });

  // Normalize version name (like slug)
  const handleVersionNameChange = (value: string) => {
    // Allow alphanumeric, hyphens, underscores, and dots
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9\-_.]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
    setVersionName(normalized);
    setError('');
  };

  // Validation
  const isValid = createMemo(() => {
    const name = versionName();
    if (name.length < 1) return false;
    if (name.length > 50) return false;
    // Reserved names
    if (name === 'main' && !props.fromVersion) return false;
    return true;
  });

  const validationMessage = createMemo(() => {
    const name = versionName();
    if (name.length === 0) return '';
    if (name.length > 50) return 'Version name must be 50 characters or less';
    if (name === 'main') return "'main' is usually the default version";
    return '';
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!isValid()) {
      setError('Please enter a valid version name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const versionId = await createVersionMutation.mutate({
        projectId: props.projectId,
        name: versionName(),
        fromVersion: props.fromVersion,
        description: description() || undefined,
      });

      props.onSuccess?.(versionId as string, versionName());
      props.onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create version';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Suggested version names
  const suggestions = createMemo(() => {
    const baseSuggestions = ['draft', 'v2', 'client-review', 'final', 'experiment'];
    // Filter out the source version name if present
    return baseSuggestions.filter((s) => s !== props.fromVersion);
  });

  const selectSuggestion = (suggestion: string) => {
    setVersionName(suggestion);
    setError('');
  };

  return (
    <Show when={props.isOpen}>
      <div class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            Create New Version
          </h3>

          <p class="py-4 text-base-content/70">
            Create a new version (branch) from{' '}
            <span class="font-mono font-medium">{props.fromVersion || 'main'}</span>. The new
            version will start with the same content and can be edited independently.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Version name input */}
            <div class="form-control w-full">
              <label class="label">
                <span class="label-text">Version Name</span>
                <span class="label-text-alt text-base-content/50">1-50 characters</span>
              </label>
              <input
                type="text"
                placeholder="e.g., v2, draft, client-review"
                class={`input input-bordered w-full ${
                  versionName().length > 0 ? (isValid() ? 'input-success' : 'input-error') : ''
                }`}
                value={versionName()}
                onInput={(e) => handleVersionNameChange(e.currentTarget.value)}
                maxLength={50}
                required
                autofocus
              />

              {/* Validation message */}
              <label class="label">
                <Show when={validationMessage()}>
                  <span class="label-text-alt text-warning">{validationMessage()}</span>
                </Show>
              </label>
            </div>

            {/* Suggestions */}
            <div class="mt-2">
              <span class="text-sm text-base-content/70">Suggestions:</span>
              <div class="flex flex-wrap gap-2 mt-2">
                <For each={suggestions()}>
                  {(suggestion) => (
                    <button
                      type="button"
                      class={`btn btn-sm ${
                        versionName() === suggestion ? 'btn-primary' : 'btn-ghost'
                      }`}
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  )}
                </For>
              </div>
            </div>

            {/* Description (optional) */}
            <div class="form-control w-full mt-4">
              <label class="label">
                <span class="label-text">Description (optional)</span>
              </label>
              <textarea
                class="textarea textarea-bordered w-full"
                placeholder="What's this version for?"
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                rows={2}
              />
            </div>

            {/* Error message */}
            <Show when={error()}>
              <div class="alert alert-error mt-4">
                <svg class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error()}</span>
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
                Create Version
              </button>
            </div>
          </form>

          {/* URL Preview */}
          <Show when={versionName().length >= 1 && isValid()}>
            <div class="mt-4 p-4 bg-base-200 rounded-lg">
              <span class="text-sm text-base-content/70">Version URL:</span>
              <div class="font-mono text-sm mt-1">
                /u/{props.username}/{props.projectSlug}/v/
                <span class="text-primary">{versionName()}</span>
              </div>
            </div>
          </Show>
        </div>

        {/* Modal backdrop */}
        <div class="modal-backdrop" onClick={() => props.onClose()}></div>
      </div>
    </Show>
  );
}

export default CreateVersionModal;
