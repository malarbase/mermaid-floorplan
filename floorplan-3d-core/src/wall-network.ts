/**
 * Wall network — per-edge wall data model (rebuild of `wall-ownership.ts`).
 *
 * Replaces the per-room wall emission of `wall-ownership.ts` / `wall-builder.ts`
 * with a network of `WallNode`s connected by `WallEdge`s. Each shared wall
 * collapses to a single edge with two `EdgeRoomBinding`s (one per room face);
 * exterior walls have a single binding. Corner geometry is mitred at each node
 * (`mitreNodes`) instead of being arbitrated by per-corner ownership tables.
 *
 * Phases landed in this file:
 *   - Phase 1 (`buildWallNetwork`, `routeConnectionsToEdges`,
 *     `splitTJunctionEdges`): construct and index the network.
 *   - Phase 2 (`mitreNodes`): compute corner mitre cuts and write them to
 *     each edge's `startCut` / `endCut`. Also sorts each node's incident
 *     edges by angle, an ordering Phase 3 relies on. Phase 8 (slanted mitre
 *     fill): replaced single-scalar `a` inset with per-side `leftA` / `rightA`
 *     insets so adjacent walls tile the corner cell without gaps.
 *   - Phase 3 (`emitEdgeMesh`, `emitNetworkMeshes`): build per-edge wall
 *     meshes with CSG hole subtraction for connections / explicit doors /
 *     windows, attach per-side materials, and place door panels + window
 *     glass via the existing `connection-geometry.ts` helper.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Polygon-readiness audit (Phase 6 of the wall-network rebuild)
 * ─────────────────────────────────────────────────────────────────────────
 *
 * The data model and miter math are intentionally polygon-ready: walls are
 * `(nodeA, nodeB)` pairs in world XZ, sides are computed by 2D cross product,
 * `WallNode.edges` is sorted by angle (not by direction keyword), and the
 * miter formula `inset = (t/2) / tan(θ/2)` operates on arbitrary angles.
 *
 * The remaining rectangular-only entry points (each survives as a thin
 * adapter that the upcoming `add-complex-room-shapes` change will replace):
 *
 *   1. `getRoomCornersForDirection(room, direction)` — derives two corner
 *      points from `room.x / z / width / height` plus a direction keyword.
 *      Polygon equivalent: index into `room.polygon[i]` and
 *      `room.polygon[(i + 1) % n]`.
 *   2. `ALL_DIRECTIONS` — the four-element direction array used to iterate
 *      a rectangular room's walls in `buildWallNetwork`. Polygon equivalent:
 *      `for (let i = 0; i < room.polygon.length; i++)`.
 *   3. `roomEdgeLength = direction === 'top' | 'bottom' ? room.width
 *      : room.height` (in `buildWallNetwork`). Polygon equivalent:
 *      `Vector2.distance(room.polygon[i], room.polygon[(i + 1) % n])`.
 *   4. `connection.fromWall === 'left'/'right'` projection in `emitEdgeMesh`'s
 *      hole positioning. When polygon support lands, `JsonConnection.fromWall`
 *      becomes a numeric edge index and this branch becomes a single
 *      polygon-edge lookup — no recursion into mitre or CSG code paths.
 *
 * The only direction keyword that *intentionally* survives polygon support
 * is `EdgeRoomBinding.direction`, which exists purely as a routing key for
 * `JsonConnection`. When polygon rooms land, that key becomes a numeric
 * edge index, a localized change with no impact on construction, miter, or
 * mesh emission.
 *
 * Slanted mitre fill is now implemented (Phase 8): each wall end gets a
 * per-side inset (`startCut.leftA` / `startCut.rightA`) so adjacent walls
 * tile the corner cell without gaps.  At L-corners the more-horizontal wall
 * is dominant (flat end cap, extends both sides) and the more-vertical wall
 * is subordinate (chevron tip, matches legacy geometry).  At T-junctions the
 * through-wall uses a near-zero inset on both sides so its face stays flush.
 * The `b` offset in `startCut`/`endCut` remains reserved for future
 * asymmetric-thickness support (out of scope).
 */

import { calculatePositionWithFallback, type RoomBounds } from 'floorplan-common';
import * as THREE from 'three';
import { generateConnection } from './connection-geometry.js';
import { DIMENSIONS, getThemeColors, type ViewerTheme } from './constants.js';
import { type CSGBrush, getCSG, isCsgAvailable } from './csg-manager.js';
import { reassignNormalsToEdgeMaterials } from './csg-utils.js';
import { MaterialFactory, type MaterialStyle } from './materials.js';
import type { JsonConfig, JsonConnection, JsonFloor, JsonRoom, JsonWall } from './types.js';
import type { StyleResolver } from './wall-ownership.js';

/**
 * Floating-point tolerance for node coalescing and on-segment hit tests.
 *
 * Re-uses the project-wide geometry epsilon so wall-network behaviour stays
 * consistent with the rest of the 3D pipeline (CSG cutter inflation, slab
 * boundary checks, etc.).
 */
export const NETWORK_EPSILON = DIMENSIONS.GEOMETRY.EPSILON;

/**
 * Convention for `EdgeRoomBinding.side`:
 *
 * Treat the XZ plane as a standard 2D coordinate system where `x` is the first
 * axis and `z` is the second axis. Walking from `nodeA` to `nodeB` along the
 * canonical edge direction:
 *
 *   cross = (nodeB.x - nodeA.x) * (roomCenter.z - nodeA.z)
 *         - (nodeB.z - nodeA.z) * (roomCenter.x - nodeA.x)
 *
 *   cross > 0  → roomCenter is on the LEFT  side of the edge
 *   cross < 0  → roomCenter is on the RIGHT side of the edge
 *   cross == 0 → degenerate (room center on the edge line) — defaults to LEFT
 *
 * Concrete example: a 5×5 room at (0,0). Its top wall has corners (0,0)→(5,0).
 * Canonical nodeA→nodeB therefore points in +x. The room center (2.5, 2.5) is
 * at +z relative to the edge ⇒ `cross = 5*2.5 - 0*2.5 = 12.5 > 0` ⇒ side=LEFT.
 *
 * Phase 2's mitre code uses this side flag to know which interior face of an
 * edge a given room paints; Phase 3's per-face material assignment uses the
 * same flag to pick `styleA` vs `styleB`.
 */

/**
 * A vertex in the wall network — every wall endpoint, interior T-junction, and
 * polygon-room corner becomes a node. Nodes are deduplicated by canonical id.
 */
export interface WallNode {
  /** Canonical "x,z" id with epsilon rounding (see {@link nodeIdOf}). */
  id: string;
  /** World XZ position. `pos.x` = world X, `pos.y` = world Z. */
  pos: THREE.Vector2;
  /**
   * Edges incident to this node. Append-order in Phase 1; sorted by angle
   * around the node in Phase 2 (`mitreNodes`) so adjacent-edge bisectors can
   * be walked in CCW order.
   */
  edges: WallEdge[];
}

/**
 * One wall in the network. Owns its own thickness, height, and (eventually)
 * mitre cut offsets. A shared wall is a single edge with two
 * `EdgeRoomBinding`s; an exterior wall has one binding.
 */
