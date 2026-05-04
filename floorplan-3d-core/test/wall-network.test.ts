/**
 * Tests for the per-edge wall network builder (Phases 1 and 2 of the
 * wall-network rebuild — see `.cursor/plans/wall_network_rebuild_2e4b6f09.plan.md`).
 *
 * Covers construction (`buildWallNetwork`), connection routing
 * (`routeConnectionsToEdges`), T-junction node splitting
 * (`splitTJunctionEdges`), and corner mitre geometry (`mitreNodes`). Mesh
 * emission and CSG holes are out of scope here and are added in Phase 3.
 */

import { describe, expect, test } from 'vitest';
import type { MaterialStyle } from '../src/materials.js';
import type { JsonConfig, JsonConnection, JsonFloor, JsonRoom, JsonWall } from '../src/types.js';
import {
  angleAroundNode,
  buildWallNetwork,
  edgeIdOf,
  mitreNodes,
  NETWORK_EPSILON,
  nodeIdOf,
  routeConnectionsToEdges,
  splitTJunctionEdges,
  type WallEdge,
  type WallNode,
} from '../src/wall-network.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

type WallTypeMap = Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;

/**
 * Build a `JsonRoom` with all four walls present. `wallTypes` lets a test
 * override individual wall types (e.g. `{ right: 'open' }`).
 */
function makeRoom(
  name: string,
  x: number,
  z: number,
  width: number,
  height: number,
  wallTypes: WallTypeMap = {},
): JsonRoom {
  const directions: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
  const walls: JsonWall[] = directions.map((dir) => ({
    direction: dir,
    type: wallTypes[dir] ?? 'solid',
  }));
  return { name, x, z, width, height, walls };
}

function makeFloor(rooms: JsonRoom[]): JsonFloor {
  return { id: 'floor1', index: 0, rooms };
}

const noStyle = (): MaterialStyle | undefined => undefined;
const defaultConfig: JsonConfig = { wall_thickness: 0.2, default_height: 3 };

// ---------------------------------------------------------------------------
// Construction tests
// ---------------------------------------------------------------------------

