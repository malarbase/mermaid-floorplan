import { onMount, onCleanup, createSignal, createEffect } from "solid-js";
// Monaco environment must be configured before Monaco loads
import "~/lib/monaco-env";

// Import types only (compile-time, no runtime cost)
import type { 
  ParseResult, 
  ParseError,
  DslEditorInstance 
} from "floorplan-viewer-core";
import type { JsonExport } from "floorplan-3d-core";

// Define interfaces for dynamically imported modules
type ParseFloorplanDSL = (content: string) => Promise<ParseResult>;

interface SelectableEntity {
  floorId: string;
  entityType: string;
  entityId: string;
}

interface MeshRegistry {
  getAllEntities(): SelectableEntity[];
}

interface SelectionManager {
  select(entity: SelectableEntity, isAdditive: boolean): void;
  selectMultiple(
    entities: SelectableEntity[], 
    isAdditive: boolean, 
    options?: { primaryEntity?: SelectableEntity; isHierarchical?: boolean }
  ): void;
  highlight(entity: SelectableEntity): void;
  clearHighlight(): void;
  getSelection(): SelectableEntity[];
  onSelectionChange(listener: (event: any) => void): () => void;
}

interface EditorCore {
  loadFloorplan?(data: JsonExport): void;
  getSelectionManager?(): SelectionManager | null;
  meshRegistry?: MeshRegistry;
}

interface EditorViewerSyncInstance {
  onEditorSelect(callback: (entityKey: string, isAdditive: boolean) => void): void;
  onEditorHierarchicalSelect(callback: (result: { primaryKey: string; allKeys: string[] }, isAdditive: boolean) => void): void;
  onEditorHighlight(callback: (entityKeys: string[]) => void): void;
  onEditorHighlightClear(callback: () => void): void;
  scrollToEntity?(entityKey: string): void;
  dispose?(): void;
}

interface EditorPanelProps {
  dsl: string;
  theme: "light" | "dark";
  onDslChange: (dsl: string) => void;
  onSave?: () => void;
  core: EditorCore;
}