export interface WallEdge {
  /** Canonical "nodeIdA|nodeIdB" with the smaller node id first. */
  id: string;
  /** Endpoint with the lexicographically smaller node id. */
  nodeA: WallNode;
  /** Endpoint with the lexicographically larger node id. */
  nodeB: WallNode;
  /** Wall thickness in world units. */
  thickness: number;
  /** Wall height in world units. Resolved via wall→room→config precedence. */
  height: number;
  /** Room faces painted onto this edge (1 = exterior, 2 = shared). */
  rooms: EdgeRoomBinding[];
  /** Doors/windows that open through this edge. Routed by `routeConnectionsToEdges`. */
  connections: JsonConnection[];
  /**
   * Mirrors `JsonWall.type` when explicitly set to door/window. Captures the
   * originating wall's `position` / `width` / `height` / `isPercentage` so
   * Phase 3 can carve the explicit cutout without re-deriving it from the
   * source `JsonWall` (which is no longer reachable from the edge once the
   * network has been built).
   *
   * Phase 3 hole semantics (mirroring legacy `wall-builder.createExplicitHole`):
   *   - `isPercentage === true`        → `position` is a percent of edge length.
   *   - `isPercentage === false`       → `position` is an absolute world-unit
   *                                       offset from the edge's nodeA endpoint.
   *   - `isPercentage` undefined       → defaults to percentage interpretation,
   *                                       matching the historical DSL convention.
   *   - `position` undefined           → centred (50% of edge length).
   */
  explicitType?: {
    kind: 'door' | 'window';
    position?: number;
    width?: number;
    height?: number;
    isPercentage?: boolean;
  };
  /**
   * Mitre cut at `nodeA` end. `leftA` is the along-edge inset for the LEFT
   * face; `rightA` for the RIGHT face (both measured from nodeA toward
   * centre; negative values extend past nodeA — expected for the reflex side
   * of a degree-2 L-corner). `b` is reserved for asymmetric thickness and is
   * always 0 for uniform-thickness walls.
   *
   * Populated by `mitreNodes` in Phase 2. Phase 1 emits the sentinel
   * `{ leftA: 0, rightA: 0, b: 0 }`.
   */
  startCut: { leftA: number; rightA: number; b: number };
  /**
   * Mitre cut at `nodeB` end. Same sign convention as `startCut`.
   * Populated by `mitreNodes` in Phase 2.
   */
  endCut: { leftA: number; rightA: number; b: number };
}

/**
 * One room's view of an edge: which side it sits on, what direction the
 * room originally called the wall, and which style/length to use when the
 * edge is rendered.
 */
export interface EdgeRoomBinding {
  /** The room that contributes this binding. */
  room: JsonRoom;
  /** Which side of the canonical `nodeA→nodeB` direction this room is on. */
  side: 'left' | 'right';
  /**
   * Original wall direction in this room (`top`/`bottom`/`left`/`right`).
   * Preserved verbatim so `JsonConnection.fromWall` can route to the edge
   * via `WallNetwork.byRoomDirection`.
   */
  direction: 'top' | 'bottom' | 'left' | 'right';
  /** Resolved style for this room's interior face on this edge. */
  style: MaterialStyle | undefined;
  /**
   * Length of the source room's wall in world units (= room.width or
   * room.height depending on direction). Preserved through edge splitting so
   * `JsonConnection.position` percentages stay correct after T-junction
   * splits change the network edge's geometric length.
   */
  roomEdgeLength: number;
}

/**
 * The constructed network for one floor. `byRoomDirection` is the routing
 * index used by `routeConnectionsToEdges` and (eventually) by Phase 4's
 * `WallBuilder` to map `JsonConnection` to its host edge(s).
 */
export interface WallNetwork {
  nodes: Map<string, WallNode>;
  edges: Map<string, WallEdge>;
  /** Index keyed by `${roomName}|${direction}`. */
  byRoomDirection: Map<string, WallEdge[]>;
  /** All rooms on this floor, keyed by room name. Used for overlap-aware connection routing. */
  rooms: Map<string, JsonRoom>;
}

// ---------------------------------------------------------------------------
// Helpers (exported so Phase 2's mitreNodes can reuse them)
// ---------------------------------------------------------------------------

/**
 * Round a coordinate to 4 decimal places (≈ 0.1mm at 1 unit = 1m). Used for
 * canonical node id generation so that two endpoints landing within rounding
 * distance of each other coalesce to the same network node.
 */
export function round4(v: number): number {
  return Math.round(v * 10000) / 10000;
}

/**
 * Build the canonical id for a node at `(x, z)` in world coordinates.
 * Always pairs with `round4` so two endpoints that should be the same node
 * map to the same id.
 */
export function nodeIdOf(x: number, z: number): string {
  return `${round4(x)},${round4(z)}`;
}

/**
 * Build the canonical id for an edge between two node ids. Sorts the two
 * endpoints lexicographically so the edge id is independent of insertion
 * order (which matters because shared walls are emitted twice — once per
 * room — and must collapse to a single edge).
 */
export function edgeIdOf(idA: string, idB: string): string {
  return idA < idB ? `${idA}|${idB}` : `${idB}|${idA}`;
}

/**
 * Compute the angle of `edge` as seen from `node`, in radians, measured
 * with `Math.atan2(dz, dx)` so the result is in `(-π, π]`. Phase 2's
 * `mitreNodes` sorts each `WallNode.edges` array by this value to walk
 * adjacent edges in counter-clockwise order around the node.
 */
export function angleAroundNode(node: WallNode, edge: WallEdge): number {
  const other = edge.nodeA === node ? edge.nodeB : edge.nodeA;
  const dx = other.pos.x - node.pos.x;
  const dz = other.pos.y - node.pos.y;
  return Math.atan2(dz, dx);
}

/**
 * 2D scalar cross product `(b-a) × (c-a)` in the XZ plane. Positive ⇒ `c` is
 * on the left of the directed line from `a` to `b`; negative ⇒ right. See
 * the side-convention comment block at the top of this file.
 */
