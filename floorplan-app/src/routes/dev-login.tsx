/**
 * Development-only: Multi-persona login for testing.
 *
 * Visit http://localhost:3000/dev-login to select a dev user persona.
 * Each persona gets a real JWT verified by Convex's customJwt provider,
 * enabling simultaneous multi-user sessions across different browser windows.
 *
 * Supports ?returnUrl= for redirect after login (e.g., from fork button).
 */

import { useNavigate, useSearchParams } from '@solidjs/router';
import { useMutation } from 'convex-solidjs';
import { createSignal, For, onMount, Show } from 'solid-js';
import { useActiveSessions } from '~/hooks/useActiveSessions';
import { clearDevLogin, getDevUserId, isDevLoggedIn, setDevUser } from '~/lib/mock-auth';
import { api } from '../../convex/_generated/api';

interface DevPersona {
  authId: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  description: string;
}

const DEV_PERSONAS: DevPersona[] = [
  {
    authId: 'dev-user-1',
    username: 'testuser',
    displayName: 'Test User',
    isAdmin: false,
    description: 'Regular user for general testing',
  },
  {
    authId: 'dev-user-2',
    username: 'testuser2',
    displayName: 'Test User 2',
    isAdmin: false,
    description: 'Second user for collaboration & fork testing',
  },
  {
    authId: 'dev-admin-1',
    username: 'adminuser',
    displayName: 'Admin User',
    isAdmin: true,
    description: 'Admin user for admin portal testing',
  },
];

export default function DevLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = createSignal<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = createSignal<string | null>(null);
  const [loginError, setLoginError] = createSignal<string | null>(null);
  const ensureDevUser = useMutation(api.dev.ensureDevUser);
  const { sessions } = useActiveSessions();
  const sessionCount = () => sessions()?.length ?? 0;

  // Only allow in development
  if (import.meta.env.PROD) {
    navigate('/');
    return null;
  }

  onMount(() => {
    setCurrentUser(getDevUserId());
  });

  const returnUrl = (): string => {
    const param = searchParams.returnUrl;
    if (Array.isArray(param)) return param[0] ?? '/dashboard';
    return param ?? '/dashboard';
  };

  const handleLogin = async (persona: DevPersona) => {
    setIsLoggingIn(persona.authId);
    try {
      // 1. Generate and store JWT
      await setDevUser(persona.authId);

      // 2. Small delay to let ConvexProvider pick up the new token
      await new Promise((r) => setTimeout(r, 300));

      // 3. Ensure user doc exists in Convex
      await ensureDevUser.mutate({
        authId: persona.authId,
        username: persona.username,
        displayName: persona.displayName,
        isAdmin: persona.isAdmin,
      });

      setCurrentUser(persona.authId);

      // 4. Navigate to returnUrl
      navigate(returnUrl());
    } catch (err) {
      console.error('Dev login failed:', err);
      const msg = String(err);
      if (msg.includes('Could not find public function')) {
        setLoginError('Convex backend not running. Start it with: npx convex dev');
      } else {
        setLoginError(msg.slice(0, 200));
      }
      setIsLoggingIn(null);
    }
  };

  const handleLogout = () => {
    clearDevLogin();
    setCurrentUser(null);
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div class="w-full max-w-lg">
        {/* Header */}
        <div class="text-center mb-6">
          <h1 class="text-2xl font-bold">Development Login</h1>
          <p class="text-sm text-base-content/60 mt-1">Select a persona for testing</p>
        </div>

        {/* Current session banner */}
        <Show when={currentUser()}>
          {(userId) => {
            const persona = () => DEV_PERSONAS.find((p) => p.authId === userId());
            return (
              <div class="alert alert-info mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  class="stroke-current shrink-0 w-5 h-5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Logged in as <strong>{persona()?.displayName ?? userId()}</strong> (
                  {persona()?.username ?? userId()})
                </span>
                <button type="button" class="btn btn-sm btn-ghost" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            );
          }}
        </Show>

        {/* Error banner */}
        <Show when={loginError()}>
          {(errMsg) => (
            <div class="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="stroke-current shrink-0 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span class="text-sm">{errMsg()}</span>
              <button
                type="button"
                class="btn btn-sm btn-ghost"
                onClick={() => setLoginError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
        </Show>

        {/* Persona cards */}
        <div class="space-y-3">
          <For each={DEV_PERSONAS}>
            {(persona) => (
              <div
                class="card bg-base-100 shadow-sm"
                classList={{ 'ring-2 ring-primary': currentUser() === persona.authId }}
              >
                <div class="card-body p-4 flex-row items-center gap-4">
                  {/* Avatar placeholder */}
                  <div class="avatar placeholder">
                    <div
                      class="w-12 rounded-full flex items-center justify-center"
                      classList={{
                        'bg-primary text-primary-content': !persona.isAdmin,
                        'bg-warning text-warning-content': persona.isAdmin,
                      }}
                    >
                      <span class="text-lg">{persona.displayName.charAt(0)}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <h3 class="font-semibold">{persona.displayName}</h3>
                      <Show when={persona.isAdmin}>
                        <span class="badge badge-warning badge-sm">Admin</span>
                      </Show>
                      <Show when={!persona.isAdmin}>
                        <span class="badge badge-ghost badge-sm">Regular</span>
                      </Show>
                    </div>
                    <p class="text-sm text-base-content/60">@{persona.username}</p>
                    <p class="text-xs text-base-content/40 mt-0.5">{persona.description}</p>
                  </div>

                  {/* Action */}
                  <Show
                    when={currentUser() !== persona.authId}
                    fallback={
                      <div class="flex items-center gap-1.5">
                        <span class="badge badge-primary badge-outline">Active</span>
                        <Show when={sessionCount() > 0}>
                          <span class="badge badge-ghost badge-sm text-xs">
                            {sessionCount()} {sessionCount() === 1 ? 'session' : 'sessions'}
                          </span>
                        </Show>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      class="btn btn-sm btn-primary"
                      disabled={isLoggingIn() !== null}
                      onClick={() => handleLogin(persona)}
                    >
                      <Show
                        when={isLoggingIn() !== persona.authId}
                        fallback={<span class="loading loading-spinner loading-xs" />}
                      >
                        Select
                      </Show>
                    </button>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>

        {/* Footer info */}
        <div class="mt-6 text-center">
          <p class="text-xs text-base-content/40">
            Each persona uses a real JWT verified by Convex.
            <br />
            Use different browser windows for simultaneous multi-user testing.
          </p>
          <Show when={searchParams.returnUrl}>
            <p class="text-xs text-base-content/50 mt-2">
              After login, redirecting to:{' '}
              <code class="text-primary">{searchParams.returnUrl}</code>
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
}
