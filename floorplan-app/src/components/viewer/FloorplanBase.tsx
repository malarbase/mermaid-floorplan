import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
import { ViewerSkeleton } from './skeletons';
import { ViewerErrorState } from './ViewerError';

// Define generic types for the cores to avoid strict dependency on the package during build time if not installed
type CoreInstance = {
  dispose: () => void;
  loadFromDsl?: (dsl: string) => void;
  setTheme?: (theme: 'light' | 'dark') => void;
  [key: string]: any;
};

export interface FloorplanBaseProps {
  dsl: string;
  theme?: 'light' | 'dark';
  useEditorCore?: boolean;
  containerId?: string;
  onCoreReady?: (core: CoreInstance) => void;
  onError?: (error: Error) => void;
  className?: string;
  enableSelection?: boolean;
  /** Allow toggling selection on/off after init (creates SelectionManager even if selection starts disabled) */
  allowSelectionToggle?: boolean;
  /** Called when a DSL specifies a theme different from the current app theme */
  onDslThemeDetected?: (dslTheme: 'light' | 'dark') => void;
}

export function FloorplanBase(props: FloorplanBaseProps) {
  let containerRef: HTMLDivElement | undefined;
  const [appInstance, setAppInstance] = createSignal<CoreInstance | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<Error | null>(null);

  const containerId = props.containerId ?? `floorplan-view-${Math.random().toString(36).slice(2)}`;

  const isWebGLAvailable = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (_e) {
      return false;
    }
  };

  onMount(async () => {
    if (!isWebGLAvailable()) {
      const err = new Error(
        'Your browser does not support WebGL, which is required for 3D viewing.',
      );
      setError(err);
      props.onError?.(err);
      setIsLoading(false);
      return;
    }

    try {
      // Dynamically import the viewer core
      const viewerCore = await import('floorplan-viewer-core');

      if (!containerRef) return;

      const CoreClass = props.useEditorCore
        ? viewerCore.InteractiveEditorCore
        : viewerCore.FloorplanAppCore;

      if (!CoreClass) {
        throw new Error(
          `Requested core ${props.useEditorCore ? 'InteractiveEditorCore' : 'FloorplanAppCore'} not found in floorplan-viewer-core`,
        );
      }

      const core = new CoreClass({
        containerId,
        initialTheme: props.theme ?? 'dark',
        initialDsl: props.dsl,
        enableSelection: props.enableSelection ?? !!props.useEditorCore,
        allowSelectionToggle: props.allowSelectionToggle ?? true,
      });

      setAppInstance(core);

      if (props.onCoreReady && core) {
        props.onCoreReady(core);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize floorplan viewer:', err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      props.onError?.(errorObj);
      setIsLoading(false);
    }
  });

  onCleanup(() => {
    const app = appInstance();
    if (app && typeof app.dispose === 'function') {
      app.dispose();
    }
    setAppInstance(null);
  });

  // Reactive updates: load DSL and enforce app theme
  createEffect(() => {
    const app = appInstance();
    if (app && props.dsl) {
      // Capture theme before loading DSL (DSL config may change it)
      const themeBefore = app.currentTheme;
      app.loadFromDsl?.(props.dsl);
      const themeAfter = app.currentTheme;

      // Always enforce the app-level theme after DSL load
      if (props.theme) {
        app.setTheme?.(props.theme);
      }

      // If DSL tried to change the theme, notify the parent
      if (themeBefore !== themeAfter && props.theme && props.onDslThemeDetected) {
        const dslWanted: 'light' | 'dark' =
          themeAfter === 'dark' || themeAfter === 'blueprint' ? 'dark' : 'light';
        if (dslWanted !== props.theme) {
          props.onDslThemeDetected(dslWanted);
        }
      }
    }
  });

  // Sync app theme → viewer when theme prop changes (user toggle)
  createEffect(() => {
    const app = appInstance();
    if (app && props.theme) {
      app.setTheme?.(props.theme);
    }
  });

  // React to enableSelection prop changes - toggle selection on the core
  createEffect(() => {
    const app = appInstance();
    if (app?.selectionManager && props.enableSelection !== undefined) {
      app.selectionManager.setEnabled(props.enableSelection);
    }
  });

  // Listen for viewer theme changes:
  // 1. Restore global data-theme to app theme (prevent viewer core from leaking)
  // 2. Keep scoped container data-theme in sync with the app theme
  createEffect(() => {
    const app = appInstance();
    if (app?.on) {
      const unsub = app.on('themeChange', () => {
        // The viewer core's applyTheme() sets document.documentElement data-theme globally.
        // Restore the global to the app's theme so it doesn't leak to the rest of the page.
        if (props.theme) {
          document.documentElement.dataset.theme = props.theme;
          document.body.classList.toggle('dark-theme', props.theme === 'dark');
        }
      });
      onCleanup(() => unsub?.());
    }
  });

  return (
    <div
      class={`relative w-full h-full ${props.className ?? ''}`}
      data-theme={props.theme ?? 'dark'}
    >
      {isLoading() && <ViewerSkeleton />}
      {error() && <ViewerErrorState error={error()} reset={() => window.location.reload()} />}

      <div
        ref={containerRef}
        id={containerId}
        class="w-full h-full"
        style={{ display: isLoading() || error() ? 'none' : 'block' }}
      />
    </div>
  );
}
