import { onMount, onCleanup, createEffect, createSignal } from "solid-js";
import { useNavigate, useLocation } from "@solidjs/router";

// Note: useSession is imported dynamically to avoid issues when auth is not set up
// import { useSession } from "~/lib/auth-client";

// Dynamic import to avoid SSR issues with Three.js
let FloorplanAppCore: typeof import("floorplan-viewer-core").FloorplanAppCore | null = null;

interface FloorplanEmbedProps {
  /** DSL content to render */
  dsl: string;
  /** Whether editing is enabled */
  editable?: boolean;
  /** Container ID (auto-generated if not provided) */
  containerId?: string;
  /** Theme (light or dark) */
  theme?: "light" | "dark";
  /** Callback when DSL changes (for editable mode) */
  onDslChange?: (dsl: string) => void;
  /** Callback when save is requested */
  onSave?: (dsl: string) => void;
}

/**
 * FloorplanEmbed component - wraps floorplan-viewer-core for use in SolidStart.
 * 
 * This component handles:
 * - Dynamic import to avoid SSR issues with Three.js
 * - Proper lifecycle management (mount/cleanup)
 * - Auth state integration
 * - DSL content synchronization
 * 
 * Usage:
 * ```tsx
 * <FloorplanEmbed
 *   dsl={floorplanDsl}
 *   editable={isOwner}
 *   onSave={(dsl) => saveMutation({ dsl })}
 * />
 * ```
 */
export function FloorplanEmbed(props: FloorplanEmbedProps) {
  let containerRef: HTMLDivElement | undefined;
  let app: InstanceType<typeof import("floorplan-viewer-core").FloorplanAppCore> | null = null;

  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  // Session signal will be integrated later when auth is fully configured
  // const sessionSignal = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const containerId = props.containerId ?? `floorplan-embed-${Math.random().toString(36).slice(2)}`;

  // Handle auth required callback - redirect to login with return URL
  const handleAuthRequired = () => {
    const currentPath = location.pathname;
    navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  // Initialize viewer on mount (client-side only)
  onMount(async () => {
    try {
      // Dynamically import to avoid SSR issues
      const viewerCore = await import("floorplan-viewer-core");
      FloorplanAppCore = viewerCore.FloorplanAppCore;

      if (!containerRef) {
        throw new Error("Container ref not available");
      }

      // Create the viewer instance
      app = new FloorplanAppCore({
        containerId,
        initialTheme: props.theme ?? "dark",
        initialDsl: props.dsl,
      });

      // Set up event handlers if needed
      // app.on("authRequired", handleAuthRequired);

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to initialize FloorplanAppCore:", err);
      setError(err instanceof Error ? err.message : "Failed to load viewer");
      setIsLoading(false);
    }
  });

  // Clean up on unmount
  onCleanup(() => {
    if (app && typeof app.dispose === "function") {
      app.dispose();
    }
    app = null;
  });

  // Update DSL when props change
  createEffect(() => {
    if (app && props.dsl) {
      app.loadFromDsl?.(props.dsl);
    }
  });

  // Update theme when props change
  createEffect(() => {
    if (app && props.theme) {
      app.setTheme?.(props.theme);
    }
  });

  return (
    <div class="relative w-full h-full">
      {/* Loading State */}
      {isLoading() && (
        <div class="absolute inset-0 flex items-center justify-center bg-base-300">
          <div class="text-center">
            <span class="loading loading-spinner loading-lg text-primary"></span>
            <p class="mt-4 text-base-content/70">Loading 3D viewer...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error() && (
        <div class="absolute inset-0 flex items-center justify-center bg-base-300">
          <div class="card bg-error text-error-content max-w-md">
            <div class="card-body">
              <h2 class="card-title">Failed to load viewer</h2>
              <p>{error()}</p>
              <button
                class="btn btn-ghost"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Viewer Container */}
      <div
        ref={containerRef}
        id={containerId}
        class="w-full h-full"
        style={{ display: isLoading() || error() ? "none" : "block" }}
      />
    </div>
  );
}

export default FloorplanEmbed;
