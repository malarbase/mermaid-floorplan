import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { createAuth } from './auth';

const http = httpRouter();

// Better Auth handler.
// Requests arrive at Convex's site URL (e.g. localhost:3211) but Better Auth
// matches routes based on its baseURL (e.g. localhost:3000). We rewrite the
// request URL origin so route matching works correctly.
const authHandler = httpAction(async (ctx, request) => {
  const auth = createAuth(ctx, request);

  // Extract origin exactly like createAuth does
  const customHost = request.headers.get('x-custom-forwarded-host') || request.headers.get('x-forwarded-host');
  const origin = request.headers.get('origin') ?? (customHost ? (customHost.startsWith('http') ? customHost : `https://${customHost}`) : null);
  const inferredBaseUrl = origin ? (origin.startsWith('http') ? origin : `https://${origin}`) : process.env.SITE_URL!;

  // Use auth.options?.baseURL if present, otherwise fallback to the inferred one, then SITE_URL
  const baseURL = auth.options?.baseURL ?? inferredBaseUrl;

  const incoming = new URL(request.url);
  const rewritten = `${baseURL}${incoming.pathname}${incoming.search}`;

  const newHeaders = new Headers(request.headers);
  const rewriteUrlObj = new URL(baseURL);
  newHeaders.set('host', rewriteUrlObj.host);
  if (!newHeaders.has('x-forwarded-host')) {
    newHeaders.set('x-forwarded-host', rewriteUrlObj.host);
  }

  // Create standard request object correctly. If method is GET or HEAD, omit body!
  const init: RequestInit = {
    method: request.method,
    headers: newHeaders,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    // @ts-ignore
    init.duplex = 'half';
  }

  const proxiedRequest = new Request(rewritten, init);
  return auth.handler(proxiedRequest);
});

http.route({ pathPrefix: '/api/auth/', method: 'GET', handler: authHandler });
http.route({ pathPrefix: '/api/auth/', method: 'POST', handler: authHandler });

// OIDC discovery endpoint (needed by Convex auth)
http.route({
  path: '/.well-known/openid-configuration',
  method: 'GET',
  handler: httpAction(async () => {
    const siteUrl = process.env.CONVEX_SITE_URL!;
    return Response.redirect(`${siteUrl}/api/auth/convex/.well-known/openid-configuration`);
  }),
});

export default http;
