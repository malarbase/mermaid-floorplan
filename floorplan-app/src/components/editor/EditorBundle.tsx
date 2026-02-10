import type { JsonExport, JsonRoom, JsonSourceRange } from 'floorplan-3d-core';
import { serializeRoom } from 'floorplan-language';
import { createEffect, createSignal, on } from 'solid-js';
import { type GetEntityDataFn, useSelection } from '~/hooks/useSelection';
import AddRoomDialog, { type AddRoomData } from './AddRoomDialog';
import DeleteConfirmDialog, { type DeleteEntity } from './DeleteConfirmDialog';
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
  const [deleteEntities, setDeleteEntities] = createSignal<DeleteEntity[]>([]);

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
   * Open delete confirmation dialog -- handles all selected entities.
   */
  const handleDelete = () => {
    const sel = selection();
    if (!sel.hasSelection) return;

    // Build delete entity list from ALL selected entities
    const entities: DeleteEntity[] = sel.entities.map((e: any) => {
      const type = e.entityType ?? 'unknown';
      const id = e.entityId ?? 'unknown';
      let label = id;
      if (type === 'wall') {
        label = `wall "${id}" (will be changed to open)`;
      }
      return { type, id, label };
    });

    setDeleteEntities(entities);
    // Keep legacy field for backwards compat
    setSelectedEntityName(entities[0]?.label ?? '');
    setShowDeleteDialog(true);
  };

  /**
   * Execute deletion after confirmation.
   * Iterates ALL selected entities (not just primary):
   * - Walls: changed to "open" type instead of removing
   * - Rooms: removed from DSL (with cascade deletion of related connections)
   * - Connections: removed from DSL using source ranges when available
   *
   * Processes removals in reverse source-range order to avoid line-offset drift.
   */
  const handleDeleteConfirm = () => {
    if (!editorAPI) {
      setShowDeleteDialog(false);
      return;
    }

    const entities = deleteEntities();
    if (entities.length === 0) {
      setShowDeleteDialog(false);
      return;
    }

    let currentContent = editorAPI.getValue();
    const parsedData = editorAPI.getLastParsedData();

    // Collect source ranges for batch removal (rooms + connections to remove)
    // Process walls first (they just change type, no line removal)
    const wallEntities = entities.filter((e) => e.type === 'wall');
    const roomEntities = entities.filter((e) => e.type === 'room');
    const connEntities = entities.filter((e) => e.type === 'connection');

    // 1. Handle wall entities - change to "open"
    for (const wall of wallEntities) {
      // Find and apply "open" type change for this wall
      const wallId = wall.id; // e.g., "Kitchen_top"
      const match = wallId.match(/^(.+)_(top|bottom|left|right)$/);
      if (match) {
        currentContent = changeWallTypeInDsl(
          currentContent,
          match[1],
          match[2],
          'open',
          parsedData,
        );
      }
    }

    // 2. Build a unified list of DSL edits (removals + replacements).
    //    All edits are applied in a single pass sorted by startLine descending
    //    so each edit doesn't invalidate the line numbers of subsequent edits.
    type DslEdit =
      | { kind: 'remove'; range: JsonSourceRange }
      | { kind: 'replace'; range: JsonSourceRange; newDsl: string };

    const edits: DslEdit[] = [];
    const deletedRoomNames = new Set<string>();

    // 2a. Collect room removals
    for (const room of roomEntities) {
      deletedRoomNames.add(room.id);
      if (parsedData) {
        for (const floor of parsedData.floors) {
          const roomData = floor.rooms.find((r: JsonRoom) => r.name === room.id);
          if (roomData?._sourceRange) {
            edits.push({ kind: 'remove', range: roomData._sourceRange });
          }
        }
      }
    }

    // 2b. Cascade: convert rooms referencing deleted rooms to absolute positioning
    if (parsedData && deletedRoomNames.size > 0) {
      const replacements = findDependentRoomReplacements(
        parsedData,
        deletedRoomNames,
        currentContent,
      );
      for (const replacement of replacements) {
        edits.push({ kind: 'replace', range: replacement.sourceRange, newDsl: replacement.newDsl });
      }
    }

    // 3. Cascade: find connections referencing deleted rooms
    if (parsedData?.connections && deletedRoomNames.size > 0) {
      for (const conn of parsedData.connections) {
        if (deletedRoomNames.has(conn.fromRoom) || deletedRoomNames.has(conn.toRoom)) {
          const connSource = (conn as { _sourceRange?: JsonSourceRange })._sourceRange;
          if (connSource) {
            edits.push({ kind: 'remove', range: connSource });
          }
        }
      }
    }

    // 4. Handle explicit connection deletions
    for (const connEntity of connEntities) {
      if (parsedData?.connections) {
        const connId = connEntity.id;
        for (const conn of parsedData.connections) {
          const expectedIds = [
            `${conn.fromRoom}-${conn.toRoom}`,
            `${conn.fromRoom}_${conn.toRoom}`,
          ];
          if (expectedIds.includes(connId)) {
            const connSource = (conn as { _sourceRange?: JsonSourceRange })._sourceRange;
            if (connSource) {
              edits.push({ kind: 'remove', range: connSource });
            }
            break;
          }
        }
      }
    }

    // 5. Apply all edits in a single pass, sorted by startLine descending to avoid offset drift
    if (edits.length > 0) {
      // Deduplicate by startLine:endLine (prefer 'replace' over 'remove' if same range)
      const uniqueEdits = new Map<string, DslEdit>();
      for (const edit of edits) {
        const key = `${edit.range.startLine}:${edit.range.endLine}`;
        const existing = uniqueEdits.get(key);
        // Prefer replace over remove (replace preserves the room with new position)
        if (!existing || (edit.kind === 'replace' && existing.kind === 'remove')) {
          uniqueEdits.set(key, edit);
        }
      }
      const sorted = Array.from(uniqueEdits.values()).sort(
        (a, b) => b.range.startLine - a.range.startLine,
      );

      for (const edit of sorted) {
        if (edit.kind === 'remove') {
          currentContent = removeBySourceRange(currentContent, edit.range);
        } else {
          currentContent = replaceSourceRange(currentContent, edit.range, edit.newDsl);
        }
      }
    }

    // If rooms without source ranges remain, fall back to regex removal
    if (parsedData) {
      for (const room of roomEntities) {
        const hasRange = parsedData.floors.some(
          (f) => f.rooms.find((r: JsonRoom) => r.name === room.id)?._sourceRange,
        );
        if (!hasRange) {
          currentContent = removeEntityFromDsl(currentContent, 'room', room.id, parsedData);
        }
      }
    }

    editorAPI.setValue(currentContent);

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
          selectionCount={selection().count}
          selectionSummary={selection().summary}
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
        entities={deleteEntities()}
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
 * Replace text at a source range with new content.
 * Unlike removeBySourceRange, this substitutes rather than deletes.
 */
function replaceSourceRange(dsl: string, range: JsonSourceRange, newContent: string): string {
  const lines = dsl.split('\n');
  const startLine = range.startLine;
  const endLine = range.endLine;

  // Replace the lines at the range with the new content lines
  const newLines = newContent.split('\n');
  lines.splice(startLine, endLine - startLine + 1, ...newLines);

  return lines.join('\n');
}

/**
 * Find rooms that reference any of the deleted rooms via relative positioning
 * and generate replacement DSL lines with absolute coordinates.
 */
function findDependentRoomReplacements(
  parsedData: JsonExport,
  deletedRoomNames: Set<string>,
  dslContent?: string,
): Array<{ sourceRange: JsonSourceRange; newDsl: string }> {
  const replacements: Array<{ sourceRange: JsonSourceRange; newDsl: string }> = [];
  const dslLines = dslContent?.split('\n');

  for (const floor of parsedData.floors) {
    for (const room of floor.rooms) {
      // Skip rooms being deleted
      if (deletedRoomNames.has(room.name)) continue;

      // Check if this room references a deleted room via relative positioning
      if (!room._relativePosition || !deletedRoomNames.has(room._relativePosition.reference))
        continue;

      // This room depends on a room being deleted -- convert to absolute positioning
      const sourceRange = room._sourceRange;
      if (!sourceRange) continue;

      // Extract wall types from the room's walls array
      const walls: Record<string, string> = {
        top: 'solid',
        right: 'solid',
        bottom: 'solid',
        left: 'solid',
      };
      for (const wall of room.walls) {
        walls[wall.direction] = wall.type;
      }

      // Infer indentation from original DSL line (fall back to 2 spaces)
      let indent = '  ';
      if (dslLines && sourceRange.startLine < dslLines.length) {
        const originalLine = dslLines[sourceRange.startLine];
        const match = originalLine.match(/^(\s*)/);
        if (match) indent = match[1];
      }

      // Serialize with absolute position (x, z from resolved coordinates)
      const newDsl = serializeRoom(
        {
          name: room.name,
          position: { x: room.x, y: room.z }, // z in JSON = y in DSL coordinate space
          size: { width: room.width, height: room.height },
          roomHeight: room.roomHeight,
          elevation: room.elevation,
          walls: {
            top: walls.top ?? 'solid',
            right: walls.right ?? 'solid',
            bottom: walls.bottom ?? 'solid',
            left: walls.left ?? 'solid',
          },
          label: room.label ?? undefined,
        },
        indent,
      );

      replacements.push({ sourceRange, newDsl });
    }
  }

  return replacements;
}

/**
 * Change a wall type in the DSL for a specific room and direction.
 * Finds the wall line within the room block and updates its type.
 */
function changeWallTypeInDsl(
  dsl: string,
  roomName: string,
  direction: string,
  newType: string,
  parsedData: JsonExport | null,
): string {
  // Try source range approach first
  if (parsedData) {
    for (const floor of parsedData.floors) {
      const room = floor.rooms.find((r: JsonRoom) => r.name === roomName);
      if (room?.walls) {
        const wall = room.walls.find((w) => w.direction === direction);
        const wallSource = (wall as { _sourceRange?: JsonSourceRange })?._sourceRange;
        if (wallSource) {
          const lines = dsl.split('\n');
          const wallLine = lines[wallSource.startLine];
          if (wallLine) {
            // Replace the wall type in the line
            lines[wallSource.startLine] = wallLine.replace(/\b(solid|open|glass)\b/, newType);
            return lines.join('\n');
          }
        }
      }
    }
  }

  // Fallback: regex-based
  const wallPattern = new RegExp(
    `^([ \\t]*${escapeRegex(direction)}\\s+wall\\s+)(solid|open|glass)(\\b.*)$`,
    'gm',
  );
  return dsl.replace(wallPattern, `$1${newType}$3`);
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
