import { createSignal, createEffect, onCleanup, Suspense } from "solid-js";
import { useLocation, useSearchParams } from "@solidjs/router";
import { FloorplanBase } from "./FloorplanBase";
import { ViewerErrorBoundary } from "./ViewerError";
import { ViewerSkeleton, ControlPanelsSkeleton, EditorSkeleton } from "./skeletons";

// Define the mode types
export type ViewerMode = 'basic' | 'advanced' | 'editor';

interface FloorplanContainerProps {
  dsl: string;
  theme?: "light" | "dark";
  containerId?: string;
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
  let uiInstance: any = null;

  // Cleanup UI when component unmounts or mode changes
  const cleanupUI = () => {
    if (uiInstance && typeof uiInstance.dispose === "function") {
      uiInstance.dispose();
      uiInstance = null;
    }
  };

  onCleanup(cleanupUI);

  // Initialize UI for advanced mode
  const initUI = async (core: any) => {
    if (mode() === 'advanced') {
      try {
        const viewerCore = await import("floorplan-viewer-core");
        const { createFloorplanUI, injectStyles } = viewerCore;
        
        injectStyles();
        
        cleanupUI();
        uiInstance = createFloorplanUI(core, {
          initialTheme: props.theme ?? "dark",
          initialEditorOpen: false,
          headerAutoHide: true,
          commands: [], // Add commands if needed
        });
      } catch (e) {
        console.error("Failed to initialize UI:", e);
      }
    }
  };

  const handleCoreReady = (core: any) => {
    setCoreInstance(core);
    initUI(core);
  };

  // Re-run mode detection if props change significantly, 
  // but usually we want stickiness so we might just rely on the initial determination
  // unless strictly controlled. For now, let's keep it simple.

  return (
    <ViewerErrorBoundary>
      <Suspense fallback={<ViewerSkeleton />}>
        <FloorplanBase
          dsl={props.dsl}
          theme={props.theme}
          containerId={props.containerId}
          className={props.className}
          useEditorCore={mode() === 'editor'}
          onCoreReady={handleCoreReady}
        />
        {/* 
           If we are in editor mode, the InteractiveEditorCore typically handles the editor UI rendering 
           inside the same container or overlays it. If we need to render separate sidebars, 
           we would do it here using coreInstance.
        */}
      </Suspense>
    </ViewerErrorBoundary>
  );
}
