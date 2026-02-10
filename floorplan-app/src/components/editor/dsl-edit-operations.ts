/**
 * DSL text manipulation operations.
 *
 * Pure functions that transform DSL strings using source ranges and the
 * serializer (single source of truth). No regex-based grammar assumptions —
 * if the grammar changes, serializeRoom's types change and callers get
 * build errors instead of silent failures.
 *
 * No UI, editor, or framework dependencies — easily unit-testable.
 */
import type { JsonExport, JsonRoom, JsonSourceRange } from 'floorplan-3d-core';
import { type SerializeRoomParams, serializeRoom } from 'floorplan-language';

// ─── Source-range operations ────────────────────────────────────────

/**
 * Remove lines from DSL text identified by a 0-indexed source range.
 */
export function removeBySourceRange(dsl: string, range: JsonSourceRange): string {
  const lines = dsl.split('\n');
  lines.splice(range.startLine, range.endLine - range.startLine + 1);
  return lines.join('\n');
}

/**
 * Replace lines in DSL text at a 0-indexed source range with new content.
 */
export function replaceSourceRange(
  dsl: string,
  range: JsonSourceRange,
  newContent: string,
): string {
  const lines = dsl.split('\n');
  const newLines = newContent.split('\n');
  lines.splice(range.startLine, range.endLine - range.startLine + 1, ...newLines);
  return lines.join('\n');
}

// ─── JsonRoom ↔ SerializeRoomParams conversion ─────────────────────

/**
 * Convert a JsonRoom (parsed data) to SerializeRoomParams (serializer input).
 * This is the bridge between "what the parser produced" and "what the
 * serializer needs". Used by property edits, delete cascades, and any
 * operation that re-serializes a room.
 *
 * For rooms with relative positioning, the absolute position is omitted
 * so the serializer emits the relative clause instead.
 */
export function jsonRoomToSerializeParams(room: JsonRoom): SerializeRoomParams {
  const walls = { top: 'solid', right: 'solid', bottom: 'solid', left: 'solid' };
  for (const w of room.walls) {
    walls[w.direction as keyof typeof walls] = w.type;
  }

  return {
    name: room.name,
    // Omit absolute position when room uses relative positioning
    position: room._relativePosition ? undefined : { x: room.x, y: room.z },
    size: { width: room.width, height: room.height },
    roomHeight: room.roomHeight,
    elevation: room.elevation,
    walls,
    relativePosition: room._relativePosition
      ? {
          direction: room._relativePosition.direction,
          reference: room._relativePosition.reference,
          gap: room._relativePosition.gap,
          alignment: room._relativePosition.alignment,
        }
      : undefined,
    label: room.label ?? undefined,
    style: room.style ?? undefined,
  };
}

/**
 * Infer the leading indentation of a DSL line from the source range.
 * Falls back to 2 spaces if the line can't be read.
 */
export function inferIndent(dsl: string, range: JsonSourceRange): string {
  const lines = dsl.split('\n');
  if (range.startLine < lines.length) {
    const match = lines[range.startLine].match(/^(\s*)/);
    if (match) return match[1];
  }
  return '  ';
}

// ─── Unified entity property editing ────────────────────────────────

/**
 * Edit any entity property using the read-modify-reserialize pattern.
 *
 * 1. Reads the full entity from parsedData
 * 2. Clones its SerializeRoomParams and overrides the changed property
 * 3. Re-serializes the entire room via serializeRoom()
 * 4. Replaces the original text via its _sourceRange
 *
 * Grammar changes cause build errors in SerializeRoomParams/serializeRoom
 * rather than silent regex mismatches.
 */
export function editEntityProperty(
  dsl: string,
  entityType: string,
  entityId: string,
  property: string,
  value: unknown,
  parsedData: JsonExport | null,
): string {
  if (!parsedData) return dsl;

  if (entityType === 'room') {
    return editRoomViaReserialize(dsl, entityId, property, value, parsedData);
  }

  if (entityType === 'wall') {
    return editWallViaReserialize(dsl, entityId, property, value, parsedData);
  }

  return dsl;
}

/**
 * Edit a room property by re-serializing the entire room line.
 */
