/**
 * Global ban status guard using Convex real-time subscriptions.
 *
 * Subscribes to `users.getBanStatus` which bypasses the ban filter in
 * getCurrentUser, allowing the guard to read bannedUntil for banned users.
 * When an active ban is detected, navigates to `/banned`.
 * When a ban is lifted, navigates back to `/dashboard`.
 *
 * Separation of concerns:
 * - SessionGuard handles session lifecycle (authentication)
 * - BanGuard handles ban status (authorization)
 *
 * This component renders nothing — it just reacts to subscription changes.
 * Mount it once in the app root layout, inside the ConvexProvider.
 */

import { useLocation, useNavigate } from '@solidjs/router';
import { useQuery } from 'convex-solidjs';
import { type Component, createEffect, createSignal } from 'solid-js';
import { api } from '../../convex/_generated/api';

/** Skip /banned (prevent loops) and /dev-login (allow persona switching). */
const SKIP_PATHS = ['/banned', '/dev-login'];

const BanGuard: Component = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const banQuery = useQuery(api.users.getBanStatus, {});
  const [wasBanned, setWasBanned] = createSignal(false);

  createEffect(() => {
    const status = banQuery.data() as
      | { isBanned: boolean; bannedUntil?: number }
      | null
      | undefined;
    const isBanned = status?.isBanned ?? false;
    const currentPath = location.pathname;

    // Ban detected: redirect to /banned (unless on a skip path)
    if (isBanned && !SKIP_PATHS.some((p) => currentPath.startsWith(p))) {
      navigate('/banned', { replace: true });
    }

    // Ban lifted: redirect away from /banned
    if (wasBanned() && !isBanned && currentPath.startsWith('/banned')) {
      navigate('/dashboard', { replace: true });
    }

    setWasBanned(isBanned);
  });

  return null;
};

export default BanGuard;
