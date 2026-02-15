/**
 * Delete-plan builder and executor for DSL entities.
 *
 * Builds a declarative edit plan (what to change) and applies it (how to
 * change the text). Both functions are pure — no editor/framework deps —
 * making them easy to unit-test and reuse.
 *
 * The plan is also used by the delete-confirmation dialog to show cascade
 * effects (e.g. rooms converted from relative → absolute positioning).
 */
import type { JsonExport, JsonRoom, JsonSourceRange } from 'floorplan-3d-core';
import { serializeRoom } from 'floorplan-language';
import type { DeleteEntity } from './DeleteConfirmDialog';
import {
  changeWallTypeInDsl,
  inferIndent,
  jsonRoomToSerializeParams,
  parseWallId,
  removeBySourceRange,
  removeEntityFromDsl,
  replaceSourceRange,
} from './dsl-edit-operations';

// ─── Types ──────────────────────────────────────────────────────────

/** A single DSL text edit. */
export type DslEdit =
  | { kind: 'remove'; range: JsonSourceRange }
  | { kind: 'replace'; range: JsonSourceRange; newDsl: string };

/** A room whose relative positioning will be converted to absolute. */
export interface CascadeConversion {
  /** Room being converted */
  roomName: string;
  /** The deleted room it referenced */
  wasRelativeTo: string;
  /** Original relative direction (e.g. "right-of") */
  direction: string;
}

/** Wall type changes (in-place, no line removal). */
export interface WallChange {
  roomName: string;
  direction: string;
  newType: string;
}

/**
 * Declarative description of all DSL changes needed for a delete operation.
 * Computed *before* the confirmation dialog, so the UI can display cascade info.
 */
export interface DslEditPlan {
  /** Wall type changes (applied first as in-place edits). */
  wallChanges: WallChange[];
  /** Unified line-level edits (removals + replacements), pre-deduplicated. */
  edits: DslEdit[];
  /** Rooms that will be converted from relative → absolute positioning. */
  cascadeConversions: CascadeConversion[];
  /** Room names falling back to regex removal (no source range available). */
  regexFallbacks: string[];
}

// ─── Plan builder ───────────────────────────────────────────────────

/**
 * Build a declarative edit plan from the entities selected for deletion.
 *
 * Pure function — no side effects. Can be called *before* showing the
 * confirmation dialog so the UI can inform the user about cascading changes.
 */
export function buildDeletePlan(
  entities: DeleteEntity[],
  parsedData: JsonExport | null,
  dslContent: string,
): DslEditPlan {
  const wallEntities = entities.filter((e) => e.type === 'wall');
  const roomEntities = entities.filter((e) => e.type === 'room');
  const connEntities = entities.filter((e) => e.type === 'connection');

  // 1. Wall changes (in-place type swaps)
  const wallChanges: WallChange[] = [];
  for (const wall of wallEntities) {
    const parsed = parseWallId(wall.id);
    if (parsed) {
      wallChanges.push({ roomName: parsed.roomName, direction: parsed.direction, newType: 'open' });
    }
  }

  // 2. Build unified edits + cascade info
  const edits: DslEdit[] = [];
  const deletedRoomNames = new Set<string>();
  const cascadeConversions: CascadeConversion[] = [];
  const regexFallbacks: string[] = [];

  // 2a. Room removals
  for (const room of roomEntities) {
    deletedRoomNames.add(room.id);
    if (parsedData) {
      let hasRange = false;
      for (const floor of parsedData.floors) {
        const roomData = floor.rooms.find((r: JsonRoom) => r.name === room.id);
        if (roomData?._sourceRange) {
          edits.push({ kind: 'remove', range: roomData._sourceRange });
          hasRange = true;
        }
      }
      if (!hasRange) {
        regexFallbacks.push(room.id);
      }
    }
  }

  // 2b. Cascade: relative → absolute conversions for dependent rooms
  if (parsedData && deletedRoomNames.size > 0) {
    for (const floor of parsedData.floors) {
      for (const room of floor.rooms) {
        if (deletedRoomNames.has(room.name)) continue;

        const relPos = room._relativePosition;
        if (!relPos || !deletedRoomNames.has(relPos.reference)) continue;

        const sourceRange = room._sourceRange;
        if (!sourceRange) continue;

        // Record for UI notification
        cascadeConversions.push({
          roomName: room.name,
          wasRelativeTo: relPos.reference,
          direction: relPos.direction,
        });

        // Convert to absolute positioning via re-serialize
        const params = jsonRoomToSerializeParams(room);
        // Force absolute position (override relative positioning)
        params.position = { x: room.x, y: room.z };
        params.relativePosition = undefined;

        const indent = inferIndent(dslContent, sourceRange);
        const newDsl = serializeRoom(params, indent);

        edits.push({ kind: 'replace', range: sourceRange, newDsl });
      }
    }
  }

  // 3. Connection cascade (connections referencing deleted rooms)
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

  // 4. Explicit connection deletions
  for (const connEntity of connEntities) {
    if (parsedData?.connections) {
      const connId = connEntity.id;
      for (const conn of parsedData.connections) {
        const expectedIds = [`${conn.fromRoom}-${conn.toRoom}`, `${conn.fromRoom}_${conn.toRoom}`];
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

  // Deduplicate edits (prefer replace over remove for same range)
  const uniqueEdits = new Map<string, DslEdit>();
  for (const edit of edits) {
    const key = `${edit.range.startLine}:${edit.range.endLine}`;
    const existing = uniqueEdits.get(key);
    if (!existing || (edit.kind === 'replace' && existing.kind === 'remove')) {
      uniqueEdits.set(key, edit);
    }
  }

  return {
    wallChanges,
    edits: Array.from(uniqueEdits.values()),
    cascadeConversions,
    regexFallbacks,
  };
}

// ─── Plan executor ──────────────────────────────────────────────────

/**
 * Apply a delete plan to DSL text, returning the modified content.
 *
 * 1. Wall type changes (in-place)
 * 2. Line-level edits sorted descending by startLine (avoids offset drift)
 * 3. Regex fallback removals for rooms without source ranges
 */
export function applyDslEditPlan(
  dsl: string,
  plan: DslEditPlan,
  parsedData: JsonExport | null,
): string {
  let content = dsl;

  // 1. Wall type changes
  for (const wc of plan.wallChanges) {
    content = changeWallTypeInDsl(content, wc.roomName, wc.direction, wc.newType, parsedData);
  }

  // 2. Sorted line-level edits (descending startLine)
  const sorted = [...plan.edits].sort((a, b) => b.range.startLine - a.range.startLine);
  for (const edit of sorted) {
    if (edit.kind === 'remove') {
      content = removeBySourceRange(content, edit.range);
    } else {
      content = replaceSourceRange(content, edit.range, edit.newDsl);
    }
  }

  // 3. Regex fallbacks for rooms without source ranges
  for (const roomName of plan.regexFallbacks) {
    content = removeEntityFromDsl(content, 'room', roomName, parsedData);
  }

  return content;
}