function cross2D(ax: number, az: number, bx: number, bz: number, cx: number, cz: number): number {
  return (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
}

function computeSide(
  canonA: WallNode,
  canonB: WallNode,
  centerX: number,
  centerZ: number,
): 'left' | 'right' {
  const c = cross2D(canonA.pos.x, canonA.pos.y, canonB.pos.x, canonB.pos.y, centerX, centerZ);
  return c >= 0 ? 'left' : 'right';
}

/**
 * Get the (start, end) world XZ corners of a room wall in the room's own
 * direction convention:
 *
 *   top    : (x, z)             → (x+w, z)             // along +x
 *   right  : (x+w, z)           → (x+w, z+h)           // along +z
 *   bottom : (x, z+h)           → (x+w, z+h)           // along +x
 *   left   : (x, z)             → (x, z+h)             // along +z
 *
 * Note: `room.height` is the Z-axis extent in world space, not vertical
 * height.
 */
function roomWallCorners(
  room: JsonRoom,
  direction: 'top' | 'bottom' | 'left' | 'right',
): { startX: number; startZ: number; endX: number; endZ: number } {
  switch (direction) {
    case 'top':
      return { startX: room.x, startZ: room.z, endX: room.x + room.width, endZ: room.z };
    case 'bottom':
      return {
        startX: room.x,
        startZ: room.z + room.height,
        endX: room.x + room.width,
        endZ: room.z + room.height,
      };
    case 'left':
      return { startX: room.x, startZ: room.z, endX: room.x, endZ: room.z + room.height };
    case 'right':
      return {
        startX: room.x + room.width,
        startZ: room.z,
        endX: room.x + room.width,
        endZ: room.z + room.height,
      };
  }
}

/**
 * Get-or-create a node at `(x, z)`. Mutates `net.nodes`.
 */
function getOrCreateNode(net: WallNetwork, x: number, z: number): WallNode {
  const id = nodeIdOf(x, z);
  let node = net.nodes.get(id);
  if (!node) {
    node = {
      id,
      pos: new THREE.Vector2(round4(x), round4(z)),
      edges: [],
    };
    net.nodes.set(id, node);
  }
  return node;
}

const ALL_DIRECTIONS: ReadonlyArray<'top' | 'bottom' | 'left' | 'right'> = [
  'top',
  'bottom',
  'left',
  'right',
];

// ---------------------------------------------------------------------------
// Phase 1.1: buildWallNetwork
// ---------------------------------------------------------------------------

/**
 * Build the wall network for one floor.
 *
 * For each room, the four canonical wall directions are walked. Walls whose
 * `JsonWall.type === 'open'` are skipped (they contribute no geometry). Each
 * remaining wall is collapsed to a `(nodeA, nodeB)` edge in world XZ; when
 * two rooms emit the same edge id (a shared wall), the second emission
 * appends an extra `EdgeRoomBinding` to the existing edge instead of
 * creating a duplicate.
 *
 * If a direction has no entry in `room.walls`, it is treated as a default
 * solid wall — matching the existing renderer convention.
 *
 * Connections are NOT routed here — call `routeConnectionsToEdges`.
 * T-junction node splits are NOT applied here — call `splitTJunctionEdges`.
 */
export function buildWallNetwork(
  floor: JsonFloor,
  config: JsonConfig,
  styleResolver: StyleResolver,
): WallNetwork {
  const net: WallNetwork = {
    nodes: new Map(),
    edges: new Map(),
    byRoomDirection: new Map(),
    rooms: new Map(),
  };

  const defaultThickness = config.wall_thickness ?? DIMENSIONS.WALL.THICKNESS;
  const configHeight = config.default_height ?? DIMENSIONS.WALL.HEIGHT;

  for (const room of floor.rooms) {
    net.rooms.set(room.name, room);
    const wallsByDir = new Map<string, JsonWall>();
    for (const w of room.walls) wallsByDir.set(w.direction, w);

    const style = styleResolver(room);
    const roomCenterX = room.x + room.width / 2;
    const roomCenterZ = room.z + room.height / 2;

    for (const direction of ALL_DIRECTIONS) {
      const wall = wallsByDir.get(direction);

      if (wall && wall.type === 'open') continue;

      const corners = roomWallCorners(room, direction);
      const nodeP = getOrCreateNode(net, corners.startX, corners.startZ);
      const nodeQ = getOrCreateNode(net, corners.endX, corners.endZ);

      if (nodeP.id === nodeQ.id) continue; // degenerate (zero-length wall)

      // Canonical orientation: smaller node id is nodeA.
      const [canonA, canonB] = nodeP.id < nodeQ.id ? [nodeP, nodeQ] : [nodeQ, nodeP];
      const id = `${canonA.id}|${canonB.id}`;

      const roomEdgeLength =
        direction === 'top' || direction === 'bottom' ? room.width : room.height;

      const wallHeight = wall?.wallHeight ?? room.roomHeight ?? configHeight;
      const explicitType: WallEdge['explicitType'] =
        wall && (wall.type === 'door' || wall.type === 'window')
          ? {
              kind: wall.type,
              position: wall.position,
              width: wall.width,
              height: wall.height,
              isPercentage: wall.isPercentage,
            }
          : undefined;

      let edge = net.edges.get(id);
      if (!edge) {
        edge = {
          id,
          nodeA: canonA,
          nodeB: canonB,
          thickness: defaultThickness,
          height: wallHeight,
          rooms: [],
          connections: [],
          explicitType,
          startCut: { leftA: 0, rightA: 0, b: 0 },
          endCut: { leftA: 0, rightA: 0, b: 0 },
        };
        net.edges.set(id, edge);
        canonA.edges.push(edge);
        canonB.edges.push(edge);
      } else {
        // Shared wall: prefer the larger height (taller wall wins) and
        // promote explicitType if either side specified door/window.
        if (wallHeight > edge.height) edge.height = wallHeight;
        if (!edge.explicitType && explicitType) edge.explicitType = explicitType;
      }

      const binding: EdgeRoomBinding = {
        room,
        side: computeSide(canonA, canonB, roomCenterX, roomCenterZ),
        direction,
        style,
        roomEdgeLength,
      };
      edge.rooms.push(binding);

      const indexKey = `${room.name}|${direction}`;
      let bucket = net.byRoomDirection.get(indexKey);
      if (!bucket) {
        bucket = [];
        net.byRoomDirection.set(indexKey, bucket);
      }
      if (!bucket.includes(edge)) bucket.push(edge);
    }
  }

  return net;
}

// ---------------------------------------------------------------------------
// Phase 1.2: routeConnectionsToEdges
// ---------------------------------------------------------------------------

/**
 * Push every `JsonConnection` onto the edge(s) that host its source wall
 * (`fromRoom` + `fromWall`).
 *
 * For rectangular rooms (the only case Phase 1 supports) the lookup yields
 * exactly one edge before T-junction splitting and possibly multiple edges
 * after splitting. The same `JsonConnection` reference is pushed onto each
 * matching edge — it is up to Phase 3's edge mesh emission to test which
 * edge actually contains the connection's offset.
 *
 * Zero or multiple matches are reported via `console.warn` (rather than
 * thrown) so that authoring mistakes don't crash the renderer.
 */
export function routeConnectionsToEdges(net: WallNetwork, connections: JsonConnection[]): void {
  for (const conn of connections) {
    const key = `${conn.fromRoom}|${conn.fromWall}`;
    const edges = net.byRoomDirection.get(key);

    if (!edges || edges.length === 0) {
      console.warn(
        `[wall-network] No edge found for connection from ${conn.fromRoom}.${conn.fromWall}`,
      );
      continue;
    }

    if (edges.length > 1) {
      console.warn(
        `[wall-network] Multiple (${edges.length}) edges match connection from ${conn.fromRoom}.${conn.fromWall} — pushing onto all of them`,
      );
    }

    for (const edge of edges) edge.connections.push(conn);
  }
}

// ---------------------------------------------------------------------------
// Phase 1.4: splitTJunctionEdges
// ---------------------------------------------------------------------------

/**
 * Compute the parametric position `t` (in `[0, 1]`) of `point` projected onto
 * the segment `(A, B)`. Returns null if the projection is off the segment
 * interior (within `NETWORK_EPSILON` of either endpoint counts as "off"
 * because endpoints are already incident nodes).
 */
function projectOntoSegmentInterior(A: WallNode, B: WallNode, point: WallNode): number | null {
  const ABx = B.pos.x - A.pos.x;
  const ABz = B.pos.y - A.pos.y;
  const lenSq = ABx * ABx + ABz * ABz;
  if (lenSq < NETWORK_EPSILON * NETWORK_EPSILON) return null;

  const APx = point.pos.x - A.pos.x;
  const APz = point.pos.y - A.pos.y;
  const t = (APx * ABx + APz * ABz) / lenSq;

  // Off-endpoint: must be strictly inside (0, 1) by an EPSILON margin.
  const eps = NETWORK_EPSILON / Math.sqrt(lenSq);
  if (t <= eps || t >= 1 - eps) return null;

  // Off the line: perpendicular distance must be < EPSILON.
  const projX = A.pos.x + t * ABx;
  const projZ = A.pos.y + t * ABz;
  const dx = point.pos.x - projX;
  const dz = point.pos.y - projZ;
  if (dx * dx + dz * dz > NETWORK_EPSILON * NETWORK_EPSILON) return null;

  return t;
}

/**
 * Compute the fraction `t ∈ [0, 1]` along the canonical `nodeA→nodeB`
 * direction at which `conn` would land.
 *
 * Uses `calculatePositionWithFallback` with both source and target room
 * bounds so that percentage positions are interpreted relative to the
 * *overlapping* portion of the two rooms — the same math used in
 * `resolveConnectionHole` during rendering. This ensures a connection
 * routed during `splitTJunctionEdges` ends up on the correct sub-edge
 * even when the source room wall is longer than the target room wall
 * (the common "fan-out" case, e.g. Corridor + several slot rooms).
 */
function connectionFractionAlongEdge(
  conn: JsonConnection,
  edge: WallEdge,
  rooms: Map<string, JsonRoom>,
): number {
  const binding = edge.rooms.find(
    (b) => b.room.name === conn.fromRoom && b.direction === conn.fromWall,
  );
  if (!binding) return 0.5; // defensive; routing guarantees this normally

  const sourceRoom = binding.room;
  const targetRoom = rooms.get(conn.toRoom) ?? null;

  const sourceBounds: RoomBounds = {
    x: sourceRoom.x,
    y: sourceRoom.z,
    width: sourceRoom.width,
    height: sourceRoom.height,
  };
  const targetBounds: RoomBounds | null = targetRoom
    ? { x: targetRoom.x, y: targetRoom.z, width: targetRoom.width, height: targetRoom.height }
    : null;

  const isVertical = conn.fromWall === 'left' || conn.fromWall === 'right';
  const percentage = conn.position ?? 50;

  let worldX: number;
  let worldZ: number;
  if (isVertical) {
    worldZ = calculatePositionWithFallback(sourceBounds, targetBounds, true, percentage);
    worldX = conn.fromWall === 'left' ? sourceRoom.x : sourceRoom.x + sourceRoom.width;
  } else {
    worldX = calculatePositionWithFallback(sourceBounds, targetBounds, false, percentage);
    worldZ = conn.fromWall === 'top' ? sourceRoom.z : sourceRoom.z + sourceRoom.height;
  }

  const dx = edge.nodeB.pos.x - edge.nodeA.pos.x;
  const dz = edge.nodeB.pos.y - edge.nodeA.pos.y;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < NETWORK_EPSILON * NETWORK_EPSILON) return 0;

  const ux = worldX - edge.nodeA.pos.x;
  const uz = worldZ - edge.nodeA.pos.y;
  return Math.max(0, Math.min(1, (ux * dx + uz * dz) / lenSq));
}

