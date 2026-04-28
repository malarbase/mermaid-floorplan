#!/usr/bin/env node
/**
 * modify.mjs — apply AST-based edits to a .floorplan.
 *
 * Mirrors the MCP `modify_floorplan` tool. Accepts the same operation
 * union so prompts and tooling can share a single schema.
 *
 * Usage:
 *   node modify.mjs <file.floorplan> --ops ops.json [--out out.floorplan]
 *   node modify.mjs --dsl '<literal>' --ops ops.json
 *   cat file.floorplan | node modify.mjs --ops ops.json --out result.floorplan
 *
 * If --out is omitted, the modified DSL is returned in the envelope's
 * `data.dsl` field only.
 *
 * Supported operations (JSON array elements):
 *   { action: "add_room",          params: {...} }
 *   { action: "remove_room",       target: "RoomName" }
 *   { action: "resize_room",       target: "RoomName", params: { width, height } }
 *   { action: "move_room",         target: "RoomName", params: { x, y } }
 *   { action: "rename_room",       target: "RoomName", params: { newName } }
 *   { action: "update_walls",      target: "RoomName", params: { top?, right?, bottom?, left? } }
 *   { action: "add_label",         target: "RoomName", params: { label } }
 *   { action: "convert_to_relative", params: { anchorRoom, alignmentTolerance?, targetRooms? } }
 *   { action: "add_connection",    params: { fromRoom, fromWall?, toRoom, toWall?, type, position? } }
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { FloorplanAstEditor } from '../../../../floorplan-mcp-server/out/utils/ast-editor.js';
import {
  buildRelativeAssignments,
  extractAllRoomBounds,
  validateForConversion,
} from '../../../../floorplan-mcp-server/out/utils/spatial.js';

import {
  parseArgs,
  readDsl,
  parseDsl,
  emitOk,
  emitValidationError,
  run,
} from './_lib.mjs';

function requireTarget(op) {
  if (!op.target) throw new Error(`Operation '${op.action}' requires 'target'`);
}

const VALID_WALLS = new Set(['top', 'right', 'bottom', 'left']);
const VALID_CONN_TYPES = new Set(['door', 'double-door', 'opening']);

function connectionRoomName(ref) {
  if (!ref) return undefined;
  if (ref.name) return ref.name;
  return ref.$cstNode?.text ?? ref.$refText;
}

function formatConnectLine(params) {
  const from = params.fromWall ? `${params.fromRoom}.${params.fromWall}` : params.fromRoom;
  const to = params.toWall ? `${params.toRoom}.${params.toWall}` : params.toRoom;
  const at = params.position !== undefined && params.position !== null ? ` at ${params.position}%` : '';
  return `connect ${from} to ${to} ${params.type}${at}`;
}

function applyAddConnection(currentDsl, document, editor, params) {
  for (const k of ['fromRoom', 'toRoom', 'type']) {
    if (params[k] === undefined || params[k] === null || params[k] === '') {
      throw new Error(`'add_connection' requires params.${k}`);
    }
  }
  if (!VALID_CONN_TYPES.has(params.type)) {
    throw new Error(
      `Invalid connection type "${params.type}" — expected one of ${[...VALID_CONN_TYPES].join(', ')}`,
    );
  }
  for (const wallKey of ['fromWall', 'toWall']) {
    const w = params[wallKey];
    if (w !== undefined && w !== null && !VALID_WALLS.has(w)) {
      throw new Error(`Invalid ${wallKey} "${w}" — expected one of ${[...VALID_WALLS].join(', ')}`);
    }
  }
  if (params.position !== undefined && params.position !== null) {
    const p = Number(params.position);
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      throw new Error(`Invalid position ${params.position} — must be a number in [0, 100]`);
    }
    params.position = p;
  }
  for (const roomName of [params.fromRoom, params.toRoom]) {
    if (roomName === 'outside') continue;
    if (!editor.findRoom(roomName)) {
      throw new Error(`Room "${roomName}" not found`);
    }
  }

  const floorplan = document.parseResult.value;
  const conns = floorplan.connections ?? [];

  for (const c of conns) {
    const fromName = connectionRoomName(c.from?.room);
    const toName = connectionRoomName(c.to?.room);
    if (
      fromName === params.fromRoom &&
      (c.from?.wall ?? null) === (params.fromWall ?? null) &&
      toName === params.toRoom &&
      (c.to?.wall ?? null) === (params.toWall ?? null) &&
      c.doorType === params.type
    ) {
      const samePos =
        params.position === undefined ||
        params.position === null ||
        Math.abs((c.position ?? 50) - params.position) < 0.001;
      if (samePos) {
        return {
          dsl: currentDsl,
          message: `Connection already present: ${formatConnectLine(params)}`,
        };
      }
    }
  }

  let insertAfter = null;
  for (const c of conns) {
    const fromName = connectionRoomName(c.from?.room);
    const toName = connectionRoomName(c.to?.room);
    if (
      fromName === params.fromRoom ||
      toName === params.fromRoom ||
      fromName === params.toRoom ||
      toName === params.toRoom
    ) {
      insertAfter = c;
    }
  }
  if (!insertAfter && conns.length > 0) insertAfter = conns[conns.length - 1];

  let insertOffset;
  let indent = '';
  if (insertAfter && insertAfter.$cstNode) {
    insertOffset = insertAfter.$cstNode.end;
    const startOff = insertAfter.$cstNode.offset;
    let lineStart = startOff;
    while (lineStart > 0 && currentDsl[lineStart - 1] !== '\n') lineStart--;
    indent = currentDsl.slice(lineStart, startOff);
  } else if (floorplan.floors && floorplan.floors.length > 0) {
    const lastFloor = floorplan.floors[floorplan.floors.length - 1];
    if (!lastFloor.$cstNode) {
      throw new Error('Cannot determine insertion point: floor has no CST node');
    }
    insertOffset = lastFloor.$cstNode.end;
  } else {
    throw new Error('Cannot determine insertion point: no floors and no existing connections');
  }

  const line = formatConnectLine(params);
  const newText = `\n${indent}${line}`;
  const updatedDsl =
    currentDsl.slice(0, insertOffset) + newText + currentDsl.slice(insertOffset);
  return { dsl: updatedDsl, message: `Added: ${line}` };
}

async function applyOperation(currentDsl, op) {
  const { document, parseErrors } = await parseDsl(currentDsl);
  if (parseErrors.length > 0) {
    throw new Error(`DSL failed to parse: ${parseErrors[0].message}`);
  }
  const editor = new FloorplanAstEditor(document, currentDsl);

  switch (op.action) {
    case 'add_room': {
      const ok = editor.addRoom(op.params);
      if (!ok) throw new Error('Could not find floor block to add room');
      return { dsl: editor.apply(), message: `Added room '${op.params.name}'` };
    }
    case 'remove_room': {
      requireTarget(op);
      const room = editor.findRoom(op.target);
      if (!room) throw new Error(`Room "${op.target}" not found`);
      if (!editor.removeRoom(room)) throw new Error(`Could not remove room "${op.target}"`);
      return { dsl: editor.apply(), message: `Removed '${op.target}'` };
    }
    case 'resize_room': {
      requireTarget(op);
      const room = editor.findRoom(op.target);
      if (!room) throw new Error(`Room "${op.target}" not found`);
      if (!editor.resizeRoom(room, op.params.width, op.params.height))
        throw new Error(`Could not resize room "${op.target}"`);
      return { dsl: editor.apply(), message: `Resized to ${op.params.width}x${op.params.height}` };
    }
    case 'move_room': {
      requireTarget(op);
      const room = editor.findRoom(op.target);
      if (!room) throw new Error(`Room "${op.target}" not found`);
      if (!editor.moveRoom(room, op.params.x, op.params.y))
        throw new Error(`Could not move room "${op.target}"`);
      return { dsl: editor.apply(), message: `Moved to (${op.params.x},${op.params.y})` };
    }
    case 'rename_room': {
      requireTarget(op);
      const room = editor.findRoom(op.target);
      if (!room) throw new Error(`Room "${op.target}" not found`);
      if (!editor.renameRoom(room, op.params.newName))
        throw new Error(`Could not rename room "${op.target}"`);
      return { dsl: editor.apply(), message: `Renamed to ${op.params.newName}` };
    }
    case 'update_walls': {
      requireTarget(op);
      const room = editor.findRoom(op.target);
      if (!room) throw new Error(`Room "${op.target}" not found`);
      if (!editor.updateWalls(room, op.params))
        throw new Error(`Could not update walls for "${op.target}"`);
      return { dsl: editor.apply(), message: 'Walls updated' };
    }
    case 'add_label': {
      requireTarget(op);
      const room = editor.findRoom(op.target);
      if (!room) throw new Error(`Room "${op.target}" not found`);
      if (!editor.updateLabel(room, op.params.label))
        throw new Error(`Could not set label for "${op.target}"`);
      return { dsl: editor.apply(), message: `Label set to "${op.params.label}"` };
    }
    case 'add_connection': {
      const result = applyAddConnection(currentDsl, document, editor, op.params ?? {});
      return result;
    }
    case 'convert_to_relative': {
      const { anchorRoom, alignmentTolerance = 1, targetRooms } = op.params;
      const allRooms = editor.getAllRooms();
      const v = validateForConversion(allRooms, anchorRoom);
      if (!v.valid) throw new Error(`Cannot convert to relative: ${v.errors.join('; ')}`);
      const roomBounds = extractAllRoomBounds(allRooms);
      const { assignments, unresolved } = buildRelativeAssignments(
        roomBounds,
        anchorRoom,
        alignmentTolerance,
      );
      if (unresolved.length > 0)
        throw new Error(`Could not resolve relative positions for: ${unresolved.join(', ')}`);
      const set = targetRooms ? new Set(targetRooms) : null;
      const filtered = set ? assignments.filter((a) => set.has(a.room)) : assignments;
      for (const a of filtered) {
        const room = editor.findRoom(a.room);
        if (!room) continue;
        editor.removePosition(room);
        editor.addRelativePosition(room, a.direction, a.reference, a.gap, a.alignment);
      }
      return {
        dsl: editor.apply(),
        message: `Converted ${filtered.length} room(s) to relative positioning`,
      };
    }
    default:
      throw new Error(`Unknown operation: ${op.action}`);
  }
}

run(async () => {
  const args = parseArgs();
  const dsl = readDsl(args);

  if (!args.ops) {
    emitValidationError([{ message: 'Missing --ops <ops.json>' }]);
  }

  let ops;
  try {
    ops = JSON.parse(readFileSync(args.ops, 'utf-8'));
  } catch (err) {
    emitValidationError([{ message: `Could not read --ops file '${args.ops}': ${err.message}` }]);
  }
  if (!Array.isArray(ops)) {
    emitValidationError([{ message: '--ops file must contain a JSON array of operations' }]);
  }

  // Pre-flight: confirm the input DSL parses
  const { parseErrors } = await parseDsl(dsl);
  if (parseErrors.length > 0) emitValidationError(parseErrors);

  let currentDsl = dsl;
  const changes = [];
  const errors = [];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    try {
      const { dsl: nextDsl, message } = await applyOperation(currentDsl, op);
      currentDsl = nextDsl;
      changes.push({
        action: op.action,
        target: op.target ?? op.params?.name ?? op.params?.anchorRoom ?? null,
        result: 'applied',
        message,
      });
    } catch (err) {
      changes.push({
        action: op.action,
        target: op.target ?? op.params?.name ?? op.params?.anchorRoom ?? null,
        result: 'error',
        message: err.message,
      });
      errors.push({ operation: i, message: err.message });
    }
  }

  // Final parse check so we never return broken DSL silently
  const final = await parseDsl(currentDsl);
  if (final.parseErrors.length > 0) {
    emitValidationError(
      [
        ...errors,
        ...final.parseErrors.map((e) => ({ ...e, message: `Final DSL: ${e.message}` })),
      ],
      { dsl: currentDsl, changes },
    );
  }

  if (args.out) {
    const outPath = resolve(args.out);
    writeFileSync(outPath, currentDsl);
    changes.push({ action: 'write', target: outPath, result: 'applied' });
  }

  if (errors.length > 0) {
    emitValidationError(errors, { dsl: currentDsl, changes });
  }
  emitOk({ dsl: currentDsl, changes });
});
