import { createEffect, createSignal, onCleanup, onMount } from 'solid-js';
// Monaco environment must be configured before Monaco loads
import '~/lib/monaco-env';

import type { JsonExport, JsonRoom, JsonSourceRange } from 'floorplan-3d-core';
// Import types only (compile-time, no runtime cost)
import type {
  DslEditorInstance,
  EntityLocation,
  ParseError,
  ParseResult,
} from 'floorplan-viewer-core';

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
  select(entity: SelectableEntity, isAdditive: boolean, silent?: boolean): void;
  selectMultiple(
    entities: SelectableEntity[],
    isAdditive: boolean,
    options?: {
      primaryEntities?: SelectableEntity[];
      isHierarchical?: boolean;
      silent?: boolean;
    },
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
  updateEntityLocations(entities: EntityLocation[]): void;
  onEditorSelect(callback: (entityKey: string, isAdditive: boolean) => void): void;
  onEditorHierarchicalSelect(
    callback: (result: { primaryKeys: string[]; allKeys: string[] }, isAdditive: boolean) => void,
  ): void;
  onEditorHighlight(callback: (entityKeys: string[]) => void): void;
  onEditorHighlightClear(callback: () => void): void;
  scrollToEntity?(entityKey: string): void;
  dispose?(): void;
}

/**
 * Imperative API exposed from EditorPanel to parent components.
 * Gives access to the Monaco editor and parsed data for DSL manipulation.
 */
export interface EditorPanelAPI {
  /** Get current DSL content from Monaco */
  getValue(): string;
  /** Replace all content in Monaco (triggers parse + 3D update) */
  setValue(content: string): void;
  /** Push a targeted edit with undo/redo support */
  pushEdit(
    range: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    },
    text: string,
  ): void;
  /** Get the most recently successfully parsed JSON data */
  getLastParsedData(): JsonExport | null;
  /** Navigate to a specific line in the editor */
  goToLine(line: number, column?: number): void;
}

interface EditorPanelProps {
  dsl: string;
  theme: 'light' | 'dark';
  onDslChange: (dsl: string) => void;
  onSave?: () => void;
  core: EditorCore;
  /** Called when the editor is ready with an imperative API */
  onEditorReady?: (api: EditorPanelAPI) => void;
  /** Called when parse warnings are available (validation hints, etc.) */
  onWarnings?: (warnings: ParseError[]) => void;
  /** Called when parse error state changes */
  onParseError?: (hasError: boolean, errorMessage?: string) => void;
}