function removeFromArray<T>(arr: T[], item: T): void {
  const i = arr.indexOf(item);
  if (i >= 0) arr.splice(i, 1);
}

/**
 * Get-or-create an edge between `(nodeP, nodeQ)`, inheriting the metadata
 * from `template`. If an edge with the same canonical id already exists,
 * the supplied bindings are appended to it (and `side` is recomputed against
 * the existing canonical orientation).
 */
function getOrCreateEdgeWithBindings(
  net: WallNetwork,
  nodeP: WallNode,
  nodeQ: WallNode,
  bindings: EdgeRoomBinding[],
  template: { thickness: number; height: number; explicitType?: WallEdge['explicitType'] },
): WallEdge {
  const [canonA, canonB] = nodeP.id < nodeQ.id ? [nodeP, nodeQ] : [nodeQ, nodeP];
  const id = `${canonA.id}|${canonB.id}`;

  let edge = net.edges.get(id);
  if (!edge) {
    edge = {
      id,
      nodeA: canonA,
      nodeB: canonB,
      thickness: template.thickness,
      height: template.height,
      rooms: [],
      connections: [],
      explicitType: template.explicitType,
      startCut: { leftA: 0, rightA: 0, b: 0 },
      endCut: { leftA: 0, rightA: 0, b: 0 },
    };
    net.edges.set(id, edge);
    canonA.edges.push(edge);
    canonB.edges.push(edge);
  } else {
    if (template.height > edge.height) edge.height = template.height;
    if (!edge.explicitType && template.explicitType) edge.explicitType = template.explicitType;
  }

  for (const b of bindings) {
    edge.rooms.push({
      ...b,
      side: computeSide(
        edge.nodeA,
        edge.nodeB,
        b.room.x + b.room.width / 2,
        b.room.z + b.room.height / 2,
      ),
    });
  }

  return edge;
}

/**
 * Split an edge at an interior node into two halves, copy bindings to both,
 * partition connections by their position along the original edge, and
 * update all incident node `edges` arrays plus the `byRoomDirection` index.
 *
 * Mergeable edges (where one of the new halves coincides with an edge that
 * already exists in the network — typical when a shared wall meets a
 * partial wall on one side) are merged via `getOrCreateEdgeWithBindings`.
 */
function splitEdgeAt(net: WallNetwork, edge: WallEdge, splitNode: WallNode, t: number): void {
  const A = edge.nodeA;
  const B = edge.nodeB;

  const template = {
    thickness: edge.thickness,
    height: edge.height,
    explicitType: edge.explicitType,
  };

  // Snapshot bindings (deep-copy each binding so the two halves don't share
  // references — `side` will be recomputed during the get-or-create call).
  const bindingsForAX = edge.rooms.map((b) => ({ ...b }));
  const bindingsForXB = edge.rooms.map((b) => ({ ...b }));

  // First detach the original edge so subsequent get-or-create lookups
  // don't accidentally find it as their target.
  net.edges.delete(edge.id);
  removeFromArray(A.edges, edge);
  removeFromArray(B.edges, edge);

  const halfAX = getOrCreateEdgeWithBindings(net, A, splitNode, bindingsForAX, template);
  const halfXB = getOrCreateEdgeWithBindings(net, splitNode, B, bindingsForXB, template);

  // Partition connections by their fraction along the original A→B edge.
  for (const conn of edge.connections) {
    const p = connectionFractionAlongEdge(conn, edge, net.rooms);
    if (p < t) halfAX.connections.push(conn);
    else halfXB.connections.push(conn);
  }

  // Update byRoomDirection: replace the original edge with the two halves
  // (avoiding duplicates if either half had already been registered for
  // this room-direction key by a prior insertion).
  for (const bucket of net.byRoomDirection.values()) {
    const idx = bucket.indexOf(edge);
    if (idx >= 0) {
      bucket.splice(idx, 1);
      if (!bucket.includes(halfAX)) bucket.push(halfAX);
      if (!bucket.includes(halfXB)) bucket.push(halfXB);
    }
  }
}

/**
 * Walk every edge and split it at any interior network node that lies on its
 * segment. Iterates to a fixpoint so that splits which create new
 * collinear-node hits in adjacent edges are also handled.
 *
 * Maintains the invariant that every node-edge incidence is at an edge
 * endpoint — Phase 2's mitre math relies on this so that the angle around
 * a node is well-defined for every incident edge.
 */