describe('buildWallNetwork — single 5×5 room', () => {
  test('produces 4 nodes and 4 edges, each with one binding and no connections', () => {
    const floor = makeFloor([makeRoom('R', 0, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);

    expect(net.nodes.size).toBe(4);
    expect(net.edges.size).toBe(4);

    expect(net.nodes.has(nodeIdOf(0, 0))).toBe(true);
    expect(net.nodes.has(nodeIdOf(5, 0))).toBe(true);
    expect(net.nodes.has(nodeIdOf(0, 5))).toBe(true);
    expect(net.nodes.has(nodeIdOf(5, 5))).toBe(true);

    for (const edge of net.edges.values()) {
      expect(edge.rooms).toHaveLength(1);
      expect(edge.rooms[0].room.name).toBe('R');
      expect(edge.connections).toHaveLength(0);
    }

    expect(net.edges.has(edgeIdOf(nodeIdOf(0, 0), nodeIdOf(5, 0)))).toBe(true); // top
    expect(net.edges.has(edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5)))).toBe(true); // right
    expect(net.edges.has(edgeIdOf(nodeIdOf(0, 5), nodeIdOf(5, 5)))).toBe(true); // bottom
    expect(net.edges.has(edgeIdOf(nodeIdOf(0, 0), nodeIdOf(0, 5)))).toBe(true); // left
  });

  test('every node has its incident edges registered', () => {
    const floor = makeFloor([makeRoom('R', 0, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);

    for (const node of net.nodes.values()) {
      // Each corner of a single isolated room has degree 2.
      expect(node.edges).toHaveLength(2);
      for (const edge of node.edges) {
        expect(edge.nodeA === node || edge.nodeB === node).toBe(true);
      }
    }
  });

  test('default thickness and height come from config', () => {
    const floor = makeFloor([makeRoom('R', 0, 0, 5, 5)]);
    const net = buildWallNetwork(floor, { wall_thickness: 0.42, default_height: 2.7 }, noStyle);

    for (const edge of net.edges.values()) {
      expect(edge.thickness).toBeCloseTo(0.42, 5);
      expect(edge.height).toBeCloseTo(2.7, 5);
    }
  });
});

describe('buildWallNetwork — two 5×5 rooms sharing a wall', () => {
  // Room A at (0,0); Room B at (5,0). A.right and B.left coincide.
  const floor = makeFloor([makeRoom('A', 0, 0, 5, 5), makeRoom('B', 5, 0, 5, 5)]);

  test('has 6 nodes and 7 edges', () => {
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    expect(net.nodes.size).toBe(6);
    expect(net.edges.size).toBe(7);
  });

  test('the shared edge has 2 bindings on different sides', () => {
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    const sharedId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5));
    const shared = net.edges.get(sharedId);
    expect(shared).toBeDefined();
    expect(shared!.rooms).toHaveLength(2);

    const sides = new Set(shared!.rooms.map((b) => b.side));
    expect(sides.size).toBe(2);
    expect(sides.has('left')).toBe(true);
    expect(sides.has('right')).toBe(true);

    const roomNames = new Set(shared!.rooms.map((b) => b.room.name));
    expect(roomNames).toEqual(new Set(['A', 'B']));
  });

  test('non-shared edges each have exactly 1 binding', () => {
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    const sharedId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5));

    let sharedCount = 0;
    let exteriorCount = 0;
    for (const edge of net.edges.values()) {
      if (edge.id === sharedId) {
        sharedCount++;
        expect(edge.rooms).toHaveLength(2);
      } else {
        exteriorCount++;
        expect(edge.rooms).toHaveLength(1);
      }
    }
    expect(sharedCount).toBe(1);
    expect(exteriorCount).toBe(6);
  });

  test('byRoomDirection routes both sides to the same shared edge', () => {
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    const aRight = net.byRoomDirection.get('A|right');
    const bLeft = net.byRoomDirection.get('B|left');

    expect(aRight).toBeDefined();
    expect(bLeft).toBeDefined();
    expect(aRight).toHaveLength(1);
    expect(bLeft).toHaveLength(1);
    expect(aRight![0]).toBe(bLeft![0]);
  });
});