function editRoomViaReserialize(
  dsl: string,
  roomId: string,
  property: string,
  value: unknown,
  parsedData: JsonExport,
): string {
  const room = findRoom(parsedData, roomId);
  if (!room?._sourceRange) return dsl;

  const params = jsonRoomToSerializeParams(room);

  // Apply the property override
  switch (property) {
    case 'name':
      params.name = String(value);
      break;
    case 'x':
      if (params.position) params.position.x = Number(value);
      else params.position = { x: Number(value), y: room.z };
      break;
    case 'y':
      if (params.position) params.position.y = Number(value);
      else params.position = { x: room.x, y: Number(value) };
      break;
    case 'width':
      params.size.width = Number(value);
      break;
    case 'height':
      params.size.height = Number(value);
      break;
    case 'roomHeight':
      params.roomHeight = Number(value);
      break;
    case 'elevation':
      params.elevation = Number(value);
      break;
    case 'style':
      params.style = value ? String(value) : undefined;
      break;
    case 'label':
      params.label = value ? String(value) : undefined;
      break;
    case 'positioning': {
      // Compound property — full positioning data from PositioningFieldset
      const pos = value as {
        mode: string;
        x?: number;
        y?: number;
        direction?: string;
        reference?: string;
        gap?: number;
        align?: string;
      };
      if (pos.mode === 'absolute') {
        params.position = { x: pos.x ?? room.x, y: pos.y ?? room.z };
        params.relativePosition = undefined;
      } else {
        params.position = undefined;
        params.relativePosition = {
          direction: pos.direction ?? 'right-of',
          reference: pos.reference ?? '',
          gap: pos.gap && pos.gap > 0 ? pos.gap : undefined,
          alignment: pos.align || undefined,
        };
      }
      break;
    }
    case 'walls': {
      // Compound property — full WallConfig from WallsFieldset
      const w = value as Record<string, string>;
      params.walls = {
        top: w.top ?? 'solid',
        right: w.right ?? 'solid',
        bottom: w.bottom ?? 'solid',
        left: w.left ?? 'solid',
      };
      break;
    }
    default:
      return dsl; // Unknown property — no-op
  }

  const indent = inferIndent(dsl, room._sourceRange);
  const newDsl = serializeRoom(params, indent);
  return replaceSourceRange(dsl, room._sourceRange, newDsl);
}

/**
 * Edit a wall property by re-serializing the parent room.
 * Wall entityId format: "RoomName_direction" (e.g., "LivingRoom_top")
 */
function editWallViaReserialize(
  dsl: string,
  wallId: string,
  property: string,
  value: unknown,
  parsedData: JsonExport,
): string {
  const parsed = parseWallId(wallId);
  if (!parsed) return dsl;

  const room = findRoom(parsedData, parsed.roomName);
  if (!room?._sourceRange) return dsl;

  const params = jsonRoomToSerializeParams(room);

  if (property === 'type') {
    const dir = parsed.direction as keyof typeof params.walls;
    params.walls[dir] = String(value);
  } else {
    return dsl; // Unknown wall property — no-op
  }

  const indent = inferIndent(dsl, room._sourceRange);
  const newDsl = serializeRoom(params, indent);
  return replaceSourceRange(dsl, room._sourceRange, newDsl);
}

// ─── Wall type editing (used by delete plan for wall → open) ────────

/**
 * Change a wall type in the DSL for a specific room and direction.
 * Uses the re-serialize approach via the parent room's source range.
 */
export function changeWallTypeInDsl(
  dsl: string,
  roomName: string,
  direction: string,
  newType: string,
  parsedData: JsonExport | null,
): string {
  if (!parsedData) return dsl;

  const room = findRoom(parsedData, roomName);
  if (!room?._sourceRange) return dsl;

  const params = jsonRoomToSerializeParams(room);
  const dir = direction as keyof typeof params.walls;
  params.walls[dir] = newType;

  const indent = inferIndent(dsl, room._sourceRange);
  const newDsl = serializeRoom(params, indent);
  return replaceSourceRange(dsl, room._sourceRange, newDsl);
}

// ─── Room removal ───────────────────────────────────────────────────

/**
 * Remove a room from DSL by name using its source range.
 * Returns DSL unchanged if the room or its source range can't be found.
 */
export function removeEntityFromDsl(
  dsl: string,
  entityType: string,
  entityId: string,
  parsedData: JsonExport | null,
): string {
  if (entityType !== 'room' || !parsedData) return dsl;

  const room = findRoom(parsedData, entityId);
  if (!room?._sourceRange) return dsl;

  return removeBySourceRange(dsl, room._sourceRange);
}

// ─── Utilities ──────────────────────────────────────────────────────

/** Find a room in parsed JSON data by name. */
export function findRoom(data: JsonExport, roomId: string): JsonRoom | null {
  for (const floor of data.floors) {
    const room = floor.rooms.find((r) => r.name === roomId);
    if (room) return room;
  }
  return null;
}

/** Parse a wall entityId ("RoomName_direction") into its components. */
export function parseWallId(wallId: string): { roomName: string; direction: string } | null {
  const match = wallId.match(/^(.+)_(top|bottom|left|right)$/);
  if (!match) return null;
  return { roomName: match[1], direction: match[2] };
}
