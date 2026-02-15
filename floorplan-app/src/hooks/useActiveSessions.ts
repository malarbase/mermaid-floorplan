/**
 * Hook for managing active user sessions via Better Auth's session APIs.
 *
 * Wraps authClient.listSessions(), revokeSession(), and revokeOtherSessions()
 * with SolidJS reactivity. Works identically in dev and production — in dev mode,
 * sessions will be empty since dev auth uses custom JWTs, not Better Auth sessions.
 */

import { createResource, createSignal } from 'solid-js';
import { authClient } from '~/lib/auth-client';

/** Session object returned by Better Auth's listSessions API */
export interface ActiveSession {
  id: string;
  token: string;
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
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
  const [version, setVersion] = createSignal(0);

  const [sessions, { refetch }] = createResource(
    () => version(),
    async () => {
      try {
        const result = await authClient.listSessions();
        // Better Auth returns { data: Session[] } or { data: null, error: ... }
        if (result.data) {
          return result.data as unknown as ActiveSession[];
        }
        return [];
      } catch {
        // In dev mode or when not authenticated, this will fail gracefully
        return [];
      }
    },
  );

  const revokeSession = async (token: string) => {
    await authClient.revokeSession({ token });
    setVersion((v) => v + 1);
  };

  const revokeOtherSessions = async () => {
    await authClient.revokeOtherSessions();
    setVersion((v) => v + 1);
  };

  return {
    /** Reactive accessor for the sessions list. Returns undefined while loading, [] if empty/error. */
    sessions,
    /** Revoke a specific session by its token */
    revokeSession,
    /** Revoke all sessions except the current one */
    revokeOtherSessions,
    /** Manually trigger a refresh of the sessions list */
    refetch,
  };
}
