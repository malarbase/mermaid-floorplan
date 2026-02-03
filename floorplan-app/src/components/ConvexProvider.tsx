import { ConvexProvider } from "convex-solidjs";
import { ConvexClient } from "convex/browser";
import { type JSX, createSignal, onMount, Show } from "solid-js";
import { isMockMode, createMockConvexClient } from "~/lib/mock-convex";

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
    if (isMockMode()) {
      console.log("[MOCK MODE] Using mock Convex client");
      setClient(createMockConvexClient());
      setIsReady(true);
      return;
    }

    if (convexUrl) {
      console.log("Connecting to Convex at:", convexUrl);
      const convexClient = new ConvexClient(convexUrl);
      
      // Add mock auth token for development
      if (import.meta.env.DEV) {
        const mockSession = localStorage.getItem("mock-dev-session");
        if (mockSession) {
          try {
            const session = JSON.parse(mockSession);
            // Set a custom header with the mock session token
            (convexClient as any).requestHeaders = {
              "x-mock-auth-token": JSON.stringify(session.user),
            };
            console.log("[DEV] Mock auth token set for Convex client");
          } catch (e) {
            console.error("[DEV] Failed to parse mock session", e);
          }
        }
      }
      
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
