import { useLocation, useSearchParams } from '@solidjs/router';
import { createEffect, createSignal, onCleanup, onMount, Show, Suspense } from 'solid-js';
import type { CameraStateData, CoreInstance, ViewerMode } from '~/lib/project-types';
import EditorBundle from '../editor/EditorBundle';
import { BottomSheet } from './BottomSheet';
import ControlPanels from './ControlPanels';
import { FAB } from './FAB';
import { FloorplanBase } from './FloorplanBase';
import { ControlPanelsSkeleton, EditorSkeleton, ViewerSkeleton } from './skeletons';
import { ViewerErrorBoundary } from './ViewerError';
import './viewer-layout.css';
import { type FloorplanAppCore, getLayoutManager } from 'floorplan-viewer-core';
import { useAppTheme } from '~/lib/theme';

/** Min/max editor panel width in pixels */
const EDITOR_MIN_WIDTH = 250;
const EDITOR_MAX_WIDTH = 800;

/** localStorage key for "don't ask about DSL theme" preference */
const DSL_THEME_PROMPT_KEY = 'floorplan-app-dsl-theme-prompt-disabled';

interface FloorplanContainerProps {
  dsl: string;
  containerId?: string;
  mode?: ViewerMode;
  initialMode?: ViewerMode;
  onDslChange?: (dsl: string) => void;
  onSave?: (dsl: string) => void;
  /** Called when the viewer core instance is ready (for thumbnail capture, etc.) */
  onCoreReady?: (core: CoreInstance) => void;
  /** Initial camera state to restore on load (from project data) */
  initialCameraState?: CameraStateData;
  className?: string;
  // Legacy support
  withUI?: boolean;
  editable?: boolean;
}

