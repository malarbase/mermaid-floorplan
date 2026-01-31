import { createSignal, createMemo, Show, For, createEffect } from "solid-js";
import { useQuery, useMutation } from "convex-solidjs";
import type { FunctionReference } from "convex/server";

// Type-safe API reference builder for when generated files don't exist yet
// This will be replaced with proper imports once `npx convex dev` generates the API
const api = {
  users: {
    suggestUsername: "users:suggestUsername" as unknown as FunctionReference<"query">,
    isUsernameAvailable: "users:isUsernameAvailable" as unknown as FunctionReference<"query">,
    setUsername: "users:setUsername" as unknown as FunctionReference<"mutation">,
    getCurrentUser: "users:getCurrentUser" as unknown as FunctionReference<"query">,
  },
};

type Step = "select" | "confirm";

interface UsernameChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal for changing username with confirmation step.
 * 
 * Flow:
 * 1. User selects new username (with availability check)
 * 2. User confirms the change (warning about old URL becoming unavailable)
 * 3. Username is updated, old username added to 90-day grace period
 */
export function UsernameChangeModal(props: UsernameChangeModalProps) {
  const [step, setStep] = createSignal<Step>("select");
  const [username, setUsername] = createSignal("");
  const [error, setError] = createSignal("");
  const [isChecking, setIsChecking] = createSignal(false);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Get current user to show current username
  const currentUserQuery = useQuery(
    api.users.getCurrentUser,
    () => ({})
  );
  
  // Check if username is available
  const availabilityQuery = useQuery(
    api.users.isUsernameAvailable,
    () => username().length >= 3 ? { username: username() } : ({ _skip: true } as never)
  );
  
  // Mutation to set username
  const setUsernameMutation = useMutation(api.users.setUsername);

  // Get current user data
  const currentUser = createMemo(() => {
    return currentUserQuery.data() as { username: string; displayName?: string } | null | undefined;
  });

  const currentUsername = createMemo(() => currentUser()?.username ?? "");

  // Reset state when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setStep("select");
      setUsername("");
      setError("");
      setIsChecking(false);
      setIsSubmitting(false);
    }
  });

  // Debounce username availability check
  let debounceTimeout: ReturnType<typeof setTimeout>;
  
  const handleUsernameChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(normalized);
    setError("");
    setIsChecking(true);
    
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      setIsChecking(false);
    }, 300);
  };

  // Compute availability status
  const availability = createMemo(() => {
    const result = availabilityQuery.data() as { available: boolean; reason: string } | undefined;
    if (!result || username().length < 3) return null;
    return result;
  });

  const isAvailable = createMemo(() => {
    const avail = availability();
    return avail?.available === true;
  });

  const isSameUsername = createMemo(() => {
    return username().toLowerCase() === currentUsername().toLowerCase();
  });

  const availabilityMessage = createMemo(() => {
    if (isSameUsername()) {
      return "This is your current username";
    }

    const avail = availability();
    if (!avail) return "";
    
    if (avail.available) {
      if (avail.reason === "reclaim") {
        return "You can reclaim this username (you previously owned it)";
      }
      return "Username is available!";
    } else {
      switch (avail.reason) {
        case "invalid_format":
          return "Username must be 3-30 characters, alphanumeric with underscores";
        case "taken":
          return "This username is already taken";
        case "grace_period":
          return "This username was recently released and is in a 90-day grace period";
        default:
          return "Username is not available";
      }
    }
  });

  const canProceed = createMemo(() => {
    return isAvailable() && !isSameUsername() && !isChecking();
  });

  const handleSelectSubmit = (e: Event) => {
    e.preventDefault();
    
    if (!canProceed()) {
      setError("Please choose an available username");
      return;
    }

    // Move to confirmation step
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      await setUsernameMutation.mutate({ username: username() });
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change username");
      // Go back to select step on error
      setStep("select");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep("select");
    setError("");
  };

  return (
    <Show when={props.isOpen}>
      <div class="modal modal-open">
        <div class="modal-box">
          {/* Step 1: Select new username */}
          <Show when={step() === "select"}>
            <h3 class="font-bold text-lg">Change Username</h3>
            
            <p class="py-4 text-base-content/70">
              Choose a new username. Your current username <span class="font-mono text-primary">@{currentUsername()}</span> will be reserved for 90 days.
            </p>

            <form onSubmit={handleSelectSubmit}>
              {/* Current username display */}
              <div class="form-control w-full mb-4">
                <label class="label">
                  <span class="label-text text-base-content/50">Current username</span>
                </label>
                <div class="input input-bordered flex items-center bg-base-200">
                  <span class="text-base-content/50">@{currentUsername()}</span>
                </div>
              </div>

              {/* New username input */}
              <div class="form-control w-full">
                <label class="label">
                  <span class="label-text">New username</span>
                  <span class="label-text-alt text-base-content/50">
                    3-30 characters
                  </span>
                </label>
                <div class="join w-full">
                  <span class="join-item btn btn-disabled no-animation">@</span>
                  <input
                    type="text"
                    placeholder="newname"
                    class={`input input-bordered join-item w-full ${
                      username().length >= 3
                        ? isSameUsername()
                          ? "input-warning"
                          : isAvailable()
                            ? "input-success"
                            : "input-error"
                        : ""
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
                  <Show when={!isChecking() && !availabilityQuery.isLoading() && username().length >= 3}>
                    <span class={`label-text-alt ${
                      isSameUsername()
                        ? "text-warning"
                        : isAvailable()
                          ? "text-success"
                          : "text-error"
                    }`}>
                      {availabilityMessage()}
                    </span>
                  </Show>
                </label>
              </div>

              {/* Error message */}
              <Show when={error()}>
                <div class="alert alert-error mt-4">
                  <svg class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={!canProceed()}
                >
                  Continue
                </button>
              </div>
            </form>

            {/* URL Preview */}
            <Show when={username().length >= 3 && isAvailable() && !isSameUsername()}>
              <div class="mt-4 p-4 bg-base-200 rounded-lg">
                <span class="text-sm text-base-content/70">Your new profile URL:</span>
                <div class="font-mono text-sm mt-1">
                  floorplan.app/u/<span class="text-primary">{username()}</span>
                </div>
              </div>
            </Show>
          </Show>

          {/* Step 2: Confirm username change */}
          <Show when={step() === "confirm"}>
            <h3 class="font-bold text-lg">Confirm Username Change</h3>
            
            <div class="py-4">
              <div class="alert alert-warning mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 class="font-bold">Important: This action has consequences</h4>
                  <p class="text-sm">Please review before confirming.</p>
                </div>
              </div>

              <div class="space-y-4">
                <div class="flex items-center gap-4 p-4 bg-base-200 rounded-lg">
                  <div class="flex-1">
                    <div class="text-sm text-base-content/50">Current</div>
                    <div class="font-mono text-lg line-through text-base-content/50">
                      @{currentUsername()}
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-base-content/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div class="flex-1">
                    <div class="text-sm text-base-content/50">New</div>
                    <div class="font-mono text-lg text-primary">
                      @{username()}
                    </div>
                  </div>
                </div>

                <div class="text-sm space-y-2">
                  <div class="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-success shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Your projects will be accessible at their new URLs</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-warning shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      <span class="font-mono">@{currentUsername()}</span> will be reserved for 90 days - only you can reclaim it
                    </span>
                  </div>
                  <div class="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-info shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Links to your old username will show a redirect notice</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            <Show when={error()}>
              <div class="alert alert-error mt-4">
                <svg class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error()}</span>
              </div>
            </Show>

            {/* Actions */}
            <div class="modal-action">
              <button
                type="button"
                class="btn"
                onClick={handleBack}
                disabled={isSubmitting()}
              >
                Back
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={handleConfirm}
                disabled={isSubmitting()}
              >
                <Show when={isSubmitting()}>
                  <span class="loading loading-spinner loading-sm"></span>
                </Show>
                Change Username
              </button>
            </div>
          </Show>
        </div>
        
        {/* Modal backdrop */}
        <div class="modal-backdrop" onClick={() => !isSubmitting() && props.onClose()}></div>
      </div>
    </Show>
  );
}

/**
 * Hook to manage username change modal state.
 */
export function useUsernameChangeModal() {
  const [isOpen, setIsOpen] = createSignal(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
