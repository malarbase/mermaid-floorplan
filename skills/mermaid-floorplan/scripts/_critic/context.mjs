/**
 * AST helpers and context builder.
 *
 * `extractConnectionsFromAst` recovers the `outside` keyword that the JSON
 * converter strips. `buildCriticContext` produces the merged context object
 * consumed by all rules.
 *
 * The single-floor rules consume the legacy fields (rooms / adjacency / kinds /
 * connections / floorId) which describe the FIRST floor. Multi-floor rules
 * access `floors` (array of mini-contexts, one per floor) and
 * `verticalConnections` to inspect cross-floor structure.
 */

import { sharedEdge, inferKind } from './geometry.mjs';

// ---------------------------------------------------------------------------
// AST helpers (for features the JSON converter strips, e.g. `outside`)
// ---------------------------------------------------------------------------

export function extractConnectionsFromAst(floorplan) {
  const out = [];
  for (const c of floorplan.connections ?? []) {
    const fromRef = c.from?.room;
    const toRef = c.to?.room;
    const fromText = fromRef?.$cstNode?.text ?? fromRef?.$refText;
    const toText = toRef?.$cstNode?.text ?? toRef?.$refText;
    const fromRoom = fromRef?.name ?? (fromText === 'outside' ? 'outside' : fromText);
    const toRoom = toRef?.name ?? (toText === 'outside' ? 'outside' : toText);
    if (!fromRoom || !toRoom) continue;
    out.push({
      fromRoom,
      fromWall: c.from?.wall ?? null,
      toRoom,
      toWall: c.to?.wall ?? null,
      doorType: c.doorType,
      position: c.position,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

function buildSingleFloorContext(floor, allConnections, config = {}, styles = []) {
  const rooms = floor.rooms ?? [];
  const roomsByName = new Map(rooms.map((r) => [r.name, r]));
  const adjacency = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const edge = sharedEdge(rooms[i], rooms[j]);
      if (edge) {
        adjacency.push({
          rooms: [rooms[i].name, rooms[j].name],
          length: edge.length,
          edge,
        });
      }
    }
  }
  const kinds = new Map(rooms.map((r) => [r.name, inferKind(r)]));
  // Keep only connections that touch this floor. An outside connection
  // counts only when the other end is a room on this floor; otherwise it
  // belongs to a different floor's egress and shouldn't influence this
  // floor's reachability check.
  const floorConns = (allConnections ?? []).filter((c) => {
    const fromOut = c.fromRoom === 'outside';
    const toOut = c.toRoom === 'outside';
    if (fromOut) return roomsByName.has(c.toRoom);
    if (toOut) return roomsByName.has(c.fromRoom);
    return roomsByName.has(c.fromRoom) && roomsByName.has(c.toRoom);
  });
  let bbox = null;
  if (rooms.length > 0) {
    const xMin = Math.min(...rooms.map((r) => r.x));
    const yMin = Math.min(...rooms.map((r) => r.z));
    const xMax = Math.max(...rooms.map((r) => r.x + r.width));
    const yMax = Math.max(...rooms.map((r) => r.z + r.height));
    bbox = { xMin, yMin, xMax, yMax, width: xMax - xMin, height: yMax - yMin };
  }
  return {
    rooms,
    roomsByName,
    connections: floorConns,
    adjacency,
    kinds,
    floorId: floor.id,
    floorHeight: floor.height,
    stairs: floor.stairs ?? [],
    lifts: floor.lifts ?? [],
    bbox,
    config,
    styles,
  };
}

export function buildCriticContext(floors, connections, verticalConnections = [], config = {}, styles = []) {
  if (!floors || floors.length === 0) return null;
  const perFloor = floors.map((f) => buildSingleFloorContext(f, connections, config, styles));
  const primary = perFloor[0];
  return {
    ...primary,
    floors: perFloor,
    verticalConnections,
    config,
    styles,
  };
}
