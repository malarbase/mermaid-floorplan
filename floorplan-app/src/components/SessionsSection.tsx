/**
 * Sessions management section for the Settings page.
 *
 * Displays active sessions with device info, highlights the current session,
 * and allows revoking individual or all other sessions. Uses Better Auth's
 * built-in session APIs — in dev mode, sessions will be empty since dev auth
 * uses custom JWTs rather than Better Auth sessions.
 */

import { type Component, createMemo, createSignal, For, Show } from 'solid-js';
import {
  type ActiveSession,
  parseBrowserFromUA,
  parseOSFromUA,
  useActiveSessions,
} from '~/hooks/useActiveSessions';
import { authClient } from '~/lib/auth-client';

/** Format a relative time string like "2 hours ago" or "Just now" */
function formatRelativeTime(date: Date | string | number): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString();
}

/** SVG icon for a desktop/laptop device */
const DesktopIcon: Component = () => (
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

/** SVG icon for a mobile device */
const MobileIcon: Component = () => (
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

function isMobileUA(ua?: string | null): boolean {
  if (!ua) return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

/** A single session row */
const SessionRow: Component<{
  session: ActiveSession;
  isCurrent: boolean;
  onRevoke: (token: string) => Promise<void>;
}> = (props) => {
  const [isRevoking, setIsRevoking] = createSignal(false);

  const browser = () => parseBrowserFromUA(props.session.userAgent);
  const os = () => parseOSFromUA(props.session.userAgent);
  const isMobile = () => isMobileUA(props.session.userAgent);
  const lastActive = () => formatRelativeTime(props.session.updatedAt);

  const handleRevoke = async () => {
    setIsRevoking(true);
    try {
      await props.onRevoke(props.session.token);
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div
      class="flex items-center gap-3 p-3 rounded-lg"
      classList={{
        'bg-primary/5 ring-1 ring-primary/20': props.isCurrent,
        'bg-base-200': !props.isCurrent,
      }}
    >
      {/* Device icon */}
      <div class="text-base-content/60">
        <Show when={isMobile()} fallback={<DesktopIcon />}>
          <MobileIcon />
        </Show>
      </div>

      {/* Info */}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-medium text-sm truncate">
            {browser()} on {os()}
          </span>
          <Show when={props.isCurrent}>
            <span class="badge badge-primary badge-xs">Current</span>
          </Show>
        </div>
        <div class="text-xs text-base-content/50 mt-0.5">
          <Show when={props.session.ipAddress}>
            <span>{props.session.ipAddress}</span>
            <span class="mx-1">&middot;</span>
          </Show>
          <span>Active {lastActive()}</span>
        </div>
      </div>

      {/* Revoke button (not for current session) */}
      <Show when={!props.isCurrent}>
        <button
          type="button"
          class="btn btn-ghost btn-xs text-error"
          disabled={isRevoking()}
          onClick={handleRevoke}
        >
          <Show when={isRevoking()} fallback="Revoke">
            <span class="loading loading-spinner loading-xs" />
          </Show>
        </button>
      </Show>
    </div>
  );
};

export const SessionsSection: Component = () => {
  const { sessions, revokeSession, revokeOtherSessions } = useActiveSessions();
  const [isRevokingAll, setIsRevokingAll] = createSignal(false);
  const [currentSessionToken, setCurrentSessionToken] = createSignal<string | null>(null);

  // Fetch the current session token to identify which session is "this browser"
  // We use getSession() once to get the token, then compare against listSessions
  void (async () => {
    try {
      const result = await authClient.getSession();
      if (result.data?.session) {
        setCurrentSessionToken((result.data.session as { token?: string }).token ?? null);
      }
    } catch {
      // Not authenticated or in dev mode — no current session token
    }
  })();

  const sessionList = createMemo(() => sessions() ?? []);
  const sessionCount = createMemo(() => sessionList().length);
  const otherSessionCount = createMemo(() => {
    const token = currentSessionToken();
    if (!token) return sessionCount();
    return sessionList().filter((s) => s.token !== token).length;
  });

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      await revokeOtherSessions();
    } finally {
      setIsRevokingAll(false);
    }
  };

  return (
    <div class="card bg-base-100 shadow-xl mb-6">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <h2 class="card-title text-lg">Sessions</h2>
            <Show when={sessionCount() > 0}>
              <span class="badge badge-neutral badge-sm">{sessionCount()}</span>
            </Show>
          </div>
          <Show when={otherSessionCount() > 0}>
            <button
              type="button"
              class="btn btn-ghost btn-xs text-error"
              disabled={isRevokingAll()}
              onClick={handleRevokeAll}
            >
              <Show when={isRevokingAll()} fallback="Revoke all other sessions">
                <span class="loading loading-spinner loading-xs" />
              </Show>
            </button>
          </Show>
        </div>

        {/* Loading state */}
        <Show when={sessions.loading}>
          <div class="flex justify-center py-6">
            <span class="loading loading-spinner loading-md" />
          </div>
        </Show>

        {/* Sessions list */}
        <Show when={!sessions.loading}>
          <Show
            when={sessionCount() > 0}
            fallback={
              <div class="text-center py-6 text-base-content/50">
                <svg
                  class="w-8 h-8 mx-auto mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p class="text-sm">No active sessions</p>
                <Show when={import.meta.env.DEV}>
                  <p class="text-xs mt-1 text-base-content/40">
                    Session tracking requires OAuth login (production mode)
                  </p>
                </Show>
              </div>
            }
          >
            <div class="space-y-2">
              <For each={sessionList()}>
                {(session) => (
                  <SessionRow
                    session={session}
                    isCurrent={session.token === currentSessionToken()}
                    onRevoke={revokeSession}
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
};

export default SessionsSection;