/** Inline theme suggestion banner */
function ThemeSuggestionBanner(props: {
  dslTheme: 'light' | 'dark';
  onSwitch: () => void;
  onDismiss: () => void;
  onDontAskAgain: () => void;
}) {
  const [dontAsk, setDontAsk] = createSignal(false);

  return (
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 animate-slide-in-up">
      <div class="alert shadow-lg max-w-md border border-base-content/10">
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div class="flex-1 min-w-0">
          <p class="text-sm">
            This floorplan is designed for <strong>{props.dslTheme}</strong> theme.
          </p>
          <label class="flex items-center gap-1.5 mt-1 cursor-pointer">
            <input
              type="checkbox"
              class="checkbox checkbox-xs"
              checked={dontAsk()}
              onChange={(e) => setDontAsk(e.currentTarget.checked)}
            />
            <span class="text-xs opacity-70">Don't ask again</span>
          </label>
        </div>
        <div class="flex gap-1 shrink-0">
          <button
            class="btn btn-primary btn-sm"
            onClick={() => {
              props.onSwitch();
              if (dontAsk()) props.onDontAskAgain();
            }}
          >
            Switch
          </button>
          <button
            class="btn btn-ghost btn-sm"
            onClick={() => {
              props.onDismiss();
              if (dontAsk()) props.onDontAskAgain();
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function FloorplanContainer(props: FloorplanContainerProps) {
  const { theme, setTheme, toggleTheme } = useAppTheme();
  const [params] = useSearchParams();
  const _location = useLocation();

  // Determine mode
  const getMode = (): ViewerMode => {
    if (props.mode) return props.mode;
    if (props.editable) return 'editor';
    if (props.initialMode) return props.initialMode;
    if (params.edit === 'true') return 'editor';
    if (params.view === 'advanced') return 'advanced';
    if (params.view === 'basic') return 'basic';
    if (props.withUI) return 'advanced';
    return 'basic';
  };

  const [mode, setMode] = createSignal<ViewerMode>(getMode());
  // Internal signal uses the concrete type for compatibility with EditorBundle/ControlPanels.
  // The public `onCoreReady` callback receives the narrower `CoreInstance` interface.
  const [coreInstance, setCoreInstance] = createSignal<FloorplanAppCore | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  );
  const [isEditorCollapsed, setIsEditorCollapsed] = createSignal(false);
  const [editorWidth, setEditorWidth] = createSignal(400);
  const [isResizing, setIsResizing] = createSignal(false);

  // DSL theme suggestion state
  const [dslThemeSuggestion, setDslThemeSuggestion] = createSignal<'light' | 'dark' | null>(null);

  // Sync mode with props changes
  createEffect(() => {
    const newMode = getMode();
    if (newMode !== mode()) {
      setMode(newMode);
    }
  });

  // When mode drops to 'basic', hide panels that only belong in advanced/editor modes.
  // ControlPanels unmounts via <Show> (cleaning up its overlay element), but the
  // AnnotationManager and LayoutManager persist on the core — reset their state here.
  createEffect(() => {
    const currentMode = mode();
    if (currentMode === 'basic') {
      const core = coreInstance();
      if (core) {
        // Reset all annotation toggles so panels are hidden
        const am = core.annotationManager;
        if (am) {
          am.state.showFloorSummary = false;
          am.state.showArea = false;
          am.state.showDimensions = false;
          am.updateFloorSummary();
          am.updateAll();
        }
        // Reset layout manager's overlay/panel visibility flags
        core.layoutManager?.setOverlay2DVisible(false);
        core.layoutManager?.setFloorSummaryVisible(false);

        // Hide 2D overlay DOM element directly (onCleanup in ControlPanels
        // may not fire because it's registered after await in async onMount)
        const overlayEl = core.overlayContainer?.querySelector('#overlay-2d');
        overlayEl?.classList.remove('visible');
      }
    }
  });

  createEffect(() => {
    const width = editorWidth();
    const layoutManager = getLayoutManager({ editorWidth: width });
    layoutManager.setEditorOpen(!isEditorCollapsed());
  });

  onMount(() => {
    const layoutManager = getLayoutManager({ editorWidth: 400 });
    if (mode() === 'editor') {
      layoutManager.setEditorOpen(true);
    }
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));
  });

  const handleCoreReady = (core: CoreInstance) => {
    // FloorplanBase delivers CoreInstance; we know the underlying object is FloorplanAppCore.
    setCoreInstance(core as unknown as FloorplanAppCore);
    props.onCoreReady?.(core);
  };

  // Handle DSL theme detection from FloorplanBase
  const handleDslThemeDetected = (dslTheme: 'light' | 'dark') => {
    // Check if user has opted out of DSL theme prompts
    const promptDisabled =
      typeof window !== 'undefined' ? localStorage.getItem(DSL_THEME_PROMPT_KEY) === 'true' : false;
    if (!promptDisabled) {
      setDslThemeSuggestion(dslTheme);
    }
  };

  const handleThemeSuggestionSwitch = () => {
    const suggested = dslThemeSuggestion();
    if (suggested) {
      setTheme(suggested);
    }
    setDslThemeSuggestion(null);
  };

  const handleThemeSuggestionDismiss = () => {
    setDslThemeSuggestion(null);
  };

  const handleDontAskAgain = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DSL_THEME_PROMPT_KEY, 'true');
    }
  };

  // Resize handle logic
  const handleResizeStart = (e: MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = editorWidth();

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const newWidth = Math.min(EDITOR_MAX_WIDTH, Math.max(EDITOR_MIN_WIDTH, startWidth + delta));
      setEditorWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Prepare props for sub-components
  const baseProps = () => ({
    dsl: props.dsl,
    theme: theme(),
    containerId: props.containerId,
    className: props.className,
    useEditorCore: mode() === 'editor',
    enableSelection: mode() === 'editor',
    allowSelectionToggle: true,
    onCoreReady: handleCoreReady,
    onDslThemeDetected: handleDslThemeDetected,
    initialCameraState: props.initialCameraState,
  });

  // EditorBundle defines its own `EditorBundleCoreApi` interface whose
  // SelectionManager shape diverges slightly from the concrete class.
  // The runtime object is correct, so we use a structural cast here.
  const editorProps = () => ({
    core: coreInstance()! as unknown as Record<string, unknown>,
    dsl: props.dsl,
    theme: theme(),
    onDslChange: props.onDslChange || (() => {}),
  });

  const controlProps = () => ({
    viewer: coreInstance(),
  });

  return (
    <ViewerErrorBoundary>
      <Suspense fallback={<ViewerSkeleton />}>
        <div class="floorplan-container" data-theme={theme()}>
          {/* Editor panel (desktop + tablet in editor mode) */}
          <Show when={mode() === 'editor' && !isMobile()}>
            <div
              class={`editor-panel ${isEditorCollapsed() ? 'collapsed' : ''}`}
              style={{ width: `${editorWidth()}px` }}
            >
              <Show when={coreInstance()} fallback={<EditorSkeleton />}>
                <EditorBundle {...editorProps()} />
              </Show>
              <button
                class="editor-collapse-btn bg-base-200 hover:bg-base-300 text-base-content/60 border border-base-content/20 border-l-0"
                onClick={() => setIsEditorCollapsed((prev) => !prev)}
                title={isEditorCollapsed() ? 'Expand editor' : 'Collapse editor'}
              >
                {isEditorCollapsed() ? '▶' : '◀'}
              </button>
              {/* Resize handle */}
              <div
                class={`editor-resize-handle ${isResizing() ? 'active' : ''}`}
                onMouseDown={handleResizeStart}
              />
            </div>
          </Show>

          {/* 3D Viewer (always visible) */}
          <div class="floorplan-3d">
            <FloorplanBase {...baseProps()} />
          </div>

          {/* Control panel (desktop + tablet) */}
          <Show when={mode() !== 'basic' && !isMobile()}>
            <div class="control-panel">
              <Show when={coreInstance()} fallback={<ControlPanelsSkeleton />}>
                <ControlPanels {...controlProps()} />
              </Show>
            </div>
          </Show>

          {/* FAB (phone only) */}
          <Show when={isMobile() && mode() !== 'basic'}>
            <FAB mode={mode()} onClick={() => setIsBottomSheetOpen(true)} />
          </Show>

          {/* Bottom sheet (phone only) */}
          <Show when={isMobile()}>
            <BottomSheet isOpen={isBottomSheetOpen()} onClose={() => setIsBottomSheetOpen(false)}>
              <Show when={coreInstance()}>
                <Show when={mode() === 'editor'} fallback={<ControlPanels {...controlProps()} />}>
                  <div class="flex flex-col gap-4 h-full">
                    <div class="flex-1 overflow-y-auto">
                      <EditorBundle {...editorProps()} />
                    </div>
                    <div class="h-64 relative">
                      <ControlPanels {...controlProps()} />
                    </div>
                  </div>
                </Show>
              </Show>
            </BottomSheet>
          </Show>

          {/* DSL theme suggestion banner */}
          <Show when={dslThemeSuggestion()}>
            <ThemeSuggestionBanner
              dslTheme={dslThemeSuggestion()!}
              onSwitch={handleThemeSuggestionSwitch}
              onDismiss={handleThemeSuggestionDismiss}
              onDontAskAgain={handleDontAskAgain}
            />
          </Show>
        </div>
      </Suspense>
    </ViewerErrorBoundary>
  );
}

export default FloorplanContainer;