describe('buildWallNetwork — 2×2 grid of 5×5 rooms', () => {
  // TL TR
  // BL BR
  const floor = makeFloor([
    makeRoom('TL', 0, 0, 5, 5),
    makeRoom('TR', 5, 0, 5, 5),
    makeRoom('BL', 0, 5, 5, 5),
    makeRoom('BR', 5, 5, 5, 5),
  ]);

  test('has 9 nodes and 12 edges', () => {
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    expect(net.nodes.size).toBe(9);
    expect(net.edges.size).toBe(12);
  });

  test('exactly 4 edges have 2 bindings (interior shared walls)', () => {
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    const sharedEdges = [...net.edges.values()].filter((e) => e.rooms.length === 2);
    const exteriorEdges = [...net.edges.values()].filter((e) => e.rooms.length === 1);
    expect(sharedEdges).toHaveLength(4);
    expect(exteriorEdges).toHaveLength(8);
  });

  test('the central node (5,5) is shared by 4 rooms via 4 incident edges', () => {
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    const center = net.nodes.get(nodeIdOf(5, 5));
    expect(center).toBeDefined();
    expect(center!.edges).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// Open-wall handling
// ---------------------------------------------------------------------------

describe('buildWallNetwork — open walls are skipped', () => {
  test('a shared wall marked open on one side still produces an edge with 1 binding', () => {
    // A's right wall is open; B's left wall is solid.
    const floor = makeFloor([
      makeRoom('A', 0, 0, 5, 5, { right: 'open' }),
      makeRoom('B', 5, 0, 5, 5),
    ]);

    const net = buildWallNetwork(floor, defaultConfig, noStyle);

    const sharedId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5));
    const shared = net.edges.get(sharedId);
    expect(shared).toBeDefined();
    expect(shared!.rooms).toHaveLength(1);
    expect(shared!.rooms[0].room.name).toBe('B');
    expect(shared!.rooms[0].direction).toBe('left');

    // A|right should NOT be in the routing index because the wall was skipped.
    expect(net.byRoomDirection.has('A|right')).toBe(false);
    expect(net.byRoomDirection.has('B|left')).toBe(true);
  });

  test('a both-sides-open shared wall produces no edge at all', () => {
    const floor = makeFloor([
      makeRoom('A', 0, 0, 5, 5, { right: 'open' }),
      makeRoom('B', 5, 0, 5, 5, { left: 'open' }),
    ]);

    const net = buildWallNetwork(floor, defaultConfig, noStyle);

    const sharedId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5));
    expect(net.edges.has(sharedId)).toBe(false);
    // 6 walls remain (3 per room).
    expect(net.edges.size).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// routeConnectionsToEdges
// ---------------------------------------------------------------------------

describe('routeConnectionsToEdges', () => {
  test('routes a single connection onto the shared edge only', () => {
    const floor = makeFloor([makeRoom('A', 0, 0, 5, 5), makeRoom('B', 5, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);

    const conn: JsonConnection = {
      fromRoom: 'A',
      fromWall: 'right',
      toRoom: 'B',
      toWall: 'left',
      doorType: 'door',
      position: 50,
      isPercentage: true,
    };
    routeConnectionsToEdges(net, [conn]);

    const sharedId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5));
    const shared = net.edges.get(sharedId);

    expect(shared!.connections).toHaveLength(1);
    expect(shared!.connections[0]).toBe(conn);

    for (const edge of net.edges.values()) {
      if (edge.id === sharedId) continue;
      expect(edge.connections).toHaveLength(0);
    }
  });

  test('connections to non-existent room/direction are skipped with a warning', () => {
    const floor = makeFloor([makeRoom('A', 0, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);

    const conn: JsonConnection = {
      fromRoom: 'Nonexistent',
      fromWall: 'right',
      toRoom: 'A',
      toWall: 'left',
      doorType: 'door',
    };

    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (msg: string) => warnings.push(msg);
    try {
      routeConnectionsToEdges(net, [conn]);
    } finally {
      console.warn = originalWarn;
    }

    expect(warnings).toHaveLength(1);
    for (const edge of net.edges.values()) {
      expect(edge.connections).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// splitTJunctionEdges
// ---------------------------------------------------------------------------

describe('splitTJunctionEdges', () => {
  test('splits a 10-long edge at a midpoint T-junction node', () => {
    // Room A is 10 wide, 5 tall, sitting above z=0.
    // Its bottom wall runs from (0,0) to (10,0).
    //
    // Room B is 5×5, sitting below z=0 starting at x=5.
    // Its top wall runs from (5,0) to (10,0); its left wall runs from
    // (5,0) to (5,5). The top-left corner (5,0) lands mid-way along
    // Room A's bottom wall — a classic T-junction.
    const floor = makeFloor([makeRoom('A', 0, -5, 10, 5), makeRoom('B', 5, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);

    // Sanity check pre-split: 7 unique nodes, 8 edges, A.bottom is one
    // single 10-long edge.
    expect(net.nodes.size).toBe(7);
    expect(net.edges.size).toBe(8);
    const aBottomId = edgeIdOf(nodeIdOf(0, 0), nodeIdOf(10, 0));
    expect(net.edges.has(aBottomId)).toBe(true);

    splitTJunctionEdges(net);

    // The original 10-long edge is gone; two 5-long halves take its place.
    expect(net.edges.has(aBottomId)).toBe(false);
    const halfLeftId = edgeIdOf(nodeIdOf(0, 0), nodeIdOf(5, 0));
    const halfRightId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(10, 0));
    expect(net.edges.has(halfLeftId)).toBe(true);
    expect(net.edges.has(halfRightId)).toBe(true);

    // The right half coincides with B.top — they merge into one edge with
    // 2 bindings (A's bottom + B's top), so total edge count stays at 8.
    const halfRight = net.edges.get(halfRightId)!;
    expect(halfRight.rooms).toHaveLength(2);
    const halfLeft = net.edges.get(halfLeftId)!;
    expect(halfLeft.rooms).toHaveLength(1);
    expect(halfLeft.rooms[0].room.name).toBe('A');

    // The junction node (5,0) has degree 3: half-left, half-right (merged
    // with B.top), and B.left.
    const junction = net.nodes.get(nodeIdOf(5, 0));
    expect(junction).toBeDefined();
    expect(junction!.edges).toHaveLength(3);

    // byRoomDirection['A|bottom'] now points at both halves.
    const aBottomBucket = net.byRoomDirection.get('A|bottom');
    expect(aBottomBucket).toBeDefined();
    expect(aBottomBucket).toHaveLength(2);
    expect(aBottomBucket!.includes(halfLeft)).toBe(true);
    expect(aBottomBucket!.includes(halfRight)).toBe(true);
  });

  test('is idempotent: a second pass over an already-split network is a no-op', () => {
    const floor = makeFloor([makeRoom('A', 0, -5, 10, 5), makeRoom('B', 5, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    splitTJunctionEdges(net);
    const edgeCountAfterFirst = net.edges.size;
    const edgeIdsAfterFirst = new Set(net.edges.keys());

    splitTJunctionEdges(net);
    expect(net.edges.size).toBe(edgeCountAfterFirst);
    expect(new Set(net.edges.keys())).toEqual(edgeIdsAfterFirst);
  });
});

// ---------------------------------------------------------------------------
// mitreNodes — Phase 2 corner cuts
// ---------------------------------------------------------------------------

/**
 * Read the cut at the end of `edge` that touches `node`. Mirrors the
 * private `writeCutAtNode` helper in wall-network.ts so test assertions
 * don't have to duplicate the nodeA/nodeB tie-breaking logic.
 */
function cutAtNode(edge: WallEdge, node: WallNode): { leftA: number; rightA: number; b: number } {
  return edge.nodeA === node ? edge.startCut : edge.endCut;
}

describe('mitreNodes — 90° corner (single isolated room)', () => {
  // wall_thickness 0.2 ⇒ expected inset for a 90° cut is t/2 = 0.1.
  const buildSingleRoom = () => {
    const floor = makeFloor([makeRoom('R', 0, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    mitreNodes(net);
    return net;
  };

  test('both edges meeting at a corner are cut by ≈t/2 on both sides (same sign)', () => {
    const net = buildSingleRoom();
    const corner = net.nodes.get(nodeIdOf(0, 0))!;
    expect(corner.edges).toHaveLength(2);
    const t = defaultConfig.wall_thickness!;
    for (const edge of corner.edges) {
      const cut = cutAtNode(edge, corner);
      // Dominant wall: both sides ≈ −t/2 (extends past node).
      // Subordinate wall: both sides ≈ +t/2 (chevron, insets from node).
      // Either way |leftA| ≈ |rightA| ≈ t/2, and same sign.
      expect(Math.abs(cut.leftA)).toBeCloseTo(t / 2, 3);
      expect(Math.abs(cut.rightA)).toBeCloseTo(t / 2, 3);
      expect(cut.leftA * cut.rightA).toBeGreaterThan(0); // same sign
      expect(cut.b).toBeCloseTo(0, 5);
    }
  });

  test('every edge has |leftA| = |rightA| = t/2 at both ends and b = 0 throughout', () => {
    const net = buildSingleRoom();
    const t = defaultConfig.wall_thickness!;
    for (const edge of net.edges.values()) {
      expect(Math.abs(edge.startCut.leftA)).toBeCloseTo(t / 2, 3);
      expect(Math.abs(edge.startCut.rightA)).toBeCloseTo(t / 2, 3);
      expect(Math.abs(edge.endCut.leftA)).toBeCloseTo(t / 2, 3);
      expect(Math.abs(edge.endCut.rightA)).toBeCloseTo(t / 2, 3);
      expect(Math.abs(edge.startCut.b)).toBeLessThan(NETWORK_EPSILON);
      expect(Math.abs(edge.endCut.b)).toBeLessThan(NETWORK_EPSILON);
    }
  });
});

describe('mitreNodes — 90° T-junction', () => {
  // Same 10×5 + 5×5 layout as the splitTJunctionEdges tests above.
  // After build → split → mitre, the junction at (5, 0) has degree 3:
  //   - half-left  (0,0)→(5,0)   ← A's bottom, west of junction
  //   - half-right (5,0)→(10,0)  ← A's bottom + B's top, east of junction
  //   - branch     (5,0)→(5,5)   ← B's left wall
  const buildTJunction = () => {
    const floor = makeFloor([makeRoom('A', 0, -5, 10, 5), makeRoom('B', 5, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    splitTJunctionEdges(net);
    mitreNodes(net);
    return net;
  };

  test('the junction node has degree 3', () => {
    const net = buildTJunction();
    const junction = net.nodes.get(nodeIdOf(5, 0))!;
    expect(junction.edges).toHaveLength(3);
  });

  test('the two through-wall halves both extend past the junction on both sides (≈ −EMBED)', () => {
    const net = buildTJunction();
    const junction = net.nodes.get(nodeIdOf(5, 0))!;
    const t = defaultConfig.wall_thickness!;

    const halfLeft = net.edges.get(edgeIdOf(nodeIdOf(0, 0), nodeIdOf(5, 0)))!;
    const halfRight = net.edges.get(edgeIdOf(nodeIdOf(5, 0), nodeIdOf(10, 0)))!;

    for (const edge of [halfLeft, halfRight]) {
      const cut = cutAtNode(edge, junction);
      // Through-wall continuity: both sides ≈ −EMBED (extends, near-zero inset).
      // This keeps the through-wall face flush at the junction — no visible notch.
      expect(Math.abs(cut.leftA)).toBeLessThan(t / 10);
      expect(Math.abs(cut.rightA)).toBeLessThan(t / 10);
    }
  });

  test('the through-wall halves have |leftA| ≈ |rightA| ≈ t/2 at their outer nodes', () => {
    const net = buildTJunction();
    const outerLeft = net.nodes.get(nodeIdOf(0, 0))!;
    const outerRight = net.nodes.get(nodeIdOf(10, 0))!;
    const t = defaultConfig.wall_thickness!;

    const halfLeft = net.edges.get(edgeIdOf(nodeIdOf(0, 0), nodeIdOf(5, 0)))!;
    const halfRight = net.edges.get(edgeIdOf(nodeIdOf(5, 0), nodeIdOf(10, 0)))!;

    // outerLeft (0,0) is an L-corner (degree 2): half-left is horizontal
    // (dominant), so both signs are the same (both negative, extends past node).
    const cutL = cutAtNode(halfLeft, outerLeft);
    expect(Math.abs(cutL.leftA)).toBeCloseTo(t / 2, 2);
    expect(Math.abs(cutL.rightA)).toBeCloseTo(t / 2, 2);
    expect(cutL.leftA * cutL.rightA).toBeGreaterThan(0); // same sign = dominant

    // outerRight (10,0) is a T-junction (degree 3: halfRight + two side walls):
    // both leftA and rightA are ≈ t/2 (positive, chevron-like).
    const cutR = cutAtNode(halfRight, outerRight);
    expect(Math.abs(cutR.leftA)).toBeCloseTo(t / 2, 2);
    expect(Math.abs(cutR.rightA)).toBeCloseTo(t / 2, 2);
  });

  test('the branch wall has leftA ≈ rightA ≈ t/2 at the junction end (chevron)', () => {
    const net = buildTJunction();
    const junction = net.nodes.get(nodeIdOf(5, 0))!;
    const t = defaultConfig.wall_thickness!;
    const branch = net.edges.get(edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5)))!;
    const cut = cutAtNode(branch, junction);
    expect(cut.leftA).toBeCloseTo(t / 2, 2);
    expect(cut.rightA).toBeCloseTo(t / 2, 2);
  });
});

describe('mitreNodes — 2×2 grid (4-way crossing at the centre)', () => {
  // Same layout as the buildWallNetwork 2×2 grid block above; the central
  // node at (5,5) has 4 incident edges all meeting at 90°.
  const buildGrid = () => {
    const floor = makeFloor([
      makeRoom('TL', 0, 0, 5, 5),
      makeRoom('TR', 5, 0, 5, 5),
      makeRoom('BL', 0, 5, 5, 5),
      makeRoom('BR', 5, 5, 5, 5),
    ]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    mitreNodes(net);
    return net;
  };

  test('all 4 edges at the centre node have leftA ≈ rightA ≈ t/2 (chevron)', () => {
    const net = buildGrid();
    const center = net.nodes.get(nodeIdOf(5, 5))!;
    expect(center.edges).toHaveLength(4);
    const t = defaultConfig.wall_thickness!;

    for (const edge of center.edges) {
      const cut = cutAtNode(edge, center);
      expect(cut.leftA).toBeCloseTo(t / 2, 2);
      expect(cut.rightA).toBeCloseTo(t / 2, 2);
      expect(cut.b).toBeCloseTo(0, 5);
    }
  });

  test('node.edges is sorted by angle ascending after mitreNodes', () => {
    const net = buildGrid();
    const center = net.nodes.get(nodeIdOf(5, 5))!;

    for (let i = 0; i < center.edges.length - 1; i++) {
      const ai = angleAroundNode(center, center.edges[i]);
      const aNext = angleAroundNode(center, center.edges[i + 1]);
      expect(ai).toBeLessThanOrEqual(aNext);
    }
  });
});

describe('mitreNodes — Phase 1 sentinel { leftA: 0, rightA: 0, b: 0 } is overwritten', () => {
  test('every edge in a closed room has a non-zero cut magnitude on at least one side at both ends', () => {
    const floor = makeFloor([makeRoom('R', 0, 0, 5, 5)]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    mitreNodes(net);

    for (const edge of net.edges.values()) {
      // The sentinel {leftA:0, rightA:0} must have been overwritten.
      // Dominant walls have both ≈ −t/2 (negative), subordinate have both ≈ +t/2.
      // Either way, the absolute magnitude is non-trivially above zero.
      const startMax = Math.max(Math.abs(edge.startCut.leftA), Math.abs(edge.startCut.rightA));
      const endMax = Math.max(Math.abs(edge.endCut.leftA), Math.abs(edge.endCut.rightA));
      expect(startMax).toBeGreaterThan(0);
      expect(endMax).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Fan-out connection routing regression (connectionFractionAlongEdge bug)
// ---------------------------------------------------------------------------
//
// Regression for: connections routed to wrong sub-edge when the source room
// wall is longer than each individual target room wall ("fan-out" layout).
// The bug was that `connectionFractionAlongEdge` used the full source wall
// length instead of the overlap-aware `calculatePositionWithFallback` math,
// causing a connection at 90% of SlotA (worldZ=9) to compute worldZ=27 (90%
// of the 30m spine wall) and be mis-routed to the SlotC sub-edge.
//
// Layout:
//   Spine: 4×30 at (0,0) — left wall at x=0, z=[0..30]
//   SlotA: 4×10 at (-4,0)  — right wall at x=0, z=[0..10]
//   SlotB: 4×10 at (-4,10) — right wall at x=0, z=[10..20]
//   SlotC: 4×10 at (-4,20) — right wall at x=0, z=[20..30]
//
// Connections on Spine.left (all isPercentage=true):
//   connA   — 50% of SlotA overlap  → worldZ = 5   → (0,0)→(0,10)
//   connB   — 50% of SlotB overlap  → worldZ = 15  → (0,10)→(0,20)
//   connC   — 50% of SlotC overlap  → worldZ = 25  → (0,20)→(0,30)
//   connA90 — 90% of SlotA overlap  → worldZ = 9   → (0,0)→(0,10)
//             (the buggy path: raw 90% × 30 = 27 → would route to SlotC)

describe('connectionFractionAlongEdge — fan-out: 3 slot rooms against one long spine wall', () => {
  function makeConnection(toRoom: string, position: number): JsonConnection {
    return {
      fromRoom: 'Spine',
      fromWall: 'left',
      toRoom,
      toWall: 'right',
      doorType: 'door',
      position,
      isPercentage: true,
    };
  }

  function buildFanOut() {
    const connA = makeConnection('SlotA', 50);
    const connB = makeConnection('SlotB', 50);
    const connC = makeConnection('SlotC', 50);
    const connA90 = makeConnection('SlotA', 90);

    const floor = makeFloor([
      makeRoom('Spine', 0, 0, 4, 30),
      makeRoom('SlotA', -4, 0, 4, 10),
      makeRoom('SlotB', -4, 10, 4, 10),
      makeRoom('SlotC', -4, 20, 4, 10),
    ]);
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    routeConnectionsToEdges(net, [connA, connB, connC, connA90]);
    splitTJunctionEdges(net);
    return { net, connA, connB, connC, connA90 };
  }

  // Helper: find the edge that carries a specific connection after splitting.
  function edgeForConn(net: ReturnType<typeof buildFanOut>['net'], conn: JsonConnection) {
    for (const edge of net.edges.values()) {
      if (edge.connections.includes(conn)) return edge;
    }
    return null;
  }

  test('connA (50% of SlotA) routes to the (0,0)→(0,10) sub-edge', () => {
    const { net, connA } = buildFanOut();
    const edge = edgeForConn(net, connA);
    expect(edge).not.toBeNull();
    const expectedId = edgeIdOf(nodeIdOf(0, 0), nodeIdOf(0, 10));
    expect(edge!.id).toBe(expectedId);
  });

  test('connB (50% of SlotB) routes to the (0,10)→(0,20) sub-edge', () => {
    const { net, connB } = buildFanOut();
    const edge = edgeForConn(net, connB);
    expect(edge).not.toBeNull();
    const expectedId = edgeIdOf(nodeIdOf(0, 10), nodeIdOf(0, 20));
    expect(edge!.id).toBe(expectedId);
  });

  test('connC (50% of SlotC) routes to the (0,20)→(0,30) sub-edge', () => {
    const { net, connC } = buildFanOut();
    const edge = edgeForConn(net, connC);
    expect(edge).not.toBeNull();
    const expectedId = edgeIdOf(nodeIdOf(0, 20), nodeIdOf(0, 30));
    expect(edge!.id).toBe(expectedId);
  });

  test('connA90 (90% of SlotA) routes to (0,0)→(0,10), NOT to the SlotC sub-edge', () => {
    // This is the key regression: without the fix, 90% × 30m spine = worldZ=27
    // which lies in the SlotC sub-edge (z=[20..30]). With the fix, 90% of the
    // SlotA overlap = worldZ=9, which correctly lands in (0,0)→(0,10).
    const { net, connA90 } = buildFanOut();
    const edge = edgeForConn(net, connA90);
    expect(edge).not.toBeNull();
    const slotAEdgeId = edgeIdOf(nodeIdOf(0, 0), nodeIdOf(0, 10));
    const slotCEdgeId = edgeIdOf(nodeIdOf(0, 20), nodeIdOf(0, 30));
    expect(edge!.id).toBe(slotAEdgeId);
    expect(edge!.id).not.toBe(slotCEdgeId);
  });

  test('net.rooms is populated with all 4 rooms', () => {
    const { net } = buildFanOut();
    expect(net.rooms.size).toBe(4);
    expect(net.rooms.has('Spine')).toBe(true);
    expect(net.rooms.has('SlotA')).toBe(true);
    expect(net.rooms.has('SlotB')).toBe(true);
    expect(net.rooms.has('SlotC')).toBe(true);
  });
});
