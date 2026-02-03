import { createSignal, onMount, onCleanup, Suspense, Show } from "solid-js";
import { useLocation, useSearchParams } from "@solidjs/router";
import { FloorplanBase } from "./FloorplanBase";
import { ViewerErrorBoundary } from "./ViewerError";
import { ViewerSkeleton, ControlPanelsSkeleton, EditorSkeleton } from "./skeletons";
import ControlPanels from "./ControlPanels";
import EditorBundle from "../editor/EditorBundle";
import { FAB } from "./FAB";
import { BottomSheet } from "./BottomSheet";
import "./viewer-layout.css";

// Define the mode types
export type ViewerMode = 'basic' | 'advanced' | 'editor';

interface FloorplanContainerProps {
  dsl: string;
  theme?: "light" | "dark";
  containerId?: string;
  mode?: ViewerMode;
  initialMode?: ViewerMode;
  onDslChange?: (dsl: string) => void;
  onSave?: (dsl: string) => void;
  className?: string;
  // Legacy support
  withUI?: boolean;
  editable?: boolean;
}

export function FloorplanContainer(props: FloorplanContainerProps) {
  const [params] = useSearchParams();
  const location = useLocation();
  
  // Determine mode
  // Priority: 1. Props (editable/withUI) 2. URL params 3. Default 'basic'
  const getMode = (): ViewerMode => {
    if (props.mode) return props.mode;
    if (props.editable) return 'editor';
    if (props.initialMode) return props.initialMode;
    
    // Check URL params
    if (params.edit === 'true') return 'editor';
    if (params.view === 'advanced') return 'advanced';
    if (params.view === 'basic') return 'basic';
    
    // Legacy prop support
    if (props.withUI) return 'advanced';
    
    return 'basic';
  };

  const [mode, setMode] = createSignal<ViewerMode>(getMode());
  const [coreInstance, setCoreInstance] = createSignal<any>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = createSignal(false);
  const [isMobile, setIsMobile] = createSignal(typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  
  onMount(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    onCleanup(() => window.removeEventListener('resize', handleResize));
  });

  const handleCoreReady = (core: any) => {
    setCoreInstance(core);
  };

  // Prepare props for sub-components
  const baseProps = () => ({
    dsl: props.dsl,
    theme: props.theme,
    containerId: props.containerId,
    className: props.className,
    useEditorCore: mode() === 'editor',
    onCoreReady: handleCoreReady
  });

  const editorProps = () => ({
    core: coreInstance(),
    dsl: props.dsl,
    theme: props.theme || 'light',
    onDslChange: props.onDslChange || (() => {})
  });

  const controlProps = () => ({
    viewer: coreInstance()
  });

  return (
    <ViewerErrorBoundary>
      <Suspense fallback={<ViewerSkeleton />}>
        <div class="floorplan-container">
          {/* Editor panel (desktop + tablet in editor mode) */}
          <Show when={mode() === 'editor' && !isMobile()}>
            <div class="editor-panel">
              <Show when={coreInstance()} fallback={<EditorSkeleton />}>
                <EditorBundle {...editorProps()} />
              </Show>
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
        </div>
      </Suspense>
    </ViewerErrorBoundary>
  );
}

export default FloorplanContainer;
