/**
 * Hook for managing active user sessions.
 *
 * Session list is powered by a Convex real-time subscription so that updates
 * (new logins, revocations) appear instantly without polling. Revoke actions
 * still go through Better Auth's HTTP APIs; the Convex subscription picks up
 * the changes automatically.
 *
 * Note: Session revocation *detection* (auto-logout when current session is
 * revoked from another browser) is handled globally by SessionGuard via a
 * separate Convex subscription — not by this hook.
 */

import { useQuery } from 'convex-solidjs';
import { createMemo } from 'solid-js';
import { authClient } from '~/lib/auth-client';
import { api } from '../../convex/_generated/api';

/** Session object returned by the Convex listActiveSessions query */
export interface ActiveSession {
  id: string;
  token: string;
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

/** Parse browser name from a user agent string */
export function parseBrowserFromUA(ua?: string | null): string {
  if (!ua) return 'Unknown browser';

  // Order matters — check specific browsers before generic engines
  if (ua.includes('Edg/') || ua.includes('Edge/')) return 'Microsoft Edge';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  if (ua.includes('Brave')) return 'Brave';
  if (ua.includes('Vivaldi/')) return 'Vivaldi';
  if (ua.includes('Chrome/') && ua.includes('Safari/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';

  return 'Unknown browser';
}

/** Parse OS from a user agent string */
export function parseOSFromUA(ua?: string | null): string {
  if (!ua) return 'Unknown OS';

  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS';
  if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('CrOS')) return 'ChromeOS';

  return 'Unknown OS';
}

export function useActiveSessions() {
  // Real-time session list from Convex — updates instantly on any change
  const sessionsQuery = useQuery(api.auth.listActiveSessions, {});

  // Wrap the query result in a memo that returns ActiveSession[] or undefined
  const sessions = createMemo(() => {
    const data = sessionsQuery.data();
    if (data === undefined) return undefined; // still loading
    return data as ActiveSession[];
  });

  const isLoading = () => sessionsQuery.isLoading();

  const revokeSession = async (token: string) => {
    await authClient.revokeSession({ token });
    // No manual refetch needed — Convex subscription will update reactively
  };

  const revokeOtherSessions = async () => {
    await authClient.revokeOtherSessions();
    // No manual refetch needed — Convex subscription will update reactively
  };

  return {
    /** Reactive accessor for the sessions list. Returns undefined while loading, [] if empty/error. */
    sessions,
    /** Whether the sessions query is still loading */
    isLoading,
    /** Revoke a specific session by its token */
    revokeSession,
    /** Revoke all sessions except the current one */
    revokeOtherSessions,
  };
}
