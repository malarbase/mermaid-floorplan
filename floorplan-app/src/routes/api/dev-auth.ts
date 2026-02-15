/**
 * Dev-only API route: signs JWTs server-side so the private key
 * never reaches the browser.
 *
 * POST /api/dev-auth  { authId: "dev-user-1" }
 *   → { token: "eyJ..." }
 *
 * Only available when the server is running in dev mode.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { APIEvent } from '@solidjs/start/server';
import { importPKCS8, SignJWT } from 'jose';

// JWT config — must match convex/auth.config.ts
const JWT_ISSUER = 'https://floorplan-dev-auth.local';
const JWT_AUDIENCE = 'floorplan-dev';
const JWT_KID = 'floorplan-dev-key';
const JWT_ALG = 'RS256';

// Lazily loaded private key (cached after first call)
let _privateKeyPromise: Promise<CryptoKey> | null = null;

function getPrivateKey(): Promise<CryptoKey> {
  if (!_privateKeyPromise) {
    // process.cwd() is the floorplan-app/ root in both local dev and Docker
    const pemPath = resolve(process.cwd(), 'dev-keys', 'private.pem');
    const pem = readFileSync(pemPath, 'utf-8');
    _privateKeyPromise = importPKCS8(pem, JWT_ALG);
  }
  return _privateKeyPromise;
}

export async function POST(event: APIEvent) {
  // Guard: dev only
  if (import.meta.env.PROD) {
    return new Response(JSON.stringify({ error: 'Not available in production' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await event.request.json().catch(() => null);
  const authId = body?.authId;
  const sessionId = body?.sessionId; // Optional: Better Auth session ID

  if (!authId || typeof authId !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing or invalid authId' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const privateKey = await getPrivateKey();

    // Build JWT claims — include sessionId when provided so that
    // isSessionValid can do a precise per-session lookup in dev mode
    const claims: Record<string, unknown> = { sub: authId };
    if (sessionId && typeof sessionId === 'string') {
      claims.sessionId = sessionId;
    }

    const token = await new SignJWT(claims)
      .setProtectedHeader({ alg: JWT_ALG, kid: JWT_KID, typ: 'JWT' })
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime('30d') // Long-lived for dev convenience
      .sign(privateKey);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Failed to sign dev JWT:', err);
    return new Response(
      JSON.stringify({
        error: 'Failed to sign JWT. Did you run `npm run generate-dev-keys`?',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
