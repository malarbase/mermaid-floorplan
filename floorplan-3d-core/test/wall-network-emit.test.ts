/**
 * Tests for Phase 3 of the wall-network rebuild — `emitEdgeMesh` /
 * `emitNetworkMeshes` (see `.cursor/plans/wall_network_rebuild_2e4b6f09.plan.md`
 * §3). Construction (Phase 1), routing (Phase 1.2), splits (Phase 1.4), and
 * mitre cuts (Phase 2) are tested in `wall-network.test.ts`; this file only
 * exercises mesh emission, CSG hole cutting, per-edge materials, and
 * connection-mesh wiring.
 *
 * Strategy: use the real `three-bvh-csg` evaluator via `initCSG()` — it lives
 * in the workspace's `node_modules` and the network builder gates everything
 * on `isCsgAvailable()` so the conditional blocks in the production code are
 * actually exercised here. CSG-dependent assertions are skipped when the
 * library cannot be loaded (e.g. on a stripped-down CI image), mirroring the
 * tolerant pattern used elsewhere in the package.
 */

import * as THREE from 'three';
import { beforeAll, describe, expect, test } from 'vitest';
import { DIMENSIONS } from '../src/constants.js';
import { initCSG } from '../src/csg-manager.js';
import type { MaterialStyle } from '../src/materials.js';
import type { JsonConfig, JsonConnection, JsonFloor, JsonRoom, JsonWall } from '../src/types.js';
import {
  buildWallNetwork,
  type EmitOptions,
  edgeIdOf,
  emitEdgeMesh,
  emitNetworkMeshes,
  mitreNodes,
  nodeIdOf,
  routeConnectionsToEdges,
  splitTJunctionEdges,
  type WallEdge,
  type WallNetwork,
} from '../src/wall-network.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let csgAvailable = false;

beforeAll(async () => {
  csgAvailable = await initCSG();
});

const noStyle = (): MaterialStyle | undefined => undefined;
const defaultConfig: JsonConfig = {
  wall_thickness: 0.2,
  default_height: 3,
  door_width: 1.0,
  door_height: 2.1,
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type WallSpec = Partial<JsonWall> & { direction: 'top' | 'bottom' | 'left' | 'right' };

function makeRoom(
  name: string,
  x: number,
  z: number,
  width: number,
  height: number,
  wallOverrides: Partial<Record<'top' | 'bottom' | 'left' | 'right', WallSpec>> = {},
): JsonRoom {
  const directions: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
  const walls: JsonWall[] = directions.map((dir) => {
    const override = wallOverrides[dir];
    return {
      direction: dir,
      type: override?.type ?? 'solid',
      position: override?.position,
      isPercentage: override?.isPercentage,
      width: override?.width,
      height: override?.height,
      wallHeight: override?.wallHeight,
    };
  });
  return { name, x, z, width, height, walls };
}

function makeFloor(rooms: JsonRoom[]): JsonFloor {
  return { id: 'floor1', index: 0, rooms };
}

function buildNet(floor: JsonFloor): WallNetwork {
  const net = buildWallNetwork(floor, defaultConfig, noStyle);
  splitTJunctionEdges(net);
  mitreNodes(net);
  return net;
}

function makeOpts(group: THREE.Group, connectionsGroup?: THREE.Group): EmitOptions {
  return {
    config: defaultConfig,
    group,
    connectionsGroup,
    elevation: 0,
  };
}

function worldBox(mesh: THREE.Mesh): THREE.Box3 {
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3();
  box.setFromObject(mesh);
  return box;
}

function vertexCount(mesh: THREE.Mesh): number {
  const geom = mesh.geometry as THREE.BufferGeometry;
  const idx = geom.index;
  const pos = geom.attributes.position;
  return idx ? idx.count : pos.count;
}

// ---------------------------------------------------------------------------
// 1. Single 5×5 room — 4 wall meshes, no holes, no connections
// ---------------------------------------------------------------------------

describe('emitNetworkMeshes — single 5×5 room', () => {
  test('emits exactly 4 wall meshes with no connection meshes', () => {
    const net = buildNet(makeFloor([makeRoom('R', 0, 0, 5, 5)]));
    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(wallsGroup, connsGroup));

    expect(wallsGroup.children).toHaveLength(4);
    expect(connsGroup.children).toHaveLength(0);

    for (const child of wallsGroup.children) {
      expect(child).toBeInstanceOf(THREE.Mesh);
      expect((child as THREE.Mesh).name.startsWith('wall_edge_')).toBe(true);
    }
  });

  test('every emitted wall mesh has the expected world bounding-box dimensions', () => {
    const net = buildNet(makeFloor([makeRoom('R', 0, 0, 5, 5)]));
    const group = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(group));

    const t = defaultConfig.wall_thickness!;
    const expectedHeight =
      defaultConfig.default_height! + DIMENSIONS.WALL.EMBED - DIMENSIONS.WALL.CEILING_GAP;
    // With the dominant/subordinate L-corner rule:
    //   dominant (horizontal) walls extend t/2 past both corner nodes → L + t
    //   subordinate (vertical) walls use chevron tips at nodes → L exactly
    const expectedDominant = 5 + t;
    const expectedSubordinate = 5;

    for (const child of group.children) {
      const box = worldBox(child as THREE.Mesh);
      const size = new THREE.Vector3();
      box.getSize(size);

      // Vertical extent matches the asymmetric wall span.
      expect(size.y).toBeCloseTo(expectedHeight, 3);

      // The shorter horizontal axis is always the wall thickness.
      const longer = Math.max(size.x, size.z);
      const shorter = Math.min(size.x, size.z);
      expect(shorter).toBeCloseTo(t, 3);

      // Longer axis is either L + t (dominant) or L (subordinate).
      const isDominant = Math.abs(longer - expectedDominant) < 0.01;
      const isSubord = Math.abs(longer - expectedSubordinate) < 0.01;
      expect(isDominant || isSubord).toBe(true);
    }
  });

  test('per-edge materials length is 4 on every emitted mesh', () => {
    const net = buildNet(makeFloor([makeRoom('R', 0, 0, 5, 5)]));
    const group = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(group));

    for (const child of group.children) {
      const mat = (child as THREE.Mesh).material;
      expect(Array.isArray(mat)).toBe(true);
      expect((mat as THREE.MeshStandardMaterial[]).length).toBe(4);
    }
  });

  test('onEdgeMesh callback fires once per emitted edge with the matching edge ref', () => {
    const net = buildNet(makeFloor([makeRoom('R', 0, 0, 5, 5)]));
    const group = new THREE.Group();
    const seen: WallEdge[] = [];

    emitNetworkMeshes(net, {
      ...makeOpts(group),
      onEdgeMesh: (_mesh, edge) => seen.push(edge),
    });

    expect(seen).toHaveLength(4);
    expect(new Set(seen.map((e) => e.id))).toEqual(new Set(net.edges.keys()));
  });
});