export default function EditorPanel(props: EditorPanelProps) {
  let editorContainerRef: HTMLDivElement | undefined;
  let dslEditor: DslEditorInstance | null = null;
  let editorSync: EditorViewerSyncInstance | null = null;
  let parseDebounceTimeout: NodeJS.Timeout | null = null;
  let errorMarkerTimeout: NodeJS.Timeout | null = null;
  let unsubSelection: (() => void) | null = null;
  
  const [isInitialized, setIsInitialized] = createSignal(false);

  onMount(async () => {
    if (!editorContainerRef) return;

    try {
      const [viewerCore, editorModule] = await Promise.all([
        import("floorplan-viewer-core"),
        import("floorplan-editor")
      ]);

      const { createDslEditor, parseFloorplanDSL } = viewerCore;
      const { EditorViewerSync } = editorModule;

      const editorId = `editor-container-${Math.random().toString(36).slice(2)}`;
      editorContainerRef.id = editorId;

      dslEditor = createDslEditor({
        containerId: editorId,
        initialContent: props.dsl,
        theme: props.theme === 'dark' ? 'vs-dark' : 'vs',
        fontSize: 13,
        onChange: (content: string) => {
          if (parseDebounceTimeout) {
            clearTimeout(parseDebounceTimeout);
          }
          parseDebounceTimeout = setTimeout(() => {
            parseAndUpdate(content, parseFloorplanDSL, props.core);
            props.onDslChange(content);
          }, 300);
        },
      });

      initEditorViewerSync(EditorViewerSync, dslEditor, props.core);

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize editor:", error);
    }
  });

  createEffect(async () => {
    const theme = props.theme;
    if (dslEditor?.editor) {
      const { monaco } = await import("floorplan-viewer-core");
      monaco.editor.setTheme(theme === 'dark' ? 'vs-dark' : 'vs');
    }
  });

  onCleanup(() => {
    if (parseDebounceTimeout) {
      clearTimeout(parseDebounceTimeout);
    }
    if (errorMarkerTimeout) {
      clearTimeout(errorMarkerTimeout);
    }
    if (unsubSelection) {
      unsubSelection();
      unsubSelection = null;
    }
    if (editorSync) {
      editorSync.dispose?.();
      editorSync = null;
    }
    if (dslEditor) {
      dslEditor.dispose?.();
      dslEditor = null;
    }
  });

  async function parseAndUpdate(
    content: string, 
    parseFloorplanDSL: ParseFloorplanDSL, 
    core: EditorCore
  ): Promise<void> {
    try {
      const result = await parseFloorplanDSL(content);
      
      // Check for parse errors (ParseResult has errors array, not success boolean)
      if (result.errors.length > 0 || !result.data) {
        // Parse errors are expected during editing (incomplete statements, typos, etc.)
        // Show error markers after a delay if the DSL remains invalid
        if (errorMarkerTimeout) clearTimeout(errorMarkerTimeout);
        // Map ParseError to the format expected by setErrorMarkers (line/column required)
        const errors = result.errors
          .filter((e): e is ParseError & { line: number; column: number } => 
            e.line !== undefined && e.column !== undefined
          );
        errorMarkerTimeout = setTimeout(() => {
          if (dslEditor && errors.length > 0) {
            dslEditor.setErrorMarkers(errors);
          }
        }, 1500); // Show errors after 1.5s of invalid state
        return;
      }

      // Valid parse - clear any pending error timeout and existing markers
      if (errorMarkerTimeout) {
        clearTimeout(errorMarkerTimeout);
        errorMarkerTimeout = null;
      }
      dslEditor?.clearErrorMarkers();

      // Update the 3D view with the parsed floorplan data
      core.loadFloorplan?.(result.data);
    } catch (error) {
      // Unexpected errors (not parse errors) should still be logged
      console.error("Unexpected parse error:", error);
    }
  }

  /**
   * Initialize EditorViewerSync for bidirectional cursor <-> selection sync
   */
  function initEditorViewerSync(
    EditorViewerSyncClass: new (editor: unknown, selectionManager: SelectionManager, config: { debug: boolean }) => EditorViewerSyncInstance,
    editor: DslEditorInstance,
    core: EditorCore
  ): void {
    const selectionManager = core.getSelectionManager?.();
    if (!selectionManager) {
      console.warn("Selection manager not available");
      return;
    }

    editorSync = new EditorViewerSyncClass(
      editor.editor,
      selectionManager,
      { debug: false }
    );

    // Handle editor cursor → 3D selection (simple mode)
    editorSync.onEditorSelect((entityKey: string, isAdditive: boolean) => {
      const parts = entityKey.split(':');
      if (parts.length !== 3) return;

      const [floorId, entityType, entityId] = parts;
      const registry = core.meshRegistry;
      if (!registry) return;

      const entities = registry.getAllEntities();

      for (const entity of entities) {
        if (
          entity.floorId === floorId &&
          entity.entityType === entityType &&
          entity.entityId === entityId
        ) {
          selectionManager.select(entity, isAdditive);
          break;
        }
      }
    });

    // Handle editor cursor → 3D hierarchical selection
    editorSync.onEditorHierarchicalSelect(
      (result, isAdditive: boolean) => {
        const registry = core.meshRegistry;
        if (!registry) return;

        const allEntities = registry.getAllEntities();

        // Find the primary entity
        const primaryParts = result.primaryKey.split(':');
        let primaryEntity: SelectableEntity | null = null;
        if (primaryParts.length === 3) {
          const [floorId, entityType, entityId] = primaryParts;
          primaryEntity = allEntities.find(
            (e) =>
              e.floorId === floorId &&
              e.entityType === entityType &&
              e.entityId === entityId
          ) ?? null;
        }

        // Collect all entities to select
        const entitiesToSelect: SelectableEntity[] = [];
        for (const entityKey of result.allKeys) {
          const parts = entityKey.split(':');
          if (parts.length !== 3) continue;

          const [floorId, entityType, entityId] = parts;
          const entity = allEntities.find(
            (e) =>
              e.floorId === floorId &&
              e.entityType === entityType &&
              e.entityId === entityId
          );
          if (entity) {
            entitiesToSelect.push(entity);
          }
        }

        if (entitiesToSelect.length > 0) {
          selectionManager.selectMultiple(entitiesToSelect, isAdditive, {
            primaryEntity: primaryEntity ?? undefined,
            isHierarchical: true,
          });
        }
      }
    );

    // Handle editor text highlight → 3D preview
    editorSync.onEditorHighlight((entityKeys: string[]) => {
      selectionManager.clearHighlight();

      const registry = core.meshRegistry;
      if (!registry) return;

      const entities = registry.getAllEntities();

      for (const entityKey of entityKeys) {
        const parts = entityKey.split(':');
        if (parts.length !== 3) continue;

        const [floorId, entityType, entityId] = parts;

        for (const entity of entities) {
          if (
            entity.floorId === floorId &&
            entity.entityType === entityType &&
            entity.entityId === entityId
          ) {
            selectionManager.highlight(entity);
            break;
          }
        }
      }
    });

    editorSync.onEditorHighlightClear(() => {
      selectionManager.clearHighlight();
    });

    // Handle 3D selection → editor scroll
    unsubSelection = selectionManager.onSelectionChange((event: { source?: string; selection: ReadonlySet<SelectableEntity> }) => {
      if (event.source === 'editor') return; // Avoid circular updates
      
      const arr = Array.from(event.selection);
      if (arr.length > 0) {
        const entity = arr[0];
        const entityKey = `${entity.floorId}:${entity.entityType}:${entity.entityId}`;
        
        // Scroll to the entity in the editor
        editorSync?.scrollToEntity?.(entityKey);
      }
    });
  }

  return (
    <div
      ref={editorContainerRef}
      class="w-full h-full"
      style={{
        opacity: isInitialized() ? "1" : "0",
        transition: "opacity 0.3s ease-out",
      }}
    />
  );
}
