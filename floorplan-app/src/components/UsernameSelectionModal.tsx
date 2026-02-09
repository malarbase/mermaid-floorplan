import { useMutation, useQuery } from 'convex-solidjs';
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js';
import { getMockSession, setMockSession } from '~/lib/mock-auth';
import { api } from '../../convex/_generated/api';

interface UsernameSelectionModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isFirstLogin?: boolean;
}

/**
 * Modal for selecting/setting a username.
 * Used for first-login username selection or changing username.
 *
 * For first login, the modal cannot be dismissed without selecting a username.
 * For username changes, onClose is called to dismiss the modal.
 */
export function UsernameSelectionModal(props: UsernameSelectionModalProps) {
  const [username, setUsername] = createSignal('');
  const [debouncedUsername, setDebouncedUsername] = createSignal(''); // For query
  const [error, setError] = createSignal('');
  const [isChecking, setIsChecking] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Get suggested usernames using standard Convex hook
  const suggestionsQuery = useQuery(api.users.suggestUsername, {});

  // Check if username is available (uses debounced username to avoid excessive queries)
  const availabilityQuery = useQuery(
    api.users.isUsernameAvailable,
    () => ({ username: debouncedUsername() }),
    () => ({ enabled: debouncedUsername().length >= 3 }),
  );

  // Mutation to set username using standard Convex hook
  const setUsernameMutation = useMutation(api.users.setUsername);

  // Debounce username availability check
  let debounceTimeout: ReturnType<typeof setTimeout>;

  const handleUsernameChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(normalized);
    setError('');
    setIsChecking(true);

    // Debounce the query - only update debouncedUsername after user stops typing
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      setDebouncedUsername(normalized);
      setIsChecking(false);
    }, 500); // 500ms debounce before checking availability
  };

  // Compute availability status (only valid when username matches what was queried)
  const availability = createMemo(() => {
    const result = availabilityQuery.data() as { available: boolean; reason: string } | undefined;
    // Only return result if username matches the debounced value that was queried
    if (!result || username().length < 3 || username() !== debouncedUsername()) return null;
    return result;
  });

  const isAvailable = createMemo(() => {
    const avail = availability();
    return avail?.available === true;
  });

  const availabilityMessage = createMemo(() => {
    const avail = availability();
    if (!avail) return '';

    if (avail.available) {
      if (avail.reason === 'reclaim') {
        return 'You can reclaim this username (you previously owned it)';
      }
      return 'Username is available!';
    } else {
      switch (avail.reason) {
        case 'invalid_format':
          return 'Username must be 3-30 characters, alphanumeric with underscores';
        case 'taken':
          return 'This username is already taken';
        case 'grace_period':
          return 'This username was recently released and is in a 90-day grace period';
        default:
          return 'Username is not available';
      }
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!isAvailable()) {
      setError('Please choose an available username');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await setUsernameMutation.mutate({ username: username() });

      // Update mock session in dev mode so the UI reflects the new username immediately
      if (import.meta.env.DEV) {
        const currentMockSession = getMockSession();
        if (currentMockSession) {
          setMockSession({ ...currentMockSession, username: username() });
        }
      }

      props.onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set username');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setUsername(suggestion);
    setDebouncedUsername(suggestion); // Immediate check for clicked suggestions
    setError('');
  };

  // Get suggestions data
  const suggestions = createMemo(() => {
    const data = suggestionsQuery.data();
    return (data as string[] | undefined) ?? [];
  });

  // Set first suggestion as default when loaded
  createEffect(() => {
    const suggs = suggestions();
    if (suggs.length > 0 && !username()) {
      setUsername(suggs[0]);
      setDebouncedUsername(suggs[0]); // Trigger availability check for default
    }
  });

  return (
    <Show when={props.isOpen}>
      <div class="modal modal-open">
        <div class="modal-box">
          <h3 class="font-bold text-lg">
            {props.isFirstLogin ? 'Welcome! Choose your username' : 'Change username'}
          </h3>

          <p class="py-4 text-base-content/70">
            {props.isFirstLogin
              ? 'Your username will be used in your profile URL and to identify you across the platform.'
              : 'Change your username. Note: Your old username will be reserved for 90 days.'}
          </p>

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
                  placeholder="yourname"
                  class={`input input-bordered join-item w-full ${
                    username().length >= 3 ? (isAvailable() ? 'input-success' : 'input-error') : ''
                  }`}
                  value={username()}
                  onInput={(e) => handleUsernameChange(e.currentTarget.value)}
                  maxLength={30}
                  minLength={3}
                  pattern="[a-z0-9_]+"
                  required
                />
              </div>

              {/* Availability status */}
              <label class="label">
                <Show when={isChecking() || availabilityQuery.isLoading()}>
                  <span class="label-text-alt flex items-center gap-2">
                    <span class="loading loading-spinner loading-xs"></span>
                    Checking availability...
                  </span>
                </Show>
                <Show
                  when={!isChecking() && !availabilityQuery.isLoading() && username().length >= 3}
                >
                  <span class={`label-text-alt ${isAvailable() ? 'text-success' : 'text-error'}`}>
                    {availabilityMessage()}
                  </span>
                </Show>
              </label>
            </div>

            {/* Suggestions */}
            <Show when={suggestions().length > 0}>
              <div class="mt-4">
                <span class="text-sm text-base-content/70">Suggestions:</span>
                <div class="flex flex-wrap gap-2 mt-2">
                  <For each={suggestions()}>
                    {(suggestion) => (
                      <button
                        type="button"
                        class={`btn btn-sm ${username() === suggestion ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        @{suggestion}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

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
              <Show when={!props.isFirstLogin}>
                <button
                  type="button"
                  class="btn"
                  onClick={() => props.onClose?.()}
                  disabled={isSubmitting()}
                >
                  Cancel
                </button>
              </Show>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={!isAvailable() || isSubmitting() || isChecking()}
              >
                <Show when={isSubmitting()}>
                  <span class="loading loading-spinner loading-sm"></span>
                </Show>
                {props.isFirstLogin ? 'Get Started' : 'Save Username'}
              </button>
            </div>
          </form>

          {/* URL Preview */}
          <Show when={username().length >= 3 && isAvailable()}>
            <div class="mt-4 p-4 bg-base-200 rounded-lg">
              <span class="text-sm text-base-content/70">Your profile URL:</span>
              <div class="font-mono text-sm mt-1">
                floorplan.app/u/<span class="text-primary">{username()}</span>
              </div>
            </div>
          </Show>
        </div>

        {/* Modal backdrop - only clickable for non-first-login */}
        <Show when={!props.isFirstLogin}>
          <div class="modal-backdrop" onClick={() => props.onClose?.()}></div>
        </Show>
        <Show when={props.isFirstLogin}>
          <div class="modal-backdrop"></div>
        </Show>
      </div>
    </Show>
  );
}

/**
 * Hook to manage username selection modal state.
 * Automatically shows modal for users with temp usernames.
 */
export function useUsernameSelectionModal() {
  const [isOpen, setIsOpen] = createSignal(false);
  const hasTempUsernameQuery = useQuery(api.users.hasTempUsername, {});

  // Get the actual boolean value
  const hasTempUsername = createMemo(() => {
    return hasTempUsernameQuery.data() as boolean | undefined;
  });

  // Show modal automatically for users with temp usernames
  createEffect(() => {
    const hasTemp = hasTempUsername();
    if (hasTemp === true) {
      setIsOpen(true);
    }
  });

  return {
    isOpen,
    setIsOpen,
    isFirstLogin: () => hasTempUsername() === true,
    close: () => {
      // Only allow closing if user doesn't have temp username
      if (hasTempUsername() !== true) {
        setIsOpen(false);
      }
    },
  };
}
