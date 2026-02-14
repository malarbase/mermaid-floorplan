/**
 * Development auth utilities — JWT-based multi-user dev authentication.
 *
 * In dev mode, calls the server-side /api/dev-auth endpoint which signs
 * JWTs with the dev private key. The private key never reaches the browser.
 *
 * The Convex dev server verifies tokens against the matching public key
 * (convex/auth.config.ts), so ctx.auth.getUserIdentity() works identically
 * to production.
 *
 * Each browser/tab has its own JWT in localStorage, enabling simultaneous
 * multi-user dev sessions.
 */

// localStorage keys
const DEV_AUTH_TOKEN_KEY = 'dev-auth-token';
const DEV_AUTH_USER_ID_KEY = 'dev-auth-user-id';

/**
 * Request a signed JWT from the dev auth server endpoint and store it.
 * Call this when the user selects a persona on the dev-login page.
 */
export async function setDevUser(authId: string): Promise<string> {
  if (import.meta.env.PROD) {
    console.warn('Dev login is only available in development');
    return '';
  }

  const res = await fetch('/api/dev-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Dev auth failed (${res.status})`);
  }

  const { token } = await res.json();

  localStorage.setItem(DEV_AUTH_TOKEN_KEY, token);
  localStorage.setItem(DEV_AUTH_USER_ID_KEY, authId);

  // Dispatch storage event so other components (ConvexProvider) can react
  window.dispatchEvent(new StorageEvent('storage', { key: DEV_AUTH_TOKEN_KEY }));

  return token;
}

/**
 * Get the stored dev JWT token.
 * Returns null if not logged in.
 */
export function getDevToken(): string | null {
  if (import.meta.env.PROD) return null;
  return localStorage.getItem(DEV_AUTH_TOKEN_KEY);
}

/**
 * Get the stored dev user's authId (for UI display without decoding JWT).
 * Returns null if not logged in.
 */
export function getDevUserId(): string | null {
  if (import.meta.env.PROD) return null;
  return localStorage.getItem(DEV_AUTH_USER_ID_KEY);
}

/**
 * Check if a dev user is "logged in".
 */
export function isDevLoggedIn(): boolean {
  if (import.meta.env.PROD) return false;
  return localStorage.getItem(DEV_AUTH_TOKEN_KEY) !== null;
}

/**
 * Clear the dev login state (logout).
 */
export function clearDevLogin(): void {
  localStorage.removeItem(DEV_AUTH_TOKEN_KEY);
  localStorage.removeItem(DEV_AUTH_USER_ID_KEY);

  // Also clean up legacy mock session if present
  localStorage.removeItem('mock-dev-session');
  localStorage.removeItem('dev-logged-in');

  // Dispatch storage event so ConvexProvider can react
  window.dispatchEvent(new StorageEvent('storage', { key: DEV_AUTH_TOKEN_KEY }));
}