export default function EditorPanel(props: EditorPanelProps) {
  let editorContainerRef: HTMLDivElement | undefined;
  let dslEditor: DslEditorInstance | null = null;
  let editorSync: EditorViewerSyncInstance | null = null;
  let parseDebounceTimeout: NodeJS.Timeout | null = null;
  let errorMarkerTimeout: NodeJS.Timeout | null = null;
  let parseGeneration = 0; // Monotonic counter to invalidate stale error timeouts
  let unsubSelection: (() => void) | null = null;
  let lastParsedData: JsonExport | null = null;
  let monacoRef: typeof import('floorplan-viewer-core').monaco | null = null;

  const [isInitialized, setIsInitialized] = createSignal(false);

  onMount(async () => {
    if (!editorContainerRef) return;

    try {
      const viewerCore = await import('floorplan-viewer-core');

      const { createDslEditor, parseFloorplanDSL, monaco, EditorViewerSync } = viewerCore;
      monacoRef = monaco;

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

      // Expose imperative API to parent
      const localEditor = dslEditor;
      const localParse = parseFloorplanDSL;
      const localCore = props.core;

      // Helper: trigger parse + propagation after programmatic content changes.
      // Monaco's setValue() does NOT fire onChange, so we must do it manually.
      const triggerParseAndNotify = (content: string) => {
        if (parseDebounceTimeout) clearTimeout(parseDebounceTimeout);
        parseAndUpdate(content, localParse, localCore);
        props.onDslChange(content);
      };

      props.onEditorReady?.({
        getValue: () => localEditor.getValue(),
        setValue: (content: string) => {
          localEditor.setValue(content);
          triggerParseAndNotify(content);
        },
        pushEdit: (range, text) => {
          const model = localEditor.editor.getModel?.();
          if (!model) return;
          model.pushEditOperations([], [{ range, text }], () => null);
          // pushEditOperations triggers onChange via Monaco, so no manual trigger needed
        },
        getLastParsedData: () => lastParsedData,
        goToLine: (line: number, column?: number) => {
          localEditor.goToLine(line, column);
        },
      });

      // Parse the initial DSL content on mount.
      // createDslEditor sets initialContent but does NOT fire onChange,
      // so lastParsedData would remain null until the first user edit.
      parseAndUpdate(props.dsl, localParse, localCore);

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize editor:', error);
    }
  });

  createEffect(async () => {
    const theme = props.theme;
    if (dslEditor?.editor) {
      const { monaco } = await import('floorplan-viewer-core');
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
    core: EditorCore,
  ): Promise<void> {
    // Bump generation so any pending error timeout from a previous parse is invalidated
    const thisGeneration = ++parseGeneration;

    try {
      const result = await parseFloorplanDSL(content);

      // If a newer parse has started while we awaited, discard this result
      if (thisGeneration !== parseGeneration) return;

      // Check for parse errors (ParseResult has errors array, not success boolean)
      if (result.errors.length > 0 || !result.data) {
        // Parse errors are expected during editing (incomplete statements, typos, etc.)
        // Show error markers after a delay if the DSL remains invalid
        if (errorMarkerTimeout) clearTimeout(errorMarkerTimeout);
        // Map ParseError to the format expected by setErrorMarkers (line/column required)
        const errors = result.errors.filter(
          (e): e is ParseError & { line: number; column: number } =>
            e.line !== undefined && e.column !== undefined,
        );
        errorMarkerTimeout = setTimeout(() => {
          // Only apply if no newer parse has superseded us
          if (thisGeneration !== parseGeneration) return;
          if (dslEditor && errors.length > 0) {
            dslEditor.setErrorMarkers(errors);
          }
          // Clear any stale warning markers when in error state
          if (dslEditor && monacoRef) {
            const model = dslEditor.editor.getModel?.();
            if (model) {
              monacoRef.editor.setModelMarkers(model, 'floorplans-warnings', []);
            }
          }
          props.onWarnings?.([]);
          // Notify parent of error state
          const firstError = result.errors[0];
          props.onParseError?.(true, firstError?.message);
        }, 1500); // Show errors after 1.5s of invalid state
        return;
      }

      // Valid parse - clear any pending error timeout and existing markers
      if (errorMarkerTimeout) {
        clearTimeout(errorMarkerTimeout);
        errorMarkerTimeout = null;
      }
      dslEditor?.clearErrorMarkers();
      // Dismiss any open "peek problems" zone widget (the "1 of N problems" bar)
      dslEditor?.editor.trigger('', 'closeMarkersNavigation', {});

      // Clear error state
      props.onParseError?.(false);

      // Forward warnings (validation hints like unused rooms, etc.)
      // Also set warning markers in Monaco for inline yellow squiggles
      if (result.warnings && result.warnings.length > 0) {
        const warningsWithLocation = result.warnings.filter(
          (w): w is ParseError & { line: number; column: number } =>
            w.line !== undefined && w.column !== undefined,
        );
        if (dslEditor && monacoRef && warningsWithLocation.length > 0) {
          const model = dslEditor.editor.getModel?.();
          if (model) {
            const markers = warningsWithLocation.map((w) => ({
              severity: monacoRef!.MarkerSeverity.Warning,
              message: w.message,
              startLineNumber: w.line,
              startColumn: w.column,
              endLineNumber: w.line,
              endColumn: w.column + 1,
            }));
            monacoRef.editor.setModelMarkers(model, 'floorplans-warnings', markers);
          }
        }
        props.onWarnings?.(result.warnings);
      } else {
        // Clear warning markers
        if (dslEditor && monacoRef) {
          const model = dslEditor.editor.getModel?.();
          if (model) {
            monacoRef.editor.setModelMarkers(model, 'floorplans-warnings', []);
          }
        }
        props.onWarnings?.([]);
      }

      // Store parsed data for entity data lookups
      lastParsedData = result.data;

      // Update entity locations for editor ↔ 3D sync
      if (editorSync && result.data) {
        const entityLocations = extractEntityLocations(result.data);
        editorSync.updateEntityLocations(entityLocations);
      }

      // Update the 3D view with the parsed floorplan data
      core.loadFloorplan?.(result.data);
    } catch (error) {
      // Unexpected errors (not parse errors) should still be logged
      console.error('Unexpected parse error:', error);
    }
  }

  /**
   * Initialize EditorViewerSync for bidirectional cursor <-> selection sync
   */
  function initEditorViewerSync(
    EditorViewerSyncClass: new (
      editor: any,
      selectionManager: any,
      config?: { debug?: boolean },
    ) => EditorViewerSyncInstance,
    editor: DslEditorInstance,
    core: EditorCore,
  ): void {
    const selectionManager = core.getSelectionManager?.();
    if (!selectionManager) {
      console.warn('Selection manager not available');
      return;
    }

    editorSync = new EditorViewerSyncClass(editor.editor, selectionManager, { debug: false });

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
    editorSync.onEditorHierarchicalSelect((result, isAdditive: boolean) => {
      const registry = core.meshRegistry;
      if (!registry) return;

      const allEntities = registry.getAllEntities();

      // Resolve all primary entities (multi-cursor support)
      const primaryEntities: SelectableEntity[] = [];
      for (const pKey of result.primaryKeys) {
        const parts = pKey.split(':');
        if (parts.length !== 3) continue;
        const [floorId, entityType, entityId] = parts;
        const entity = allEntities.find(
          (e) => e.floorId === floorId && e.entityType === entityType && e.entityId === entityId,
        );
        if (entity) primaryEntities.push(entity);
      }

      // Collect all entities to select
      const entitiesToSelect: SelectableEntity[] = [];
      for (const entityKey of result.allKeys) {
        const parts = entityKey.split(':');
        if (parts.length !== 3) continue;

        const [floorId, entityType, entityId] = parts;
        const entity = allEntities.find(
          (e) => e.floorId === floorId && e.entityType === entityType && e.entityId === entityId,
        );
        if (entity) {
          entitiesToSelect.push(entity);
        }
      }

      if (entitiesToSelect.length > 0) {
        selectionManager.selectMultiple(entitiesToSelect, isAdditive, {
          primaryEntities,
          isHierarchical: true,
        });
      }
    });

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
    unsubSelection = selectionManager.onSelectionChange(
      (event: { source?: string; selection: ReadonlySet<SelectableEntity> }) => {
        if (event.source === 'editor') return; // Avoid circular updates

        const arr = Array.from(event.selection);
        if (arr.length > 0) {
          const entity = arr[0];
          const entityKey = `${entity.floorId}:${entity.entityType}:${entity.entityId}`;

          // Scroll to the entity in the editor
          editorSync?.scrollToEntity?.(entityKey);
        }
      },
    );
  }

  return (
    <div
      ref={editorContainerRef}
      class="w-full h-full"
      style={{
        opacity: isInitialized() ? '1' : '0',
        transition: 'opacity 0.3s ease-out',
      }}
    />
  );
}

// ============================================================================
// Entity Location Extraction
// ============================================================================

/**
 * Extract entity locations (with source ranges) from parsed JSON data.
 * Uses the core's EntityLocation format (name/type) for EditorViewerSync.
 */
function extractEntityLocations(jsonData: JsonExport): EntityLocation[] {
  const locations: EntityLocation[] = [];

  type WithSourceRange<T> = T & {
    _sourceRange?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  };

  for (const floor of jsonData.floors) {
    const floorWithSource = floor as WithSourceRange<typeof floor>;

    if (floorWithSource._sourceRange) {
      locations.push({
        type: 'floor',
        name: floor.id,
        floorId: floor.id,
        sourceRange: floorWithSource._sourceRange,
      });
    }

    for (const room of floor.rooms) {
      const roomWithSource = room as WithSourceRange<JsonRoom>;

      if (roomWithSource._sourceRange) {
        locations.push({
          type: 'room',
          name: room.name,
          floorId: floor.id,
          sourceRange: roomWithSource._sourceRange,
        });
      }

      for (const wall of room.walls || []) {
        const wallWithSource = wall as WithSourceRange<typeof wall>;
        if (wallWithSource._sourceRange) {
          locations.push({
            type: 'wall',
            name: `${room.name}_${wall.direction}`,
            floorId: floor.id,
            sourceRange: wallWithSource._sourceRange,
          });
        }
      }
    }
  }

  for (const conn of jsonData.connections) {
    const connWithSource = conn as WithSourceRange<typeof conn>;
    if (connWithSource._sourceRange) {
      locations.push({
        type: 'connection',
        name: `${conn.fromRoom}-${conn.toRoom}`,
        floorId: jsonData.floors[0]?.id ?? 'default',
        sourceRange: connWithSource._sourceRange,
      });
    }
  }

  return locations;
}
