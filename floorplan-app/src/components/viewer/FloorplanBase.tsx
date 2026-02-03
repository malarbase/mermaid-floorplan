import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { ViewerSkeleton } from "./skeletons";
import { ViewerErrorState } from "./ViewerError";

// Define generic types for the cores to avoid strict dependency on the package during build time if not installed
type CoreInstance = {
  dispose: () => void;
  loadFromDsl?: (dsl: string) => void;
  setTheme?: (theme: "light" | "dark") => void;
  [key: string]: any;
};

export interface FloorplanBaseProps {
  dsl: string;
  theme?: "light" | "dark";
  useEditorCore?: boolean;
  containerId?: string;
  onCoreReady?: (core: CoreInstance) => void;
  onError?: (error: Error) => void;
  className?: string;
  enableSelection?: boolean;
}

export function FloorplanBase(props: FloorplanBaseProps) {
  let containerRef: HTMLDivElement | undefined;
  let app: CoreInstance | null = null;
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<Error | null>(null);

  const containerId = props.containerId ?? `floorplan-view-${Math.random().toString(36).slice(2)}`;

  const isWebGLAvailable = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  };

  onMount(async () => {
    if (!isWebGLAvailable()) {
      const err = new Error("Your browser does not support WebGL, which is required for 3D viewing.");
      setError(err);
      props.onError?.(err);
      setIsLoading(false);
      return;
    }

    try {
      // Dynamically import the viewer core
      const viewerCore = await import("floorplan-viewer-core");
      
      if (!containerRef) return;

      const CoreClass = props.useEditorCore 
        ? viewerCore.InteractiveEditorCore 
        : viewerCore.FloorplanAppCore;

      if (!CoreClass) {
        throw new Error(`Requested core ${props.useEditorCore ? 'InteractiveEditorCore' : 'FloorplanAppCore'} not found in floorplan-viewer-core`);
      }

      app = new CoreClass({
        containerId,
        initialTheme: props.theme ?? "dark",
        initialDsl: props.dsl,
        enableSelection: props.enableSelection ?? !!props.useEditorCore,
      });

      if (props.onCoreReady && app) {
        props.onCoreReady(app);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to initialize floorplan viewer:", err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      props.onError?.(errorObj);
      setIsLoading(false);
    }
  });

  onCleanup(() => {
    if (app && typeof app.dispose === "function") {
      app.dispose();
    }
    app = null;
  });

  // Reactive updates
  createEffect(() => {
    if (app && props.dsl) {
      app.loadFromDsl?.(props.dsl);
    }
  });

  createEffect(() => {
    if (app && props.theme) {
      app.setTheme?.(props.theme);
    }
  });

  return (
    <div class={`relative w-full h-full ${props.className ?? ''}`}>
      {isLoading() && <ViewerSkeleton />}
      {error() && <ViewerErrorState error={error()} reset={() => window.location.reload()} />}
      
      <div
        ref={containerRef}
        id={containerId}
        class="w-full h-full"
        style={{ display: isLoading() || error() ? "none" : "block" }}
      />
    </div>
  );
}