// ---------------------------------------------------------------------------
// 2. Explicit `JsonWall.type = 'door'` punches a hole
// ---------------------------------------------------------------------------

describe('emitNetworkMeshes — explicit door wall (CSG hole)', () => {
  test('CSG: the holed-edge mesh has more vertices than the matching solid baseline', () => {
    if (!csgAvailable) return;

    const baselineNet = buildNet(makeFloor([makeRoom('R', 0, 0, 5, 5)]));
    const baselineGroup = new THREE.Group();
    emitNetworkMeshes(baselineNet, makeOpts(baselineGroup));
    // Top wall = the (0,0)→(5,0) edge.
    const topId = edgeIdOf(nodeIdOf(0, 0), nodeIdOf(5, 0));
    const baselineTopMesh = baselineGroup.children.find(
      (c) => (c as THREE.Mesh).name === `wall_edge_${topId}`,
    ) as THREE.Mesh;
    expect(baselineTopMesh).toBeDefined();
    const baselineVerts = vertexCount(baselineTopMesh);

    const holedNet = buildNet(
      makeFloor([
        makeRoom('R', 0, 0, 5, 5, {
          top: {
            direction: 'top',
            type: 'door',
            position: 50,
            isPercentage: true,
          },
        }),
      ]),
    );
    const holedGroup = new THREE.Group();
    emitNetworkMeshes(holedNet, makeOpts(holedGroup));
    const holedTopMesh = holedGroup.children.find(
      (c) => (c as THREE.Mesh).name === `wall_edge_${topId}`,
    ) as THREE.Mesh;
    expect(holedTopMesh).toBeDefined();
    const holedVerts = vertexCount(holedTopMesh);

    // CSG subtraction always produces more triangles around the cutout
    // boundary, so the holed mesh strictly has more vertices than the solid.
    expect(holedVerts).toBeGreaterThan(baselineVerts);
  });
});

// ---------------------------------------------------------------------------
// 3. Connection between two rooms — shared edge is holed + door panel emitted
// ---------------------------------------------------------------------------

