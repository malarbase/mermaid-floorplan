/**
 * Global session validity guard using Convex real-time subscriptions.
 *
 * Subscribes to the `isSessionValid` Convex query which checks whether the
 * caller's Better Auth session still exists. When a session is revoked from
 * another browser, Convex pushes the update instantly over the existing
 * WebSocket — no polling needed.
 *
 * Uses Solid's `on()` prev-value tracking to detect true → false transitions
 * reactively — no mutable flags needed.
 *
 * This component renders nothing — it just reacts to subscription changes.
 * Mount it once in the app root layout, inside the ConvexProvider.
 */

import { useNavigate } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { type Component, createEffect, on } from 'solid-js';
import { clearDevLogin, isDevLoggedIn } from '~/lib/mock-auth';
import { api } from '../../convex/_generated/api';

/** Pages where we should NOT redirect (would cause loops) */
const SKIP_PATHS = ['/login', '/dev-login', '/register', '/banned'];

const SessionGuard: Component = () => {
  const navigate = useNavigate();
  const sessionQuery = useQuery(api.auth.isSessionValid, {});

  createEffect(
    on(
      () => sessionQuery.data(),
      (valid, prev) => {
        // Don't redirect on auth pages
        if (
          typeof window !== 'undefined' &&
          SKIP_PATHS.some((p) => window.location.pathname.startsWith(p))
        ) {
          return;
        }

        // Only act when session becomes definitively invalid after the user
        // was previously authenticated. Solid's `on()` tracks prev for us:
        //   prev === true              → was valid, now revoked
        //   prev === undefined + devLogin → first load, but session already gone
        const wasAuthenticated = prev === true || (prev === undefined && isDevLoggedIn());

        if (valid === false && wasAuthenticated) {
          if (import.meta.env.DEV) {
            void clearDevLogin().then(() => {
              navigate('/dev-login?reason=session_revoked');
            });
          } else {
            navigate('/login?reason=session_revoked');
          }
        }
      },
    ),
  );

  return null;
};

export default SessionGuard;
