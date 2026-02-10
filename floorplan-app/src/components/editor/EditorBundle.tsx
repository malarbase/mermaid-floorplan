import type { JsonRoom } from 'floorplan-3d-core';
import { serializeRoom } from 'floorplan-language';
import { createEffect, createSignal, on } from 'solid-js';
import { type GetEntityDataFn, useSelection } from '~/hooks/useSelection';
import AddRoomDialog, { type AddRoomData } from './AddRoomDialog';
import DeleteConfirmDialog, { type DeleteEntity } from './DeleteConfirmDialog';
import { editEntityProperty } from './dsl-edit-operations';
import {
  applyDslEditPlan,
  buildDeletePlan,
  type CascadeConversion,
  type DslEditPlan,
} from './dsl-edit-plan';
import type { EditorCore, EditorPanelAPI } from './EditorPanel';
import EditorPanel from './EditorPanel';
import PropertiesPanel from './PropertiesPanel';
import SelectionControls from './SelectionControls';
import ValidationWarnings, { ParseErrorBanner, type ValidationWarning } from './ValidationWarnings';

/**
 * Extends EditorCore with additional methods used directly by EditorBundle
 * (e.g. camera focus, deselect). At runtime this is the dynamically-loaded
 * FloorplanAppCore / InteractiveEditorCore.
 */
interface EditorBundleCoreApi extends EditorCore {
  focusOnSelection?(): void;
}

interface EditorBundleProps {
  core: EditorBundleCoreApi;
  dsl: string;
  theme: 'light' | 'dark';
  onDslChange: (dsl: string) => void;
}

/**
 * Editor panel bundle layout:
 *
 * ┌──────────────────────────────┐
 * │ [+Add] [Copy] [Focus] [Del] │ ← Toolbar (compact, with type breakdown)
 * ├──────────────────────────────┤
 * │                              │
 * │     Monaco Editor            │ ← Flex-1, takes remaining space
 * │                              │
 * ├──────────────────────────────┤
 * │ Properties: LivingRoom       │ ← Rich properties with select dropdowns
 * │ X: 0   Y: 0   W: 20  H: 15 │
 * │ Room Height: 2.8  Style: ...│
 * └──────────────────────────────┘
 *
 * Selection state is managed by useSelection hook (single subscription)
 * and passed down as props to presentational children.
 */
