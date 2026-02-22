import { ConvexClient } from 'convex/browser';
import { ConvexProvider } from 'convex-solidjs';
import { createSignal, type JSX, onMount, Show } from 'solid-js';
import { createMockConvexClient, isMockMode } from '~/lib/mock-convex';

// Get Convex URL from environment and remove trailing slash
const convexUrl = (import.meta.env.VITE_CONVEX_URL as string)?.replace(/\/$/, '');

interface ConvexClientProviderProps {
  children: JSX.Element;
}

/**
 * Convex provider wrapper that handles SSR safely.
 * Provides the Convex client to all child components.
 *
 * Supports mock mode for testing without Convex backend.
 *
 * Usage:
 * ```tsx
 * import { ConvexClientProvider } from "~/components/ConvexProvider";
 *
 * <ConvexClientProvider>
 *   <App />
 * </ConvexClientProvider>
 * ```
 */
export function ConvexClientProvider(props: ConvexClientProviderProps) {
  const [client, setClient] = createSignal<ConvexClient | null>(null);
  const [isReady, setIsReady] = createSignal(false);

  onMount(() => {
    if (isMockMode()) {
      console.log('[MOCK MODE] Using mock Convex client');
      setClient(createMockConvexClient());
      setIsReady(true);
      return;
    }

    if (convexUrl) {
      console.log('Connecting to Convex at:', convexUrl);
      const convexClient = new ConvexClient(convexUrl);

      // In dev mode, wire up JWT-based auth before exposing the client.
      // This ensures ctx.auth.getUserIdentity() returns a real identity
      // on the first query.
      if (import.meta.env.DEV) {
        import('~/lib/mock-auth').then(({ getDevToken }) => {
          let authSettled = false;

          convexClient.setAuth(
            async () => getDevToken(),
            (isAuthenticated) => {
              if (!authSettled) {
                authSettled = true;
                setClient(convexClient);
                setIsReady(true);
              }
            },
          );

          // Safety timeout: if onChange never fires within 2s, render anyway
          setTimeout(() => {
            if (!authSettled) {
              authSettled = true;
              setClient(convexClient);
              setIsReady(true);
            }
          }, 2000);

          // Re-trigger auth when dev user switches (localStorage change)
          window.addEventListener('storage', (e) => {
            if (e.key === 'dev-auth-token') {
              convexClient.setAuth(
                async () => getDevToken(),
                () => { },
              );
            }
          });
        });
      } else {
        // Production: use BA-issued JWT for Convex auth
        convexClient.setAuth(async () => {
          try {
            const res = await fetch('/api/auth/convex/token');
            const data = await res.json();
            return data?.token ?? null;
          } catch {
            return null;
          }
        });
        setClient(convexClient);
        setIsReady(true);
      }
    } else {
      console.warn('VITE_CONVEX_URL not set - Convex features disabled');
      setIsReady(true);
    }
  });

  return (
    <Show
      when={isReady()}
      fallback={
        <div class="min-h-screen flex items-center justify-center bg-base-200">
          <div class="loading loading-spinner loading-lg text-primary"></div>
        </div>
      }
    >
      <Show
        when={client()}
        fallback={
          <div class="min-h-screen flex items-center justify-center bg-base-200">
            <div class="loading loading-spinner loading-lg text-primary"></div>
          </div>
        }
      >
        {(resolvedClient) => (
          <ConvexProvider client={resolvedClient() as ConvexClient}>
            {props.children}
          </ConvexProvider>
        )}
      </Show>
    </Show>
  );
}

export { ConvexProvider };