export function splitTJunctionEdges(net: WallNetwork): void {
  let didSplit = true;
  let safetyBudget = net.nodes.size * net.edges.size + 16;

  while (didSplit && safetyBudget-- > 0) {
    didSplit = false;
    const edgeSnapshot = [...net.edges.values()];

    for (const edge of edgeSnapshot) {
      // The edge may have been removed by an earlier split in this pass.
      if (!net.edges.has(edge.id)) continue;

      let bestNode: WallNode | null = null;
      let bestT = 0;

      for (const candidate of net.nodes.values()) {
        if (candidate === edge.nodeA || candidate === edge.nodeB) continue;
        const t = projectOntoSegmentInterior(edge.nodeA, edge.nodeB, candidate);
        if (t !== null) {
          // Pick the closest-to-A interior node first so the split is
          // deterministic when multiple nodes lie on one edge.
          if (bestNode === null || t < bestT) {
            bestNode = candidate;
            bestT = t;
          }
        }
      }

      if (bestNode) {
        splitEdgeAt(net, edge, bestNode, bestT);
        didSplit = true;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 2: mitreNodes — corner mitre geometry at every node
// ---------------------------------------------------------------------------

/**
 * Mitre inset for a single (edge, neighbour) pair.
 *
 * `gap` is the angular gap from `edge` to its neighbour, going counter-
 * clockwise — i.e. the angle of the wedge that lives between the two
 * outgoing edge directions on the side where the cut happens. For uniform
 * thickness `t`, the bisector mitre formula simplifies to
 *
 *     inset = (t / 2) / tan(gap / 2)
 *
 * which gives the canonical worked numbers from the plan:
 *   gap = 90°  → t / 2     (rectangular L corner, 4-way crossing branch)
 *   gap = 60°  → t·√3 / 2  (acute corner — bigger inset)
 *   gap = 120° → t / (2√3) (obtuse corner — smaller inset)
 *
 * Special cases:
 *   gap == π   → tan(π/2) = ∞ → inset = 0. Two collinear edges (a wall
 *                continuing straight through the node); no cut on this side.
 *                Floored explicitly rather than relying on JS's Math.tan
 *                near π/2 so the result is exactly 0.
 *   gap > π    → reflex angle. The wall material lives on the OPPOSITE
 *                (smaller) side of the wedge, so this neighbour pair imposes
 *                no constraint at this end. Returned as `+Infinity` so the
 *                per-edge MIN below filters it out.
 *   gap == 0   → degenerate (coincident edges from one node). Treated like
 *                a reflex case — the network builder is expected to coalesce
 *                duplicates upstream so this is a defensive return.
 */
const EMBED = DIMENSIONS.GEOMETRY.WALL_CORNER_EMBED;

/**
 * Compute the along-edge inset for one side of a slanted mitre end-cap.
 * Includes the `WALL_CORNER_EMBED` offset that pushes each slant face
 * slightly past the bisector into the neighbour's body, preventing
 * z-fighting between the two co-bisector faces of adjacent walls.
 *
 * Pre-condition: `0 < gap <= π` (caller filters reflex/zero out).
 * - gap = π/2 (90° corner): returns t/2 - EMBED/sin(π/4) ≈ t/2 - EMBED·√2
 * - gap = π   (collinear, through-wall): returns -EMBED (the through-wall
 *   extends EMBED past the junction into the other through-wall's body,
 *   same tiny overlap the legacy engine uses).
 */
function slantInset(thickness: number, gap: number): number {
  const half = gap / 2;
  const bisector = thickness / 2 / Math.tan(half);
  const embedAlong = EMBED / Math.sin(half);
  return bisector - embedAlong;
}

/** Interior (non-reflex) angle between two edges' outward directions at a shared node. */
function nonReflexGap(node: WallNode, edgeA: WallEdge, edgeB: WallEdge): number {
  const aA = angleAroundNode(node, edgeA);
  const aB = angleAroundNode(node, edgeB);
  let gap = Math.abs(aB - aA);
  if (gap > Math.PI) gap = 2 * Math.PI - gap;
  return gap;
}

/**
 * CCW angular sweep from `fromEdge`'s outward angle to `toEdge`'s outward
 * angle at `node`, in `(0, 2π]`.
 */
function ccwGap(node: WallNode, fromEdge: WallEdge, toEdge: WallEdge): number {
  const aFrom = angleAroundNode(node, fromEdge);
  const aTo = angleAroundNode(node, toEdge);
  let gap = aTo - aFrom;
  if (gap <= 0) gap += 2 * Math.PI;
  return gap;
}

/**
 * Write the cut at the end of `edge` that touches `node`. Each edge is
 * processed twice in the mitre pass — once at each endpoint node — so this
 * helper picks `startCut` (when the node is `nodeA`) or `endCut` (otherwise).
 */
function writeCutAtNode(
  edge: WallEdge,
  node: WallNode,
  cut: { leftA: number; rightA: number; b: number },
): void {
  if (edge.nodeA === node) edge.startCut = cut;
  else edge.endCut = cut;
}

/**
 * Phase 2 / Phase 8: compute per-end slanted mitre cuts for every edge in the
 * network and write them to `edge.startCut` / `edge.endCut`.
 *
 * Algorithm (slanted mitre fill — Phase 8, revised)
 * --------------------------------------------------
 * For every node:
 *   1. Sort `node.edges` in place by `angleAroundNode` ascending (CCW order).
 *      Phase 3's mesh emitter relies on this ordering.
 *   2. For each edge at the node compute independent per-side insets:
 *      - `leftA`: inset for the LEFT face (facing CCW-next neighbour).
 *      - `rightA`: inset for the RIGHT face (facing CCW-prev neighbour).
 *   3. Inset = `slantInset(t, gap)` where gap is the CCW angular sweep to the
 *      neighbour. Reflex gaps (> π) → inset = 0 (square cap on that side).
 *
 * Per-side insets
 * ---------------
 * At an L-corner (N=2, gap=90°) — dominant/subordinate rule:
 *   - The more-horizontal edge (smaller |sin(outward angle)|) is "dominant":
 *     BOTH leftA and rightA = −inset (extends past the node on both sides),
 *     producing a flat rectangular end cap that covers the entire corner cell.
 *   - The more-vertical edge is "subordinate": BOTH leftA and rightA = +inset
 *     (positive = inset from node), producing a chevron tip that butts cleanly
 *     into the dominant wall's flat end face.
 *   This matches the legacy-engine geometry (horizontal extends, vertical insets)
 *   and avoids the visible diagonal slant face on the building exterior.
 *
 * At a T-junction branch end (N=3, both sides 90°): both leftA and rightA
 * ≈ t/2, producing a chevron apex at the branch tip.
 *
 * At a through-wall junction end (N=3, one collinear side): BOTH sides use
 * slantInset(t, π) ≈ −EMBED so the through-wall appears completely continuous
 * at the junction — no visible notch on the face that meets the branch.
 *
 * Across-edge offset `b`
 * ----------------------
 * Always 0 for uniform-thickness walls; reserved for future asymmetric support.
 *
 * Polygon-readiness
 * -----------------
 * Consumes only node degree, edge thickness, and pair angles — no reference
 * to rectangular rooms or direction keywords.
 *
 * Side effects:
 *   - Sorts each `WallNode.edges` array in place by angle ascending.
 *   - Overwrites every `WallEdge.startCut` / `endCut` (replacing the Phase 1
 *     sentinel `{ leftA: 0, rightA: 0, b: 0 }` with the computed values).
 */
export function mitreNodes(net: WallNetwork): void {
  for (const node of net.nodes.values()) {
    const N = node.edges.length;
    if (N === 0) continue;

    node.edges.sort((a, b) => angleAroundNode(node, a) - angleAroundNode(node, b));

    if (N === 1) {
      // Dead end: square cap on both sides.
      writeCutAtNode(node.edges[0], node, { leftA: 0, rightA: 0, b: 0 });
      continue;
    }

    for (let i = 0; i < N; i++) {
      const edge = node.edges[i];
      const isStart = edge.nodeA === node;

      let leftA: number;
      let rightA: number;

      if (N === 2) {
        // L-corner (or collinear seam): dominant/subordinate rule.
        const sole = node.edges[1 - i];
        const gap = nonReflexGap(node, edge, sole);
        const inset = slantInset(edge.thickness, gap);

        // Dominant = more horizontal (|sin| is smaller). Tie-break on id.
        const myHoriz = Math.abs(Math.sin(angleAroundNode(node, edge)));
        const soleHoriz = Math.abs(Math.sin(angleAroundNode(node, sole)));
        const iAmDominant =
          myHoriz < soleHoriz - NETWORK_EPSILON ||
          (Math.abs(myHoriz - soleHoriz) < NETWORK_EPSILON && edge.id <= sole.id);

        if (iAmDominant) {
          // Extends past the corner on both sides — covers the full corner cell.
          leftA = -inset;
          rightA = -inset;
        } else {
          // Chevron tip: butts into the dominant wall's flat end face.
          leftA = +inset;
          rightA = +inset;
        }
      } else {
        // Degree ≥ 3: independent bisector for each CCW neighbour.
        // Reflex gap (> π) → no corner cell on that side → square cap.
        const ccwNext = node.edges[(i + 1) % N];
        const ccwPrev = node.edges[(i - 1 + N) % N];
        const gapNext = ccwGap(node, edge, ccwNext);
        const gapPrev = ccwGap(node, ccwPrev, edge);

        // Through-wall continuity: if one CCW neighbour is collinear (gap ≈ π),
        // apply the collinear inset to the other side too.  This keeps the
        // through-wall face flush at the junction with no visible notch.
        const COLLINEAR_TOL = NETWORK_EPSILON * 20;
        const isCollinearNext = Math.abs(gapNext - Math.PI) < COLLINEAR_TOL;
        const isCollinearPrev = Math.abs(gapPrev - Math.PI) < COLLINEAR_TOL;

        const insetNext =
          gapNext > Math.PI + NETWORK_EPSILON
            ? 0
            : isCollinearPrev && !isCollinearNext
              ? slantInset(edge.thickness, Math.PI)
              : slantInset(edge.thickness, gapNext);
        const insetPrev =
          gapPrev > Math.PI + NETWORK_EPSILON
            ? 0
            : isCollinearNext && !isCollinearPrev
              ? slantInset(edge.thickness, Math.PI)
              : slantInset(edge.thickness, gapPrev);

        // At the start end: LEFT (shape +Y) faces CCW-next, RIGHT faces
        // CCW-prev. At the end end the outward direction reverses so the
        // LEFT↔CCW mapping flips.
        leftA = isStart ? insetNext : insetPrev;
        rightA = isStart ? insetPrev : insetNext;
      }

      writeCutAtNode(edge, node, { leftA, rightA, b: 0 });
    }
  }
}

// ---------------------------------------------------------------------------
// Phase 3: emitEdgeMesh / emitNetworkMeshes — per-edge wall mesh emission
// ---------------------------------------------------------------------------

/**
 * Options controlling per-edge mesh emission. The same value is reused for
 * every edge in a network so the caller (Phase 4's `WallBuilder.setEngine` or
 * a test) only constructs it once per `emitNetworkMeshes` call.
 */
export interface EmitOptions {
  /** Floor / floorplan-level config (door dimensions, default heights, …). */
  config: JsonConfig;
  /** Optional viewer theme. Defaults to `'light'` colours when omitted. */
  theme?: ViewerTheme;
  /** Group that receives the wall meshes. */
  group: THREE.Group;
  /**
   * Optional separate group for door/window meshes. When omitted, connection
   * geometry is added to `group`, matching legacy behaviour.
   */
  connectionsGroup?: THREE.Group;
  /** Vertical offset applied to every emitted mesh (floor stack elevation). */
  elevation: number;
  /**
   * Optional per-mesh callback. Mirrors the legacy `onWallMesh` hook signature
   * but is called with the edge in lieu of the legacy `(wall, room, floor)`
   * triple — Phase 4's `WallBuilder` adapts this to the public hook.
   */
  onEdgeMesh?: (mesh: THREE.Mesh, edge: WallEdge) => void;
  /**
   * All rooms on the floor keyed by name. When present, `resolveConnectionHole`
   * uses `connection.toRoom` to look up the target room authoritatively, making
   * hole positions independent of how connections were routed to edges.
   * Populated automatically by `emitNetworkMeshes`; may be omitted when calling
   * `emitEdgeMesh` directly in tests (falls back to `edge.rooms` scan).
   */
  rooms?: Map<string, JsonRoom>;
}

/**
 * Internal: one connection hole resolved against an edge. Produced by
 * `resolveConnectionHole` so the brush construction and the mesh-emission
 * branches share the same dimension precedence and position math.
 */
interface ResolvedHole {
  /** Centerline-local X offset (relative to nodeA + startCut.a along the edge). */
  localX: number;
  /** Door / window width along the edge. */
  holeWidth: number;
  /** Door / window height along Y. */
  holeHeight: number;
  /** Y centre in WORLD space (already includes `elevation`). */
  worldY: number;
}

function pickDoorWidth(connection: JsonConnection, config: JsonConfig): number {
  if (connection.width !== undefined) return connection.width;
  if (config.door_size) return config.door_size[0];
  const single = config.door_width ?? DIMENSIONS.DOOR.WIDTH;
  return connection.doorType === 'double-door' ? single * 2 : single;
}

function pickDoorHeight(connection: JsonConnection, edge: WallEdge, config: JsonConfig): number {
  if (connection.fullHeight) return edge.height;
  if (connection.height !== undefined) return connection.height;
  if (config.door_size) return config.door_size[1];
  return config.door_height ?? DIMENSIONS.DOOR.HEIGHT;
}

/**
 * Map a `JsonConnection` to its centerline-local position and dimensions on a
 * given edge. Position math mirrors the recently-fixed legacy
 * `WallBuilder.createConnectionHole` exactly so the network path renders door
 * cutouts at the same world position as the legacy path — the parity test in
 * Phase 5 pins this.
 *
 * Returns `null` when the connection cannot be matched to a binding on this
 * edge or when the resolved offset falls outside the post-mitre centerline.
 */
function resolveConnectionHole(
  connection: JsonConnection,
  edge: WallEdge,
  length: number,
  elevation: number,
  config: JsonConfig,
  rooms?: Map<string, JsonRoom>,
): ResolvedHole | null {
  const sourceBinding = edge.rooms.find(
    (b) => b.room.name === connection.fromRoom && b.direction === connection.fromWall,
  );
  if (!sourceBinding) {
    console.warn(
      `[wall-network] emit: connection ${connection.fromRoom}.${connection.fromWall} → ` +
        `${connection.toRoom}.${connection.toWall} did not match any binding on edge ${edge.id}`,
    );
    return null;
  }

  const sourceRoom = sourceBinding.room;
  // Use conn.toRoom from the authoritative room registry when available; fall
  // back to whichever other room is bound to this edge (legacy/test path).
  const targetRoom =
    (rooms ? rooms.get(connection.toRoom) : undefined) ??
    edge.rooms.find((b) => b.room !== sourceRoom)?.room;

  const holeWidth = pickDoorWidth(connection, config);
  const holeHeight = pickDoorHeight(connection, edge, config);
  const worldY = elevation + holeHeight / 2;

  const sourceIsVertical = connection.fromWall === 'left' || connection.fromWall === 'right';
  const percentage = connection.position ?? 50;

  const sourceBounds: RoomBounds = {
    x: sourceRoom.x,
    y: sourceRoom.z,
    width: sourceRoom.width,
    height: sourceRoom.height,
  };
  const targetBounds: RoomBounds | null = targetRoom
    ? { x: targetRoom.x, y: targetRoom.z, width: targetRoom.width, height: targetRoom.height }
    : null;

  // Resolve hole position on the source room's wall, then project onto the
  // canonical edge axis to convert to centerline-local X. This re-uses the
  // overlap-aware percentage math from `floorplan-common` so partial-overlap
  // doorways land in the same world location as the legacy renderer.
  let worldHoleX: number;
  let worldHoleZ: number;
  if (sourceIsVertical) {
    worldHoleZ = calculatePositionWithFallback(sourceBounds, targetBounds, true, percentage);
    worldHoleX = connection.fromWall === 'left' ? sourceRoom.x : sourceRoom.x + sourceRoom.width;
  } else {
    worldHoleX = calculatePositionWithFallback(sourceBounds, targetBounds, false, percentage);
    worldHoleZ = connection.fromWall === 'top' ? sourceRoom.z : sourceRoom.z + sourceRoom.height;
  }

  const dx = edge.nodeB.pos.x - edge.nodeA.pos.x;
  const dz = edge.nodeB.pos.y - edge.nodeA.pos.y;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < NETWORK_EPSILON * NETWORK_EPSILON) return null;

  const ux = worldHoleX - edge.nodeA.pos.x;
  const uz = worldHoleZ - edge.nodeA.pos.y;
  const projection = (ux * dx + uz * dz) / Math.sqrt(lenSq);
  const localX = projection;

  if (localX < -NETWORK_EPSILON || localX > length + NETWORK_EPSILON) {
    console.warn(
      `[wall-network] emit: connection ${connection.fromRoom}.${connection.fromWall} → ` +
        `${connection.toRoom}.${connection.toWall} resolves to localX=${localX.toFixed(4)} ` +
        `outside edge [0, ${length.toFixed(4)}] on edge ${edge.id} — skipping`,
    );
    return null;
  }

  return { localX, holeWidth, holeHeight, worldY };
}

/**
 * Resolve the explicit-door/window cutout from `edge.explicitType`. Mirrors
 * the precedence in legacy `WallBuilder.createExplicitHole`.
 */
function resolveExplicitHole(
  edge: WallEdge,
  length: number,
  elevation: number,
  config: JsonConfig,
): ResolvedHole | null {
  const explicit = edge.explicitType;
  if (!explicit) return null;

  const isWindow = explicit.kind === 'window';
  const defaultWidth = isWindow
    ? (config.window_size?.[0] ?? config.window_width ?? DIMENSIONS.WINDOW.WIDTH)
    : (config.door_size?.[0] ?? config.door_width ?? DIMENSIONS.DOOR.WIDTH);
  const defaultHeight = isWindow
    ? (config.window_size?.[1] ?? config.window_height ?? DIMENSIONS.WINDOW.HEIGHT)
    : (config.door_size?.[1] ?? config.door_height ?? DIMENSIONS.DOOR.HEIGHT);
  const sillHeight = config.window_sill ?? DIMENSIONS.WINDOW.SILL_HEIGHT;

  const holeWidth = explicit.width ?? defaultWidth;
  const holeHeight = explicit.height ?? defaultHeight;
  const worldY = elevation + (isWindow ? sillHeight + holeHeight / 2 : holeHeight / 2);

  // Default to centred. Per the explicitType field doc, undefined isPercentage
  // is treated as percentage to match the historical DSL convention.
  let ratio = 0.5;
  if (explicit.position !== undefined) {
    if (explicit.isPercentage === false) {
      ratio = explicit.position / Math.max(length, NETWORK_EPSILON);
    } else {
      ratio = explicit.position / 100;
    }
  }
  const localX = ratio * length;

  return { localX, holeWidth, holeHeight, worldY };
}

/**
 * Build a hole CSG brush positioned in WORLD space matching the wall brush's
 * world frame. The wall brush is centred at `(midX, midY, midZ)` and rotated
 * around Y by `rotationY` so its local +X axis aligns with the canonical edge
 * direction; the hole brush mirrors that orientation so subtraction works in
 * a consistent world frame.
 */
function buildHoleBrush(
  hole: ResolvedHole,
  edge: WallEdge,
  dirNormX: number,
  dirNormZ: number,
  rotationY: number,
  Brush: ReturnType<typeof getCSG>['Brush'],
): CSGBrush {
  // Box geometry: X = along edge, Y = vertical, Z = across edge.
  // Z dimension = 2× thickness so the hole punches through both faces with
  // margin (matches legacy createConnectionHole / createExplicitHole).
  const holeGeom = new THREE.BoxGeometry(hole.holeWidth, hole.holeHeight, edge.thickness * 2);

  // localX is now projection from nodeA along the edge axis.
  const along = hole.localX;
  const worldX = edge.nodeA.pos.x + dirNormX * along;
  const worldZ = edge.nodeA.pos.y + dirNormZ * along;

  const holeBrush = new Brush(holeGeom);
  holeBrush.rotation.y = rotationY;
  holeBrush.position.set(worldX, hole.worldY, worldZ);
  holeBrush.updateMatrixWorld();
  return holeBrush;
}

/**
 * Construct a thin glass plane for window cutouts. Sized slightly smaller than
 * the cutout so it sits cleanly inside the opening. Returned in world space
 * (rotated to match the edge direction); caller is responsible for adding it
 * to the connection group.
 */
function buildWindowGlass(
  hole: ResolvedHole,
  edge: WallEdge,
  dirNormX: number,
  dirNormZ: number,
  rotationY: number,
  themeWindowColor: number,
): THREE.Mesh {
  const inset = 0.01;
  const glassGeom = new THREE.BoxGeometry(
    Math.max(NETWORK_EPSILON, hole.holeWidth - inset),
    Math.max(NETWORK_EPSILON, hole.holeHeight - inset),
    DIMENSIONS.WINDOW.GLASS_THICKNESS,
  );
  const glassMat = new THREE.MeshStandardMaterial({
    color: themeWindowColor,
    transparent: true,
    opacity: 0.3,
    roughness: 0.0,
    metalness: 0.9,
  });

  // localX is now projection from nodeA along the edge axis.
  const along = hole.localX;
  const worldX = edge.nodeA.pos.x + dirNormX * along;
  const worldZ = edge.nodeA.pos.y + dirNormZ * along;

  const mesh = new THREE.Mesh(glassGeom, glassMat);
  mesh.rotation.y = rotationY;
  mesh.position.set(worldX, hole.worldY, worldZ);
  mesh.name = `window_glass_${edge.id}`;
  return mesh;
}

/**
 * Emit one wall mesh for `edge`, including any door/window CSG cutouts and
 * connection meshes (door panels / window glass). Returns the wall mesh, or
 * `null` if the edge is degenerate (zero-length after mitre, or fully
 * consumed by the per-end cuts).
 *
 * Local frame inside the mesh:
 *   - local X: along edge, range [-L/2, +L/2] where L = full edge length
 *   - local Y: vertical
 *   - local Z: across edge, with +Z on the LEFT side (matching the side
 *     convention in this file's header)
 *
 * Geometry construction (option B from the plan): the 2D polygon is built
 * in the X/Y plane (NOT XZ), extruded along +Z, then rotated so the extrusion
 * axis becomes world Y. Slanted mitre end-caps (Phase 8) produce a chevron
 * apex at degree-3+ nodes and a diagonal slant face at L-corners, tiling
 * the corner cell without gaps.
 */
export function emitEdgeMesh(edge: WallEdge, opts: EmitOptions): THREE.Mesh | null {
  // ---- Step 1: world geometry & guards
  const dx = edge.nodeB.pos.x - edge.nodeA.pos.x;
  const dz = edge.nodeB.pos.y - edge.nodeA.pos.y;
  const length = Math.hypot(dx, dz);
  if (length < NETWORK_EPSILON) return null;

  // Guard: the insets must leave a non-degenerate polygon (narrowest axis
  // still has positive body length after accounting for per-side cuts).
  const maxStartInset = Math.max(edge.startCut.leftA, edge.startCut.rightA);
  const maxEndInset = Math.max(edge.endCut.leftA, edge.endCut.rightA);
  if (maxStartInset + maxEndInset >= length - NETWORK_EPSILON) return null;

  if (Math.abs(edge.startCut.b) > NETWORK_EPSILON || Math.abs(edge.endCut.b) > NETWORK_EPSILON) {
    console.warn(
      `[wall-network] emit: asymmetric mitre b-offset is not yet supported on edge ${edge.id} ` +
        `(startCut.b=${edge.startCut.b}, endCut.b=${edge.endCut.b}); rendering as square truncation.`,
    );
  }

  // ---- Step 2: build the 2D shape in the XY plane (option B)
  // Shape coords: X along edge (origin at edge midpoint), Y across edge.
  //   X = −halfL → nodeA, X = +halfL → nodeB.
  //   Y = +halfT → LEFT side (shape +Y = world LEFT of canonical direction)
  //   Y = −halfT → RIGHT side
  const t = edge.thickness;
  const halfT = t / 2;
  const halfL = length / 2;

  // Per-side per-end X positions (positive leftA/rightA = inward from node;
  // negative = extends past the node, which is correct for degree-2 L-corners).
  const startLeftX = -halfL + edge.startCut.leftA;
  const startRightX = -halfL + edge.startCut.rightA;
  const endLeftX = +halfL - edge.endCut.leftA;
  const endRightX = +halfL - edge.endCut.rightA;

  // Emit a chevron apex at an end only when BOTH sides have positive insets
  // (degree-3+ interior nodes: T-junction branch end, 4-way arm end).
  // L-corner ends (one side negative) produce a straight slant face without
  // an apex.
  const hasStartApex =
    edge.startCut.leftA > NETWORK_EPSILON && edge.startCut.rightA > NETWORK_EPSILON;
  const hasEndApex = edge.endCut.leftA > NETWORK_EPSILON && edge.endCut.rightA > NETWORK_EPSILON;

  const shape = new THREE.Shape();
  // Walk CCW from nodeA-end, RIGHT face first.
  shape.moveTo(startRightX, -halfT);
  shape.lineTo(endRightX, -halfT);
  if (hasEndApex) shape.lineTo(+halfL, 0); // apex at nodeB centerline
  shape.lineTo(endLeftX, +halfT);
  shape.lineTo(startLeftX, +halfT);
  if (hasStartApex) shape.lineTo(-halfL, 0); // apex at nodeA centerline
  shape.lineTo(startRightX, -halfT);

  // ---- Step 3: vertical Y span (matches createWallSegmentGeometry)
  const elevation = opts.elevation;
  const bottomY = elevation - DIMENSIONS.WALL.EMBED;
  const topY = elevation + edge.height - DIMENSIONS.WALL.CEILING_GAP;
  const extrudeDepth = topY - bottomY;
  if (extrudeDepth < NETWORK_EPSILON) return null;
  const midY = (bottomY + topY) / 2;

  // ---- Step 4: extrude + orient so local +X is along the edge, +Y is up,
  //                 +Z is the LEFT side of the canonical direction.
  const extrudeGeom = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeDepth,
    bevelEnabled: false,
    steps: 1,
  });
  // Move the extrusion so its +Z (= bottom of the future vertical wall) sits
  // at -extrudeDepth/2 → after rotateX(-PI/2) the bottom face will be at
  // local -Y = -extrudeDepth/2, top at +Y = +extrudeDepth/2.
  extrudeGeom.translate(0, 0, -extrudeDepth / 2);
  // rotateX(-PI/2): (x, y, z) → (x, z, -y). So:
  //   - local +Z (bottom) goes to local -Y → after the translate above the
  //     bottom face sits at local Y = -extrudeDepth/2.
  //   - shape's +Y (which was at +halfT in 2D) becomes local -Z → so shape +Y
  //     is the RIGHT side, shape -Y is the LEFT side, in the post-rotation
  //     local frame.
  // The classifier in `csg-utils.ts` treats local +Z as LEFT (positive
  // perpEdge dot), and we constructed the shape so shape -Y becomes local +Z
  // — i.e. left-side vertices are at shape -Y. ✓
  extrudeGeom.rotateX(-Math.PI / 2);

  // ---- Step 5: world-space placement
  const dirNormX = dx / length;
  const dirNormZ = dz / length;
  // After rotation, local +X under rotateY(theta) maps to world
  //   (cos θ, 0, -sin θ); set θ = -atan2(dirNormZ, dirNormX) so this becomes
  //   (dirNormX, 0, dirNormZ). See the side-convention worked example.
  const rotationY = -Math.atan2(dirNormZ, dirNormX);

  // Edge midpoint in world: nodeA + dEdge·halfL (origin of local shape frame).
  const along = halfL;
  const midX = edge.nodeA.pos.x + dirNormX * along;
  const midZ = edge.nodeA.pos.y + dirNormZ * along;

  // ---- Step 6: materials (4-slot per-edge layout)
  const leftBinding = edge.rooms.find((b) => b.side === 'left');
  const rightBinding = edge.rooms.find((b) => b.side === 'right');
  const materials = MaterialFactory.createPerEdgeWallMaterials(
    leftBinding?.style,
    rightBinding?.style,
    opts.theme,
  );

  // ---- Step 7: collect holes (explicit + connections)
  const csgEnabled = isCsgAvailable();
  const explicitHole = resolveExplicitHole(edge, length, elevation, opts.config);
  const connectionHoles: Array<{ hole: ResolvedHole; connection: JsonConnection }> = [];
  for (const connection of edge.connections) {
    const resolved = resolveConnectionHole(
      connection,
      edge,
      length,
      elevation,
      opts.config,
      opts.rooms,
    );
    if (resolved) connectionHoles.push({ hole: resolved, connection });
  }

  // ---- Step 8: build the wall mesh — CSG when available, plain mesh otherwise
  let wallMesh: THREE.Mesh;
  if (csgEnabled && (explicitHole !== null || connectionHoles.length > 0)) {
    const { Brush, SUBTRACTION, Evaluator } = getCSG();
    const evaluator = new Evaluator();

    const wallBrush = new Brush(extrudeGeom, materials);
    wallBrush.rotation.y = rotationY;
    wallBrush.position.set(midX, midY, midZ);
    wallBrush.updateMatrixWorld();

    let resultBrush: CSGBrush = wallBrush;
    if (explicitHole) {
      const holeBrush = buildHoleBrush(explicitHole, edge, dirNormX, dirNormZ, rotationY, Brush);
      resultBrush = evaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
    }
    for (const { hole } of connectionHoles) {
      const holeBrush = buildHoleBrush(hole, edge, dirNormX, dirNormZ, rotationY, Brush);
      resultBrush = evaluator.evaluate(resultBrush, holeBrush, SUBTRACTION);
    }

    // After CSG, geometry vertices are in WORLD space and the brush's matrix
    // is identity. Classify normals using the world-space canonical edge dir.
    resultBrush.material = materials;
    reassignNormalsToEdgeMaterials(resultBrush.geometry, new THREE.Vector3(dirNormX, 0, dirNormZ));

    wallMesh = resultBrush;
  } else {
    // No CSG (or no holes to cut): keep the local-space geometry and place
    // the mesh by transform. Normals are still in local space, so classify
    // using the local +X edge direction.
    wallMesh = new THREE.Mesh(extrudeGeom, materials);
    wallMesh.position.set(midX, midY, midZ);
    wallMesh.rotation.y = rotationY;
    reassignNormalsToEdgeMaterials(wallMesh.geometry, new THREE.Vector3(1, 0, 0));
  }

  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  wallMesh.name = `wall_edge_${edge.id}`;

  // ---- Step 9: connection meshes (door panels, window glass)
  const connDest = opts.connectionsGroup ?? opts.group;
  const themeColors = getThemeColors(opts.theme ?? 'light');

  // Anchor door swing on the binding matched by `connection.fromRoom` /
  // `connection.fromWall` so the source room is the same one the legacy
  // renderer uses, regardless of edge.rooms[] insertion order. (Earlier
  // versions used `edge.rooms[0]` as a "canonical" anchor; that produced a
  // visible swing-direction divergence when a connection was declared
  // `B → A` but room A was added to the network first.)
  for (const { connection } of connectionHoles) {
    if (connection.doorType === 'opening') continue; // no panel

    const sourceBinding = edge.rooms.find(
      (b) => b.room.name === connection.fromRoom && b.direction === connection.fromWall,
    );
    if (!sourceBinding) continue; // already warned in resolveConnectionHole

    const sourceRoom = sourceBinding.room;
    const targetRoom = edge.rooms.find((b) => b.room !== sourceRoom)?.room;
    const reconstructedWall: JsonWall = {
      direction: sourceBinding.direction,
      type: connection.doorType === 'window' ? 'window' : 'solid',
      position: connection.position,
      isPercentage: connection.isPercentage,
      width: connection.width,
      height: connection.height,
    };
    const connMesh = generateConnection(
      connection,
      sourceRoom,
      targetRoom,
      reconstructedWall,
      edge.thickness,
      themeColors,
    );
    if (connMesh) {
      connMesh.position.y += elevation;
      connDest.add(connMesh);
    }
  }

  // Explicit-window glass — emit even without CSG so the opening has a pane.
  if (edge.explicitType?.kind === 'window' && explicitHole) {
    connDest.add(
      buildWindowGlass(explicitHole, edge, dirNormX, dirNormZ, rotationY, themeColors.WINDOW),
    );
  }

  return wallMesh;
}

/**
 * Iterate every edge in `net` and emit its wall mesh into `opts.group`. Fires
 * the optional `onEdgeMesh` callback for each emitted mesh so the Phase 4
 * `WallBuilder` can plumb meshes into the registry.
 *
 * Edges that `emitEdgeMesh` returns `null` for (degenerate or fully consumed
 * by mitres — typically a defensive case that should not arise in well-formed
 * floorplans) are silently skipped.
 */
export function emitNetworkMeshes(net: WallNetwork, opts: EmitOptions): void {
  // Inject the floor's room registry so resolveConnectionHole can look up the
  // target room by name (authoritative) rather than by edge binding (fragile
  // when the routing phase mis-routes a connection to the wrong sub-edge).
  const optsWithRooms: EmitOptions = opts.rooms ? opts : { ...opts, rooms: net.rooms };
  for (const edge of net.edges.values()) {
    const mesh = emitEdgeMesh(edge, optsWithRooms);
    if (!mesh) continue;
    opts.group.add(mesh);
    opts.onEdgeMesh?.(mesh, edge);
  }
}