describe('emitNetworkMeshes — connection on shared wall', () => {
  function buildTwoRoomFloor(): JsonFloor {
    return makeFloor([makeRoom('A', 0, 0, 5, 5), makeRoom('B', 5, 0, 5, 5)]);
  }

  function buildConnection(): JsonConnection {
    return {
      fromRoom: 'A',
      fromWall: 'right',
      toRoom: 'B',
      toWall: 'left',
      doorType: 'door',
      position: 50,
      isPercentage: true,
    };
  }

  test('the shared-edge wall mesh has 4 materials regardless of CSG availability', () => {
    const floor = buildTwoRoomFloor();
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    routeConnectionsToEdges(net, [buildConnection()]);
    splitTJunctionEdges(net);
    mitreNodes(net);

    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(wallsGroup, connsGroup));

    const sharedId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5));
    const sharedMesh = wallsGroup.children.find(
      (c) => (c as THREE.Mesh).name === `wall_edge_${sharedId}`,
    ) as THREE.Mesh;
    expect(sharedMesh).toBeDefined();

    const mat = sharedMesh.material;
    expect(Array.isArray(mat)).toBe(true);
    expect((mat as THREE.MeshStandardMaterial[]).length).toBe(4);
  });

  test('CSG: the shared-edge mesh has a hole, and one door panel is added to connectionsGroup', () => {
    if (!csgAvailable) return;

    const floor = buildTwoRoomFloor();
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    routeConnectionsToEdges(net, [buildConnection()]);
    splitTJunctionEdges(net);
    mitreNodes(net);

    // Baseline: same network without the connection (so no hole, no door).
    const baselineNet = buildNet(buildTwoRoomFloor());
    const baselineGroup = new THREE.Group();
    emitNetworkMeshes(baselineNet, makeOpts(baselineGroup));
    const sharedId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5));
    const baselineSharedMesh = baselineGroup.children.find(
      (c) => (c as THREE.Mesh).name === `wall_edge_${sharedId}`,
    ) as THREE.Mesh;
    const baselineVerts = vertexCount(baselineSharedMesh);

    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(wallsGroup, connsGroup));

    const sharedMesh = wallsGroup.children.find(
      (c) => (c as THREE.Mesh).name === `wall_edge_${sharedId}`,
    ) as THREE.Mesh;
    expect(sharedMesh).toBeDefined();
    expect(vertexCount(sharedMesh)).toBeGreaterThan(baselineVerts);

    // Exactly one door panel mesh ends up in the connections group.
    expect(connsGroup.children).toHaveLength(1);
    const door = connsGroup.children[0];
    expect(door.name.startsWith('door-')).toBe(true);
  });

  test('opening connections (no panel) still cut a hole but add no mesh to connectionsGroup', () => {
    if (!csgAvailable) return;

    const floor = buildTwoRoomFloor();
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    const opening: JsonConnection = { ...buildConnection(), doorType: 'opening' };
    routeConnectionsToEdges(net, [opening]);
    splitTJunctionEdges(net);
    mitreNodes(net);

    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(wallsGroup, connsGroup));

    expect(connsGroup.children).toHaveLength(0);

    // Sanity: the wall mesh is still there (just punched).
    const sharedId = edgeIdOf(nodeIdOf(5, 0), nodeIdOf(5, 5));
    const sharedMesh = wallsGroup.children.find(
      (c) => (c as THREE.Mesh).name === `wall_edge_${sharedId}`,
    ) as THREE.Mesh | undefined;
    expect(sharedMesh).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Defensive — degenerate edges (cuts consume entire length) are skipped
// ---------------------------------------------------------------------------

describe('emitEdgeMesh — degenerate edge handling', () => {
  test('returns null and skips the mesh when cuts exceed edge length', () => {
    const net = buildNet(makeFloor([makeRoom('R', 0, 0, 5, 5)]));
    const someEdge = [...net.edges.values()][0];

    // Force the edge to be fully consumed by mitres after the fact.
    someEdge.startCut = { leftA: 4, rightA: 4, b: 0 };
    someEdge.endCut = { leftA: 4, rightA: 4, b: 0 };

    const group = new THREE.Group();
    const opts = makeOpts(group);

    expect(emitEdgeMesh(someEdge, opts)).toBeNull();

    // emitNetworkMeshes should also gracefully skip the same edge.
    const wallsGroup = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(wallsGroup));
    const survived = wallsGroup.children.some(
      (c) => (c as THREE.Mesh).name === `wall_edge_${someEdge.id}`,
    );
    expect(survived).toBe(false);
  });

  test('returns null when the underlying nodeA/nodeB endpoints coincide', () => {
    const net = buildNet(makeFloor([makeRoom('R', 0, 0, 5, 5)]));
    const someEdge = [...net.edges.values()][0];

    // Move nodeB onto nodeA so length collapses to 0.
    someEdge.nodeB.pos.copy(someEdge.nodeA.pos);

    const group = new THREE.Group();
    expect(emitEdgeMesh(someEdge, makeOpts(group))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fan-out door position regression
// ---------------------------------------------------------------------------
//
// Regression for the `connectionFractionAlongEdge` bug where a connection
// to SlotA at 90% was mis-routed to the SlotC sub-edge and rendered at the
// wrong world Z (≈29 instead of ≈9). The test verifies that after the fix:
//  - All 4 door panels are emitted
//  - Both door panels for SlotA have Z positions within the SlotA overlap
//    band [0..10] ± half-door-width, NOT in SlotC's band [20..30]
//
// Does NOT require CSG — door panels are emitted regardless of CSG availability.

describe('emitNetworkMeshes — fan-out door positions (regression)', () => {
  function makeFanOutFloor() {
    return makeFloor([
      makeRoom('Spine', 0, 0, 4, 30),
      makeRoom('SlotA', -4, 0, 4, 10),
      makeRoom('SlotB', -4, 10, 4, 10),
      makeRoom('SlotC', -4, 20, 4, 10),
    ]);
  }

  function makeConn(toRoom: string, position: number, doorType = 'door'): JsonConnection {
    return {
      fromRoom: 'Spine',
      fromWall: 'left',
      toRoom,
      toWall: 'right',
      doorType,
      position,
      isPercentage: true,
    };
  }

  function buildFanOutNet() {
    const connA = makeConn('SlotA', 50);
    const connA90 = makeConn('SlotA', 90);
    const connB = makeConn('SlotB', 50);
    const connC = makeConn('SlotC', 50);

    const floor = makeFanOutFloor();
    const net = buildWallNetwork(floor, defaultConfig, noStyle);
    routeConnectionsToEdges(net, [connA, connA90, connB, connC]);
    splitTJunctionEdges(net);
    mitreNodes(net);
    return net;
  }

  test('emits exactly 4 door panel meshes total', () => {
    const net = buildFanOutNet();
    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(wallsGroup, connsGroup));
    expect(connsGroup.children).toHaveLength(4);
  });

  test('both Spine→SlotA door panels have Z position within the SlotA overlap band [0..10]', () => {
    // Regression: without the fix, connA90 routes to the SlotC edge and the
    // door renders at Z≈29 instead of Z≈9 (90% of [0..10]).
    const net = buildFanOutNet();
    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(wallsGroup, connsGroup));

    const slotADoors = connsGroup.children.filter(
      (c) => c.name === 'door-Spine-SlotA',
    ) as THREE.Mesh[];
    expect(slotADoors).toHaveLength(2);

    // Each door hinge is at most doorWidth/2 ≈ 0.5m outside the centre, so
    // both should land within [−0.5, 10.5] — well inside SlotA, not SlotC.
    const halfDoorWidth = (defaultConfig as JsonConfig & { door_width?: number }).door_width! / 2;
    for (const door of slotADoors) {
      door.updateMatrixWorld(true);
      const z = door.position.z;
      expect(z).toBeGreaterThanOrEqual(-halfDoorWidth - 0.01);
      expect(z).toBeLessThanOrEqual(10 + halfDoorWidth + 0.01);
    }
  });

  test('SlotB and SlotC door panels are in their own overlap bands', () => {
    const net = buildFanOutNet();
    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();
    emitNetworkMeshes(net, makeOpts(wallsGroup, connsGroup));

    const halfDoor = (defaultConfig as JsonConfig & { door_width?: number }).door_width! / 2;

    const slotBDoor = connsGroup.children.find((c) => c.name === 'door-Spine-SlotB') as THREE.Mesh;
    expect(slotBDoor).toBeDefined();
    expect(slotBDoor.position.z).toBeGreaterThanOrEqual(10 - halfDoor - 0.01);
    expect(slotBDoor.position.z).toBeLessThanOrEqual(20 + halfDoor + 0.01);

    const slotCDoor = connsGroup.children.find((c) => c.name === 'door-Spine-SlotC') as THREE.Mesh;
    expect(slotCDoor).toBeDefined();
    expect(slotCDoor.position.z).toBeGreaterThanOrEqual(20 - halfDoor - 0.01);
    expect(slotCDoor.position.z).toBeLessThanOrEqual(30 + halfDoor + 0.01);
  });
});
