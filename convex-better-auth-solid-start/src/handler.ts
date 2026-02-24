/**
 * Proxy handler for SolidStart API routes.
 * Forwards auth requests to Convex HTTP actions where Better Auth runs.
 * Adapted from @convex-dev/better-auth/react-start.
 */
export function createProxyHandler(convexSiteUrl: string) {
  if (!convexSiteUrl) {
    throw new Error(
      'convexSiteUrl is required. Set VITE_CONVEX_SITE_URL or CONVEX_SITE_URL environment variable.',
    );
  }
  const targetHost = new URL(convexSiteUrl).host;

  return async (event: { request: Request }): Promise<Response> => {
    // Use a base URL fallback for environments where request.url may be relative
    const requestUrl = new URL(event.request.url, 'http://localhost');
    const targetUrl = `${convexSiteUrl}${requestUrl.pathname}${requestUrl.search}`;
    const headers = new Headers(event.request.headers);
    headers.set('accept-encoding', 'application/json');
    headers.set('host', targetHost);
    const realRequestHost = event.request.headers.get('x-forwarded-host') || event.request.headers.get('host') || requestUrl.host;
    if (realRequestHost && realRequestHost !== 'localhost') {
      headers.set('x-forwarded-host', realRequestHost);
      headers.set('x-custom-forwarded-host', realRequestHost);
    }
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
