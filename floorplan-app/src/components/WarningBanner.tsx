import { useMutation, useQuery } from 'convex-solidjs';
import { type Component, createMemo, Show } from 'solid-js';
import { useSession } from '~/lib/auth-client';
import { api } from '../../convex/_generated/api';

/**
 * Dismissible warning/ban banner shown at the top of every page.
 * Subscribes to the latest unread warning or ban notification.
 * Renders nothing when there are no unread warnings.
 *
 * Mounted in app.tsx alongside SessionGuard, inside the ConvexProvider.
 */
const WarningBanner: Component = () => {
  const sessionSignal = useSession();
  const user = createMemo(() => sessionSignal()?.data?.user);

  const warningQuery = useQuery(
    api.notifications.getUnreadWarnings,
    () => ({}),
    () => ({ enabled: !!user() }),
  );

  const dismissWarning = useMutation(api.notifications.dismissWarning);

  const warning = createMemo(() => {
    return warningQuery.data() as
      | { _id: string; type: string; title: string; message?: string; createdAt: number }
      | null
      | undefined;
  });

  const handleDismiss = async () => {
    const w = warning();
    if (w) {
      await dismissWarning.mutate({ notificationId: w._id as any });
    }
  };

  return (
    <Show when={warning()}>
      {(w) => (
        <div
          class="alert alert-warning shadow-lg mx-auto"
          classList={{
            'alert-error': w().type === 'ban',
          }}
        >
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
            <h3 class="font-bold">{w().title}</h3>
            <Show when={w().message}>
              <div class="text-sm">{w().message}</div>
            </Show>
          </div>
          <button type="button" class="btn btn-sm btn-ghost" onClick={handleDismiss}>
            Dismiss
          </button>
        </div>
      )}
    </Show>
  );
};

export default WarningBanner;
