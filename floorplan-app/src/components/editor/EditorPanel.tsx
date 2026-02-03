import { onMount, onCleanup, createSignal } from "solid-js";

interface EditorPanelProps {
  dsl: string;
  theme: "light" | "dark";
  onDslChange: (dsl: string) => void;
  onSave?: () => void;
  core: any;
}

export default function EditorPanel(props: EditorPanelProps) {
  let editorContainerRef: HTMLDivElement | undefined;
  let dslEditor: any = null;
  let editorSync: any = null;
  let parseDebounceTimeout: NodeJS.Timeout | null = null;
  
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

  onCleanup(() => {
    if (parseDebounceTimeout) {
      clearTimeout(parseDebounceTimeout);
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

  function parseAndUpdate(content: string, parseFloorplanDSL: any, core: any) {
    try {
      const result = parseFloorplanDSL(content);
      
      if (!result.success || !result.data) {
        console.warn("Parser errors");
        return;
      }

      core.loadFromJson?.(result.data);
    } catch (error) {
      console.error("Parse error:", error);
    }
  }

  /**
   * Initialize EditorViewerSync for bidirectional cursor <-> selection sync
   */
  function initEditorViewerSync(
    EditorViewerSync: any,
    editor: any,
    core: any
  ) {
    const selectionManager = core.getSelectionManager?.();
    if (!selectionManager) {
      console.warn("Selection manager not available");
      return;
    }

    editorSync = new EditorViewerSync(
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
      (result: any, isAdditive: boolean) => {
        const registry = core.meshRegistry;
        if (!registry) return;

        const allEntities = registry.getAllEntities();

        // Find the primary entity
        const primaryParts = result.primaryKey.split(':');
        let primaryEntity = null;
        if (primaryParts.length === 3) {
          const [floorId, entityType, entityId] = primaryParts;
          primaryEntity = allEntities.find(
            (e: any) =>
              e.floorId === floorId &&
              e.entityType === entityType &&
              e.entityId === entityId
          );
        }

        // Collect all entities to select
        const entitiesToSelect = [];
        for (const entityKey of result.allKeys) {
          const parts = entityKey.split(':');
          if (parts.length !== 3) continue;

          const [floorId, entityType, entityId] = parts;
          const entity = allEntities.find(
            (e: any) =>
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
    selectionManager.on?.('selectionChange', (event: any) => {
      if (event.source === 'editor') return; // Avoid circular updates
      
      const selected = event.selected;
      if (selected && selected.length > 0) {
        const entity = selected[0];
        const entityKey = `${entity.floorId}:${entity.entityType}:${entity.entityId}`;
        
        // Scroll to the entity in the editor
        editorSync.scrollToEntity?.(entityKey);
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
