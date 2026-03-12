import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { createAuth } from './auth';

const http = httpRouter();

// Better Auth handler.
// Requests arrive at Convex's site URL (e.g. localhost:3211) but Better Auth
// matches routes based on its baseURL (e.g. localhost:3000). We rewrite the
// request URL origin so route matching works correctly.
//
// Origin resolution is handled by resolveAuthOrigin() inside createAuth(),
// which validates the request origin against ALLOWED_ORIGINS before using it.
const authHandler = httpAction(async (ctx, request) => {
  const auth = createAuth(ctx, request);
  const baseURL = auth.options?.baseURL ?? process.env.SITE_URL!;

  const incoming = new URL(request.url);
  const rewritten = `${baseURL}${incoming.pathname}${incoming.search}`;

  const newHeaders = new Headers(request.headers);
  const rewriteUrlObj = new URL(baseURL);
  newHeaders.set('host', rewriteUrlObj.host);

  const init: RequestInit = {
    method: request.method,
    headers: newHeaders,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    // @ts-expect-error
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
