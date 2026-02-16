import { useMutation, useQuery } from 'convex-solidjs';
import { type Component, createMemo, createSignal, For, Show } from 'solid-js';
import { api } from '../../convex/_generated/api';

/** Type-specific icon and optional navigation href */
function getNotificationConfig(type: string): { icon: string; href?: string } {
  switch (type) {
    case 'collaborator.invite':
      return {
        icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
      };
    case 'collaborator.roleChange':
      return {
        icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
      };
    case 'collaborator.remove':
      return {
        icon: 'M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6',
      };
    case 'transfer.requested':
    case 'transfer.accepted':
    case 'transfer.cancelled':
      return { icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', href: '/dashboard' };
    case 'project.forked':
      return {
        icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
      };
    case 'project.featured':
      return {
        icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      };
    case 'warning':
      return {
        icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
      };
    case 'ban':
      return {
        icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
      };
    case 'ban_lifted':
      return { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' };
    case 'admin.promoted':
      return {
        icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      };
    default:
      return {
        icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      };
  }
}

/** Format a timestamp as relative time (e.g., "2m ago", "3h ago", "5d ago") */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

type Notification = {
  _id: string;
  type: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
  readAt?: number;
  createdAt: number;
};

/**
 * Inner list that mounts only on first open -- this is how we defer the
 * `getNotifications` subscription without using the `enabled` option
 * (which doesn't reliably start a subscription after a false→true transition).
 */
const NotificationList: Component = () => {
  const notificationsQuery = useQuery(api.notifications.getNotifications, () => ({ limit: 20 }));
  const markAsRead = useMutation(api.notifications.markAsRead);
  const [showAll, setShowAll] = createSignal(false);

  const notifications = createMemo((): Notification[] | null => {
    const data = notificationsQuery.data();
    if (data === undefined) return null;
    return data as Notification[];
  });

  const visible = createMemo((): Notification[] | null => {
    const all = notifications();
    if (!all) return null;
    if (showAll()) return all;
    return all.filter((n) => !n.readAt);
  });

  const hasReadNotifications = createMemo(() => notifications()?.some((n) => n.readAt) ?? false);

  const handleNotificationClick = async (notifId: string) => {
    // biome-ignore lint/suspicious/noExplicitAny: Convex Id type cast
    await markAsRead.mutate({ notificationId: notifId as any });
  };

  return (
    <Show
      when={visible()}
      fallback={
        <div class="px-4 py-8 text-center text-base-content/50 text-sm">
          <span class="loading loading-spinner loading-sm" />
        </div>
      }
    >
      {(items) => (
        <>
          <Show
            when={items().length > 0}
            fallback={
              <div class="px-4 py-8 text-center text-base-content/50 text-sm">
                {showAll() ? 'No notifications' : 'No new notifications'}
              </div>
            }
          >
            <ul class="flex flex-col gap-0.5 p-1">
              <For each={items()}>
                {(notif) => {
                  const config = getNotificationConfig(notif.type);
                  return (
                    <li>
                      <button
                        type="button"
                        class="flex items-start gap-2 px-2.5 py-2 rounded-lg w-full text-left hover:bg-base-200 transition-colors"
                        classList={{ 'bg-primary/5': !notif.readAt }}
                        onClick={() => handleNotificationClick(notif._id)}
                      >
                        <div class="flex-shrink-0 mt-0.5">
                          <svg
                            aria-hidden="true"
                            class="w-4 h-4 text-base-content/60"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d={config.icon}
                            />
                          </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-medium text-base-content">{notif.title}</p>
                          <Show when={notif.message}>
                            <p class="text-xs text-base-content/60 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          </Show>
                          <p class="text-xs text-base-content/40 mt-1">
                            {relativeTime(notif.createdAt)}
                          </p>
                        </div>
                        <Show when={!notif.readAt}>
                          <div class="flex-shrink-0 mt-1.5">
                            <div class="w-2 h-2 rounded-full bg-primary" />
                          </div>
                        </Show>
                      </button>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
          <Show when={hasReadNotifications()}>
            <div class="border-t border-base-content/10 px-4 py-2 text-center">
              <button
                type="button"
                class="text-xs text-primary hover:underline"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll() ? 'Show unread only' : 'Show all'}
              </button>
            </div>
          </Show>
        </>
      )}
    </Show>
  );
};

export const NotificationBell: Component = () => {
  const [hasOpened, setHasOpened] = createSignal(false);

  const unreadCountQuery = useQuery(api.notifications.getUnreadCount, {});
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const unreadCount = createMemo(() => (unreadCountQuery.data() as number) ?? 0);

  const handleMarkAllRead = async () => {
    await markAllAsRead.mutate({});
  };

  return (
    <details
      class="dropdown dropdown-end"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) setHasOpened(true);
      }}
    >
      <summary class="btn btn-ghost btn-sm btn-circle list-none" aria-label="Notifications">
        <div class="indicator">
          <svg
            aria-hidden="true"
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <Show when={unreadCount() > 0}>
            <span class="badge badge-sm badge-primary indicator-item">
              {unreadCount() > 99 ? '99+' : unreadCount()}
            </span>
          </Show>
        </div>
      </summary>

      <div class="dropdown-content mt-3 z-[100] shadow-xl bg-base-100 rounded-box w-96 border border-base-content/15 ring-1 ring-base-content/10">
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-base-content/10">
          <span class="font-semibold text-sm">Notifications</span>
          <Show when={unreadCount() > 0}>
            <button
              type="button"
              class="text-xs text-primary hover:underline"
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </button>
          </Show>
        </div>

        {/* Notification list — deferred via child component mount */}
        <div class="max-h-80 overflow-y-auto">
          <Show
            when={hasOpened()}
            fallback={
              <div class="px-4 py-8 text-center text-base-content/50 text-sm">No notifications</div>
            }
          >
            <NotificationList />
          </Show>
        </div>
      </div>
    </details>
  );
};

export default NotificationBell;
