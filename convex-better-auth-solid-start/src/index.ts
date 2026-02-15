/**
 * convex-better-auth-solid-start
 *
 * SolidStart integration for Better Auth running inside Convex.
 * Provides a proxy handler that forwards auth requests to Convex HTTP actions,
 * and a getToken utility for SSR auth.
 *
 * Modeled on @convex-dev/better-auth/react-start.
 */
export { createProxyHandler } from './handler';
export { getConvexToken } from './token';

import { createProxyHandler } from './handler';
import { getConvexToken } from './token';

/**
 * Factory function that creates the proxy handler and token utilities
 * for integrating Better Auth (running in Convex) with SolidStart.
 */
export function convexBetterAuthSolidStart(opts: { convexUrl: string; convexSiteUrl: string }) {
  const proxyHandler = createProxyHandler(opts.convexSiteUrl);
  return {
    handler: {
      GET: proxyHandler,
      POST: proxyHandler,
      PUT: proxyHandler,
      PATCH: proxyHandler,
      DELETE: proxyHandler,
    },
    getToken: (request: Request) => getConvexToken(opts.convexSiteUrl, request),
  };
}
