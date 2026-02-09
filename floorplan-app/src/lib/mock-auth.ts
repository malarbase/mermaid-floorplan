/**
 * Development auth utilities.
 *
 * In dev mode, the Convex auth provider is disabled, so we use a simple
 * localStorage flag to track whether the user is "logged in". The actual
 * user data always comes from Convex (via the dev user fallback), making
 * Convex the single source of truth for identity.
 *
 * This eliminates the old "mock session" pattern where a hard-coded user
 * object was stored in localStorage and could get out of sync with the
 * Convex dev user (e.g., after a username change).
 */

const DEV_LOGGED_IN_KEY = 'dev-logged-in';

/**
 * Set the dev login state.
 * When true, useSession() will query Convex for the dev user.
 * When false, useSession() returns null (logged out).
 */
export function setDevLoggedIn(value: boolean) {
  if (import.meta.env.PROD) {
    console.warn('Dev login is only available in development');
    return;
  }

  if (value) {
    localStorage.setItem(DEV_LOGGED_IN_KEY, 'true');
  } else {
    localStorage.removeItem(DEV_LOGGED_IN_KEY);
  }
}

/**
 * Check if the dev user is "logged in".
 */
export function isDevLoggedIn(): boolean {
  if (import.meta.env.PROD) return false;
  return localStorage.getItem(DEV_LOGGED_IN_KEY) === 'true';
}

/**
 * Clear the dev login state (logout).
 */
export function clearDevLogin() {
  localStorage.removeItem(DEV_LOGGED_IN_KEY);

  // Also clean up legacy mock session if present
  localStorage.removeItem('mock-dev-session');
}
