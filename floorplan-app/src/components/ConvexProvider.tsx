import { ConvexProvider } from "convex-solidjs";
import { ConvexClient } from "convex/browser";
import { type JSX, createSignal, onMount, Show } from "solid-js";

// Get Convex URL from environment
const convexUrl = import.meta.env.VITE_CONVEX_URL as string;

interface ConvexClientProviderProps {
  children: JSX.Element;
}

/**
 * Convex provider wrapper that handles SSR safely.
 * Provides the Convex client to all child components.
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

  onMount(() => {
    if (convexUrl) {
      const convexClient = new ConvexClient(convexUrl);
      setClient(convexClient);
    }
  });

  return (
    <Show when={client()} fallback={props.children}>
      {(resolvedClient) => (
        <ConvexProvider client={resolvedClient()}>
          {props.children}
        </ConvexProvider>
      )}
    </Show>
  );
}

export { ConvexProvider };
