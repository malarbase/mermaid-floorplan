import { ConvexProvider } from "convex-solidjs";
import { ConvexClient } from "convex/browser";
import { type JSX, createSignal, onMount, Show } from "solid-js";
import { isMockMode } from "~/lib/mock-convex";

// Get Convex URL from environment
const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

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
    // If mock mode is enabled, skip Convex client entirely
    if (isMockMode()) {
      console.log("[MOCK MODE] Skipping Convex connection - using mock data");
      setIsReady(true);
      return;
    }

    if (convexUrl) {
      console.log("Connecting to Convex at:", convexUrl);
      const convexClient = new ConvexClient(convexUrl);
      setClient(convexClient);
      setIsReady(true);
    } else {
      console.warn("VITE_CONVEX_URL not set - Convex features disabled");
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
      <Show when={client() || isMockMode()} fallback={props.children}>
        {(resolvedClient) => {
          // If mock mode, render children without provider
          if (isMockMode()) {
            return props.children;
          }
          
          // Otherwise wrap with real ConvexProvider
          return (
            <ConvexProvider client={resolvedClient() as ConvexClient}>
              {props.children}
            </ConvexProvider>
          );
        }}
      </Show>
    </Show>
  );
}

export { ConvexProvider };
