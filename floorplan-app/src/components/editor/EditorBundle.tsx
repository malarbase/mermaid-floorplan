import type { JsonExport, JsonRoom, JsonSourceRange } from 'floorplan-3d-core';
import { serializeRoom } from 'floorplan-language';
import { createEffect, createSignal, on } from 'solid-js';
import { type GetEntityDataFn, useSelection } from '~/hooks/useSelection';
import AddRoomDialog, { type AddRoomData } from './AddRoomDialog';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import type { EditorPanelAPI } from './EditorPanel';
import EditorPanel from './EditorPanel';
import PropertiesPanel from './PropertiesPanel';
import SelectionControls from './SelectionControls';
import ValidationWarnings, { ParseErrorBanner, type ValidationWarning } from './ValidationWarnings';

interface EditorBundleProps {
  core: any;
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
          return {
            name: room.name,
            x: room.x,
            y: room.z,
            width: room.width,
            height: room.height,
            roomHeight: room.roomHeight,
            style: room.style,
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

  /** Derive existing room names from the last parsed data (for the Add Room dialog).
   *  Re-computed each time the dialog opens, since editorAPI is not reactive. */
  const [existingRoomNames, setExistingRoomNames] = createSignal<string[]>([]);

  const openAddRoomDialog = () => {
    const data = editorAPI?.getLastParsedData();
    if (data?.floors) {
      const names = data.floors.flatMap((f) => f.rooms.map((r: JsonRoom) => r.name));
      setExistingRoomNames(names);
    }
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
    props.core?.cameraManager?.focusOnEntity?.(sel.primary);
  };

  /**
   * Open delete confirmation dialog.
   */
  const handleDelete = () => {
    const sel = selection();
    if (!sel.primary) return;

    const entityType = sel.primaryType;
    const entityId = sel.primaryId || 'this entity';

    if (entityType === 'wall') {
      setSelectedEntityName(`wall "${entityId}" (will be changed to open)`);
    } else {
      setSelectedEntityName(entityId);
    }
    setShowDeleteDialog(true);
  };

  /**
   * Execute deletion after confirmation.
   * - Walls: changed to "open" type instead of removing
   * - Rooms: removed from DSL (with cascade deletion of related connections)
   * - Connections: removed from DSL
   */
  const handleDeleteConfirm = () => {
    if (!editorAPI) {
      setShowDeleteDialog(false);
      return;
    }

    const sel = selection();
    if (!sel.primary) {
      setShowDeleteDialog(false);
      return;
    }

    const { primaryType, primaryId } = sel;
    const currentContent = editorAPI.getValue();
    const parsedData = editorAPI.getLastParsedData();

    if (primaryType === 'wall') {
      // Change wall type to "open" instead of deleting
      handlePropertyChange('type', 'open');
    } else if (primaryType === 'room') {
      // Delete the room and any connections referencing it
      let newContent = removeEntityFromDsl(currentContent, 'room', primaryId, parsedData);
      // Cascade: remove connections that reference this room
      if (parsedData?.connections) {
        for (const conn of parsedData.connections) {
          if (conn.fromRoom === primaryId || conn.toRoom === primaryId) {
            newContent = removeConnectionFromDsl(newContent, conn.fromRoom, conn.toRoom);
          }
        }
      }
      editorAPI.setValue(newContent);
    } else if (primaryType === 'connection') {
      const parts = primaryId.split('-');
      if (parts.length >= 2) {
        const newContent = removeConnectionFromDsl(
          currentContent,
          parts[0],
          parts.slice(1).join('-'),
        );
        editorAPI.setValue(newContent);
      }
    }

    // Clear selection
    props.core?.getSelectionManager?.()?.deselect?.();
    setShowDeleteDialog(false);
  };

  /**
   * Handle property value changes from the PropertiesPanel.
   * Finds the entity in the DSL and applies a targeted text edit.
   */
  const handlePropertyChange = (property: string, value: unknown) => {
    const sel = selection();
    if (!sel.primary || !editorAPI) return;

    const { primaryType, primaryId } = sel;
    const currentContent = editorAPI.getValue();
    const parsedData = editorAPI.getLastParsedData();

    if (primaryType === 'room') {
      const newContent = editRoomProperty(currentContent, primaryId, property, value, parsedData);
      if (newContent !== currentContent) {
        editorAPI.setValue(newContent);
      }
    } else if (primaryType === 'wall') {
      const newContent = editWallProperty(currentContent, primaryId, property, value, parsedData);
      if (newContent !== currentContent) {
        editorAPI.setValue(newContent);
      }
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

      {/* Bottom: Properties panel with rich property definitions */}
      <div class="flex-shrink-0 max-h-48 overflow-y-auto">
        <PropertiesPanel
          hasSelection={selection().hasSelection}
          entityType={selection().primaryType}
          entityId={selection().primaryId}
          propertyDefs={selection().propertyDefs}
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
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

// ================================================================
// DSL Manipulation Helpers
// ================================================================

/**
 * Remove a room entity from the DSL by finding its `room <Name> ...` block.
 * Uses source ranges from parsed data when available, falls back to regex.
 */
function removeEntityFromDsl(
  dsl: string,
  entityType: string,
  entityId: string,
  parsedData: JsonExport | null,
): string {
  if (entityType !== 'room') return dsl;

  // Try source range from parsed data first
  if (parsedData) {
    for (const floor of parsedData.floors) {
      const room = floor.rooms.find((r: JsonRoom) => r.name === entityId);
      if (room?._sourceRange) {
        return removeBySourceRange(dsl, room._sourceRange);
      }
    }
  }

  // Fallback: indentation-based removal
  // Find the room line and all following lines with deeper indentation
  const lines = dsl.split('\n');
  const roomLineIndex = lines.findIndex((line) =>
    new RegExp(`^\\s*room\\s+${escapeRegex(entityId)}\\b`).test(line),
  );
  if (roomLineIndex === -1) return dsl;

  const roomIndent = (lines[roomLineIndex].match(/^(\s*)/)?.[1] ?? '').length;
  let endIndex = roomLineIndex;
  for (let i = roomLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') {
      endIndex = i;
      continue;
    }
    const lineIndent = (line.match(/^(\s*)/)?.[1] ?? '').length;
    if (lineIndent > roomIndent) {
      endIndex = i;
    } else {
      break;
    }
  }

  lines.splice(roomLineIndex, endIndex - roomLineIndex + 1);
  return lines.join('\n');
}

/**
 * Remove a connection from the DSL between two rooms.
 */
function removeConnectionFromDsl(dsl: string, fromRoom: string, toRoom: string): string {
  // Match connection patterns: `<fromRoom> -- <toRoom> ...` or similar
  const connPattern = new RegExp(
    `^[ \\t]*${escapeRegex(fromRoom)}\\s+--\\s+${escapeRegex(toRoom)}\\b[^\\n]*\\n?`,
    'gm',
  );
  let result = dsl.replace(connPattern, '');

  // Also try the reverse direction
  const reversePattern = new RegExp(
    `^[ \\t]*${escapeRegex(toRoom)}\\s+--\\s+${escapeRegex(fromRoom)}\\b[^\\n]*\\n?`,
    'gm',
  );
  result = result.replace(reversePattern, '');

  return result;
}

/**
 * Remove text from DSL using a source range.
 * Removes the entire line(s) if the range spans full lines.
 */
function removeBySourceRange(dsl: string, range: JsonSourceRange): string {
  const lines = dsl.split('\n');
  // Source ranges are 0-indexed
  const startLine = range.startLine;
  const endLine = range.endLine;

  // Remove the lines (inclusive)
  lines.splice(startLine, endLine - startLine + 1);

  return lines.join('\n');
}

/**
 * Edit a room property in the DSL text.
 * Finds the room block and updates the specific property.
 */
function editRoomProperty(
  dsl: string,
  roomId: string,
  property: string,
  value: unknown,
  parsedData: JsonExport | null,
): string {
  // Find the room line in DSL
  const roomLineRegex = new RegExp(`^([ \\t]*room\\s+${escapeRegex(roomId)}\\s+)(.*)$`, 'gm');
  const match = roomLineRegex.exec(dsl);
  if (!match) return dsl;

  const prefix = match[1];
  let rest = match[2];

  if (property === 'name') {
    // Rename room: replace in the prefix
    const newPrefix = prefix.replace(new RegExp(`\\b${escapeRegex(roomId)}\\b`), String(value));
    return dsl.slice(0, match.index) + newPrefix + rest + dsl.slice(match.index + match[0].length);
  }

  if (property === 'x' || property === 'y') {
    // Update position: `at (X, Y)`
    const currentData = parsedData ? findRoom(parsedData, roomId) : null;
    const x = property === 'x' ? Number(value) : (currentData?.x ?? 0);
    const y = property === 'y' ? Number(value) : (currentData?.z ?? 0);
    rest = rest.replace(/at\s*\([^)]*\)/, `at (${x}, ${y})`);
  } else if (property === 'width' || property === 'height') {
    // Update size: `size (W x H)`
    const currentData = parsedData ? findRoom(parsedData, roomId) : null;
    const w = property === 'width' ? Number(value) : (currentData?.width ?? 4);
    const h = property === 'height' ? Number(value) : (currentData?.height ?? 4);
    rest = rest.replace(/size\s*\([^)]*\)/, `size (${w} x ${h})`);
  } else if (property === 'roomHeight') {
    // Update room height: `height <N>`
    if (rest.includes('height')) {
      rest = rest.replace(/height\s+[\d.]+/, `height ${Number(value)}`);
    } else {
      // Insert height before walls if present, or at end
      const wallsIndex = rest.indexOf('walls');
      if (wallsIndex !== -1) {
        rest = `${rest.slice(0, wallsIndex)}height ${Number(value)} ${rest.slice(wallsIndex)}`;
      } else {
        rest = `${rest} height ${Number(value)}`;
      }
    }
  }

  return dsl.slice(0, match.index) + prefix + rest + dsl.slice(match.index + match[0].length);
}

/**
 * Edit a wall property in the DSL text.
 * Wall entityId format: "RoomName_direction" (e.g., "LivingRoom_top")
 */
function editWallProperty(
  dsl: string,
  wallId: string,
  property: string,
  value: unknown,
  _parsedData: JsonExport | null,
): string {
  const wallMatch = wallId.match(/^(.+)_(top|bottom|left|right)$/);
  if (!wallMatch) return dsl;

  const roomName = wallMatch[1];
  const direction = wallMatch[2];

  if (property === 'type') {
    // Find the room's walls block and update the specific direction
    // Pattern: `walls [..., direction: type, ...]`
    const wallsRegex = new RegExp(
      `(room\\s+${escapeRegex(roomName)}\\b[^\\n]*walls\\s*\\[[^\\]]*)\\b${escapeRegex(direction)}\\s*:\\s*\\w+`,
      'g',
    );
    return dsl.replace(wallsRegex, `$1${direction}: ${String(value)}`);
  }

  return dsl;
}

/** Find a room in parsed JSON data by name */
function findRoom(data: JsonExport, roomId: string): JsonRoom | null {
  for (const floor of data.floors) {
    const room = floor.rooms.find((r) => r.name === roomId);
    if (room) return room;
  }
  return null;
}

/** Escape special regex characters */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
