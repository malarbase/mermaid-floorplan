/**
 * Proxy handler for SolidStart API routes.
 * Forwards auth requests to Convex HTTP actions where Better Auth runs.
 * Adapted from @convex-dev/better-auth/react-start.
 *
 * Security: client-supplied x-forwarded-host is stripped. The forwarded host
 * is derived from the server's own known hostname (SITE_URL, VERCEL_URL, or
 * the request URL as last resort). This prevents header injection attacks
 * from influencing BetterAuth's baseURL or trustedOrigins.
 */
export function createProxyHandler(convexSiteUrl: string, opts?: { siteUrl?: string }) {
  if (!convexSiteUrl) {
    throw new Error(
      'convexSiteUrl is required. Set VITE_CONVEX_SITE_URL or CONVEX_SITE_URL environment variable.',
    );
  }
  const targetHost = new URL(convexSiteUrl).host;

  const serverHostname = opts?.siteUrl
    ? new URL(opts.siteUrl).host
    : process.env.SITE_URL
      ? new URL(process.env.SITE_URL).host
      : (process.env.VERCEL_URL ?? null);

  return async (event: { request: Request }): Promise<Response> => {
    const requestUrl = new URL(event.request.url, 'http://localhost');
    const targetUrl = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;
    const headers = new Headers(event.request.headers);
    headers.set('accept-encoding', 'application/json');
    headers.set('host', targetHost);

    headers.delete('x-forwarded-host');

    const derivedHost = serverHostname ?? requestUrl.host;
    headers.set('x-custom-forwarded-host', derivedHost);

    return fetch(targetUrl, {
      method: event.request.method,
      headers,
      redirect: 'manual',
      body: event.request.body,
      // @ts-expect-error duplex required for streaming bodies
      duplex: 'half',
    });
  };
}
