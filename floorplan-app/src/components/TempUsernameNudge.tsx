import { createSignal, Show, createMemo } from "solid-js";
import { useQuery } from "convex-solidjs";
import { api } from "../../convex/_generated/api";

interface TempUsernameNudgeProps {
  onSetUsername: () => void;
}

/**
 * Dashboard nudge/banner for users with temporary usernames.
 * Encourages users to set a proper username for their profile URL.
 */
export function TempUsernameNudge(props: TempUsernameNudgeProps) {
  const [isDismissed, setIsDismissed] = createSignal(false);
  
  // Query to check if user has a temp username using standard Convex hook
  const hasTempUsernameQuery = useQuery(api.users.hasTempUsername, {});
  
  const hasTempUsername = createMemo(() => {
    return hasTempUsernameQuery.data() as boolean | undefined;
  });

  // Only show if user has temp username and hasn't dismissed
  const shouldShow = createMemo(() => {
    return hasTempUsername() === true && !isDismissed();
  });

  return (
    <Show when={shouldShow()}>
      <div class="alert alert-warning shadow-lg mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h3 class="font-bold">Complete your profile</h3>
          <div class="text-sm">
            You're using a temporary username. Set a permanent username to get a custom profile URL.
          </div>
        </div>
        <div class="flex gap-2">
          <button
            class="btn btn-sm btn-ghost"
            onClick={() => setIsDismissed(true)}
          >
            Later
          </button>
          <button
            class="btn btn-sm btn-primary"
            onClick={() => props.onSetUsername()}
          >
            Set Username
          </button>
        </div>
      </div>
    </Show>
  );
}