export default function EditorBundle(props: EditorBundleProps) {
  const [showAddRoomDialog, setShowAddRoomDialog] = createSignal(false);
  const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
  const [selectedEntityName, setSelectedEntityName] = createSignal('');
  const [deleteEntities, setDeleteEntities] = createSignal<DeleteEntity[]>([]);
  const [deletePlan, setDeletePlan] = createSignal<DslEditPlan | null>(null);
  const [cascadeConversions, setCascadeConversions] = createSignal<CascadeConversion[]>([]);

  // Validation state
  const [warnings, setWarnings] = createSignal<ValidationWarning[]>([]);
  const [warningsCollapsed, setWarningsCollapsed] = createSignal(false);
  const [hasParseError, setHasParseError] = createSignal(false);
  const [parseErrorMessage, setParseErrorMessage] = createSignal<string | undefined>();

  // Auto-collapse warnings when user selects something (reclaim editor space).
  // Only collapses; does NOT auto-expand when selection clears.
  createEffect(
    on(
      () => selection().hasSelection,
      (hasSelection) => {
        if (hasSelection) setWarningsCollapsed(true);
      },
    ),
  );

  // Imperative editor API from EditorPanel (available after Monaco initializes)
  let editorAPI: EditorPanelAPI | null = null;

  /**
   * Callback to fetch entity data for the properties panel.
   * Looks up the entity in the last-parsed JSON data.
   */
  const getEntityData: GetEntityDataFn = (entityType: string, entityId: string) => {
    const data = editorAPI?.getLastParsedData();
    if (!data) return { name: entityId };

    if (entityType === 'room') {
      for (const floor of data.floors) {
        const room = floor.rooms.find((r: JsonRoom) => r.name === entityId);
        if (room) {
          // Build wall config from parsed walls array
          const walls: Record<string, string> = {
            top: 'solid',
            right: 'solid',
            bottom: 'solid',
            left: 'solid',
          };
          for (const w of room.walls) {
            walls[w.direction] = w.type;
          }

          // Collect available style names from the DSL for the style dropdown
          const availableStyles = data.styles?.map((s) => s.name) ?? [];

          return {
            name: room.name,
            x: room.x,
            y: room.z,
            width: room.width,
            height: room.height,
            roomHeight: room.roomHeight,
            style: room.style,
            _availableStyles: availableStyles,
            // Positioning data for PositioningFieldset
            posMode: room._relativePosition ? 'relative' : 'absolute',
            direction: room._relativePosition?.direction,
            reference: room._relativePosition?.reference,
            gap: room._relativePosition?.gap,
            alignment: room._relativePosition?.alignment,
            // Wall config for WallsFieldset
            walls,
          };
        }
      }
    } else if (entityType === 'wall') {
      // Wall entityId format: "RoomName_direction" (e.g., "LivingRoom_top")
      const match = entityId.match(/^(.+)_(top|bottom|left|right)$/);
      if (match) {
        const roomName = match[1];
        const direction = match[2];
        // Find the wall type from the room's walls array
        for (const floor of data.floors) {
          const room = floor.rooms.find((r: JsonRoom) => r.name === roomName);
          if (room?.walls) {
            const wall = room.walls.find((w) => w.direction === direction);
            return {
              room: roomName,
              direction,
              type: wall?.type ?? 'solid',
            };
          }
        }
        return { room: roomName, direction, type: 'solid' };
      }
    } else if (entityType === 'connection') {
      // Connection entityId format: "FromRoom-ToRoom"
      const parts = entityId.split('-');
      if (parts.length >= 2) {
        const conn = data.connections?.find(
          (c) => c.fromRoom === parts[0] && c.toRoom === parts.slice(1).join('-'),
        );
        return {
          fromRoom: parts[0],
          toRoom: parts.slice(1).join('-'),
          type: conn?.doorType ?? 'door',
          position: conn?.position ?? 50,
        };
      }
    }

    return { name: entityId };
  };

  // Single reactive selection subscription with entity data callback
  const selection = useSelection(() => props.core, getEntityData);

  // ================================================================
  // Button Handlers
  // ================================================================

  /** Derive existing room names from the last parsed data.
   *  Updated when the dialog opens AND when selection changes (for PropertiesPanel). */
  const [existingRoomNames, setExistingRoomNames] = createSignal<string[]>([]);

  const refreshRoomNames = () => {
    const data = editorAPI?.getLastParsedData();
    if (data?.floors) {
      const names = data.floors.flatMap((f) => f.rooms.map((r: JsonRoom) => r.name));
      setExistingRoomNames(names);
    }
  };

  // Refresh room names when selection changes (for the PropertiesPanel reference dropdown)
  createEffect(
    on(
      () => selection().primaryId,
      () => refreshRoomNames(),
    ),
  );

  const openAddRoomDialog = () => {
    refreshRoomNames();
    setShowAddRoomDialog(true);
  };

  /**
   * Add a new room to the DSL.
   * Supports both absolute and relative positioning via the new AddRoomData type.
   */
  const handleAddRoom = (data: AddRoomData) => {
    if (!editorAPI) return;

    const currentContent = editorAPI.getValue();
    const lines = currentContent.split('\n');

    // Find the first floor line (indentation-based or brace-based DSL)
    const floorLineIndex = lines.findIndex((line) => /^\s*floor\s+\w+/.test(line));
    if (floorLineIndex === -1) {
      console.warn('No floor found in DSL');
      return;
    }

    // Detect room indentation from existing sibling room lines
    const floorIndent = lines[floorLineIndex].match(/^(\s*)/)?.[1] ?? '';
    let roomIndent = `${floorIndent}  `; // default: 2 spaces deeper
    for (let i = floorLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^\s*room\s/.test(line)) {
        roomIndent = line.match(/^(\s*)/)?.[1] ?? roomIndent;
        break;
      }
      const lineIndent = (line.match(/^(\s*)/)?.[1] ?? '').length;
      if (line.trim() !== '' && lineIndent <= floorIndent.length) break;
    }

    // Find the last line belonging to this floor block
    let lastFloorChildIndex = floorLineIndex;
    for (let i = floorLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const lineIndent = line.match(/^(\s*)/)?.[1] ?? '';
      if (lineIndent.length > floorIndent.length) {
        lastFloorChildIndex = i;
      } else {
        break;
      }
    }

    // Build the room DSL line using shared serializer
    const roomDsl = serializeRoom(
      {
        name: data.name,
        position:
          data.positioning.mode === 'absolute'
            ? { x: data.positioning.x, y: data.positioning.y }
            : undefined,
        size: { width: data.width, height: data.height },
        roomHeight: data.roomHeight,
        walls: data.walls,
        relativePosition:
          data.positioning.mode === 'relative'
            ? {
                direction: data.positioning.direction,
                reference: data.positioning.reference,
                gap: data.positioning.gap,
                alignment: data.positioning.align,
              }
            : undefined,
        label: data.label,
      },
      roomIndent,
    );

    // Insert after the last child line of the floor
    lines.splice(lastFloorChildIndex + 1, 0, roomDsl);
    editorAPI.setValue(lines.join('\n'));
  };

  /**
   * Copy selected entities. Currently copies the entity name to clipboard.
   */
  const handleCopy = () => {
    const sel = selection();
    if (sel.entities.length === 0) return;
    // Copy entity names to clipboard
    const names = sel.entities.map((e: { entityId?: string }) => e.entityId ?? '').join(', ');
    navigator.clipboard.writeText(names).catch(() => {});
  };

  /**
   * Focus camera on the selected entity.
   */
  const handleFocus = () => {
    const sel = selection();
    if (!sel.primary) return;
    props.core?.focusOnSelection?.();
  };

  /**
   * Open delete confirmation dialog -- handles all selected entities.
   * Computes the edit plan *before* showing the dialog so the UI can
   * display cascade effects (e.g. relative → absolute conversions).
   */
  const handleDelete = () => {
    const sel = selection();
    if (!sel.hasSelection) return;

    // Build delete entity list from ALL selected entities
    const entities: DeleteEntity[] = sel.entities.map(
      (e: { entityType?: string; entityId?: string }) => {
        const type = e.entityType ?? 'unknown';
        const id = e.entityId ?? 'unknown';
        let label = id;
        if (type === 'wall') {
          label = `wall "${id}" (will be changed to open)`;
        }
        return { type, id, label };
      },
    );

    // Compute the edit plan (what will change) before showing the dialog
    const dslContent = editorAPI?.getValue() ?? '';
    const parsedData = editorAPI?.getLastParsedData() ?? null;
    const plan = buildDeletePlan(entities, parsedData, dslContent);

    setDeleteEntities(entities);
    setDeletePlan(plan);
    setCascadeConversions(plan.cascadeConversions);
    setSelectedEntityName(entities[0]?.label ?? '');
    setShowDeleteDialog(true);
  };

  /**
   * Execute deletion after confirmation.
   * Applies the pre-computed edit plan to the DSL text.
   */
  const handleDeleteConfirm = () => {
    const plan = deletePlan();
    if (!editorAPI || !plan) {
      setShowDeleteDialog(false);
      return;
    }

    const currentContent = editorAPI.getValue();
    const parsedData = editorAPI.getLastParsedData();
    const newContent = applyDslEditPlan(currentContent, plan, parsedData);

    editorAPI.setValue(newContent);

    // Clear selection and close dialog
    props.core?.getSelectionManager?.()?.deselect?.();
    setShowDeleteDialog(false);
    setDeletePlan(null);
    setCascadeConversions([]);
  };

  /**
   * Handle property value changes from the PropertiesPanel.
   * Uses the read-modify-reserialize pattern via editEntityProperty —
   * no regex grammar assumptions, grammar changes cause build errors.
   */
  const handlePropertyChange = (property: string, value: unknown) => {
    const sel = selection();
    if (!sel.primary || !editorAPI) return;

    const currentContent = editorAPI.getValue();
    const parsedData = editorAPI.getLastParsedData();
    const newContent = editEntityProperty(
      currentContent,
      sel.primaryType,
      sel.primaryId,
      property,
      value,
      parsedData,
    );

    if (newContent !== currentContent) {
      editorAPI.setValue(newContent);
    }
  };

  /** Navigate Monaco editor to a warning's line */
  const handleWarningClick = (warning: ValidationWarning) => {
    if (editorAPI && warning.line) {
      editorAPI.goToLine(warning.line, warning.column);
    }
  };

  return (
    <div class="flex flex-col h-full w-full overflow-hidden">
      {/* Top: Compact toolbar with type breakdown */}
      <div class="flex-shrink-0">
        <SelectionControls
          hasSelection={selection().hasSelection}
          selectedCount={selection().count}
          summary={selection().summary}
          entityNames={selection().entityNames}
          onAddRoom={openAddRoomDialog}
          onCopy={handleCopy}
          onFocus={handleFocus}
          onDelete={handleDelete}
        />
      </div>

      {/* Parse error banner */}
      <ParseErrorBanner hasError={hasParseError()} errorMessage={parseErrorMessage()} />

      {/* Middle: Monaco Editor - takes remaining space */}
      <div class="flex-1 min-h-0 relative">
        <EditorPanel
          core={props.core}
          dsl={props.dsl}
          theme={props.theme}
          onDslChange={props.onDslChange}
          onEditorReady={(api) => {
            editorAPI = api;
          }}
          onWarnings={(w) => setWarnings(w as ValidationWarning[])}
          onParseError={(hasError, msg) => {
            setHasParseError(hasError);
            setParseErrorMessage(msg);
          }}
        />
      </div>

      {/* Validation warnings panel (between editor and properties) */}
      <ValidationWarnings
        warnings={warnings()}
        onWarningClick={handleWarningClick}
        collapsed={warningsCollapsed()}
        onToggle={() => setWarningsCollapsed((c) => !c)}
      />

      {/* Bottom: Properties panel with rich property definitions + fieldsets */}
      <div class="flex-shrink-0 max-h-64 overflow-y-auto">
        <PropertiesPanel
          hasSelection={selection().hasSelection}
          entityType={selection().primaryType}
          entityId={selection().primaryId}
          selectionCount={selection().count}
          selectionSummary={selection().summary}
          propertyDefs={selection().propertyDefs}
          entityData={selection().primaryEntityData ?? undefined}
          existingRooms={existingRoomNames().filter((n) => n !== selection().primaryId)}
          onPropertyChange={handlePropertyChange}
        />
      </div>

      <AddRoomDialog
        isOpen={showAddRoomDialog()}
        onClose={() => setShowAddRoomDialog(false)}
        onConfirm={handleAddRoom}
        existingRooms={existingRoomNames()}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog()}
        entityName={selectedEntityName()}
        entities={deleteEntities()}
        cascadeConversions={cascadeConversions()}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
