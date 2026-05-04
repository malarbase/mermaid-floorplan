/**
 * Tests for Phase 4 of the wall-network rebuild — the `WallBuilder` engine
 * flag (`setEngine` / `getEngine` / `generateFloorWalls`) and the
 * `SceneBuildOptions.wallEngine` plumb-through (see
 * `.cursor/plans/wall_network_rebuild_2e4b6f09.plan.md` §4).
 *
 * These tests stay deliberately narrow:
 *   - Default behaviour with no `wallEngine` option must be byte-identical
 *     to the pre-Phase-4 legacy path. We assert this by checking that no
 *     `wall_edge_*` named meshes appear in the legacy output.
 *   - Network behaviour is asserted via `WallBuilder.generateFloorWalls`
 *     directly (mesh-count == edge-count, idempotency on the same floor
 *     reference) AND end-to-end via `buildFloorplanScene` with
 *     `wallEngine: 'network'`.
 *
 * CSG is initialised in a `beforeAll` (mirroring `wall-network-emit.test.ts`)
 * so the network's CSG branches are exercised when the library is available.
 * No assertions in this file actually depend on CSG being initialised —
 * mesh names and counts hold either way.
 */

import * as THREE from 'three';
import { beforeAll, describe, expect, test } from 'vitest';
import { initCSG } from '../src/csg-manager.js';
import { buildFloorplanScene } from '../src/scene-builder.js';
import type { JsonConnection, JsonExport, JsonFloor, JsonRoom, JsonWall } from '../src/types.js';
import { WallBuilder } from '../src/wall-builder.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await initCSG();
});

// ---------------------------------------------------------------------------
// Fixtures — a minimal 2-room shared-wall floorplan reused across tests
// ---------------------------------------------------------------------------

function createRoom(name: string, x: number, z: number, width: number, height: number): JsonRoom {
  return {
    name,
    x,
    z,
    width,
    height,
    walls: [
      { direction: 'top', type: 'solid' },
      { direction: 'bottom', type: 'solid' },
      { direction: 'left', type: 'solid' },
      { direction: 'right', type: 'solid' },
    ],
  };
}

function createTwoRoomFloor(): JsonFloor {
  return {
    id: 'ground',
    index: 0,
    rooms: [createRoom('A', 0, 0, 5, 5), createRoom('B', 5, 0, 5, 5)],
  };
}

function createTwoRoomFloorplan(): JsonExport {
  const connection: JsonConnection = {
    fromRoom: 'A',
    fromWall: 'right',
    toRoom: 'B',
    toWall: 'left',
    doorType: 'door',
    position: 50,
    isPercentage: true,
  };
  return {
    floors: [createTwoRoomFloor()],
    connections: [connection],
  };
}

function collectWallEdgeMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.name.startsWith('wall_edge_')) meshes.push(obj);
  });
  return meshes;
}

function collectAllWallsGroupMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if (obj instanceof THREE.Group && obj.name.startsWith('walls_')) {
      for (const child of obj.children) {
        if (child instanceof THREE.Mesh) meshes.push(child);
      }
    }
  });
  return meshes;
}

// ---------------------------------------------------------------------------
// 1. wallEngine defaulting — no option ⇒ network emission shape (post-flip)
// ---------------------------------------------------------------------------

describe('wallEngine defaulting', () => {
  test('builds without throwing and produces wall meshes (network default)', () => {
    const data = createTwoRoomFloorplan();
    const result = buildFloorplanScene(data);

    const wallsGroupMeshes = collectAllWallsGroupMeshes(result.scene);
    expect(wallsGroupMeshes.length).toBeGreaterThan(0);
  });

  test('default engine is now network ⇒ at least one wall_edge_* mesh', () => {
    const data = createTwoRoomFloorplan();
    const result = buildFloorplanScene(data);

    const edgeMeshes = collectWallEdgeMeshes(result.scene);
    expect(edgeMeshes.length).toBeGreaterThan(0);
  });

  test('explicit wallEngine: legacy still works as a fallback', () => {
    const data = createTwoRoomFloorplan();
    const result = buildFloorplanScene(data, { wallEngine: 'legacy' });

    const edgeMeshes = collectWallEdgeMeshes(result.scene);
    expect(edgeMeshes).toHaveLength(0);

    const wallsGroupMeshes = collectAllWallsGroupMeshes(result.scene);
    expect(wallsGroupMeshes.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Network engine via WallBuilder.setEngine / generateFloorWalls
// ---------------------------------------------------------------------------

describe('WallBuilder.setEngine / generateFloorWalls', () => {
  test('mesh count emitted into wallsGroup equals edge count in returned WallNetwork', () => {
    const builder = new WallBuilder();
    builder.setEngine('network');
    expect(builder.getEngine()).toBe('network');

    const floor = createTwoRoomFloor();
    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();

    const net = builder.generateFloorWalls(floor, [], wallsGroup, connsGroup, {});

    expect(net.edges.size).toBeGreaterThan(0);

    const wallMeshes = wallsGroup.children.filter(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.name.startsWith('wall_edge_'),
    );
    expect(wallMeshes).toHaveLength(net.edges.size);
  });

  test('second call with same floor reference reuses the cached network and emits no new meshes', () => {
    const builder = new WallBuilder();
    builder.setEngine('network');

    const floor = createTwoRoomFloor();
    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();

    const firstNet = builder.generateFloorWalls(floor, [], wallsGroup, connsGroup, {});
    const childCountAfterFirst = wallsGroup.children.length;
    expect(childCountAfterFirst).toBeGreaterThan(0);

    const secondNet = builder.generateFloorWalls(floor, [], wallsGroup, connsGroup, {});

    expect(secondNet).toBe(firstNet);
    expect(wallsGroup.children.length).toBe(childCountAfterFirst);
  });

  test('resetNetworkCache makes a follow-up call rebuild and re-emit', () => {
    const builder = new WallBuilder();
    builder.setEngine('network');

    const floor = createTwoRoomFloor();

    const firstGroup = new THREE.Group();
    const firstNet = builder.generateFloorWalls(floor, [], firstGroup, undefined, {});
    expect(firstGroup.children.length).toBeGreaterThan(0);

    builder.resetNetworkCache();

    const secondGroup = new THREE.Group();
    const secondNet = builder.generateFloorWalls(floor, [], secondGroup, undefined, {});

    expect(secondNet).not.toBe(firstNet);
    expect(secondGroup.children.length).toBe(firstGroup.children.length);
  });
});

// ---------------------------------------------------------------------------
// 3. onWallMesh attribution — fires once per mesh, with canonical binding
// ---------------------------------------------------------------------------

describe('generateFloorWalls onWallMesh attribution', () => {
  test('fires exactly once per emitted mesh with a canonical-binding (wall, room)', () => {
    const builder = new WallBuilder();
    builder.setEngine('network');

    const floor = createTwoRoomFloor();
    const wallsGroup = new THREE.Group();
    const connsGroup = new THREE.Group();

    const seen: Array<{
      mesh: THREE.Mesh;
      wall: JsonWall;
      room: JsonRoom;
      floor: JsonFloor;
    }> = [];

    const net = builder.generateFloorWalls(
      floor,
      [],
      wallsGroup,
      connsGroup,
      {},
      (mesh, wall, room, f) => {
        seen.push({ mesh, wall, room, floor: f });
      },
    );

    expect(seen).toHaveLength(net.edges.size);

    // Set of meshes the hook reported must equal the set of wall_edge_* meshes.
    const reportedMeshes = new Set(seen.map((s) => s.mesh));
    const groupMeshes = new Set(
      wallsGroup.children.filter(
        (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.name.startsWith('wall_edge_'),
      ),
    );
    expect(reportedMeshes).toEqual(groupMeshes);

    // Every reported wall.direction is one of the rectangular-room directions
    // — i.e. the canonical binding's `direction` field, not a derived value.
    for (const entry of seen) {
      expect(['top', 'bottom', 'left', 'right']).toContain(entry.wall.direction);
      expect(entry.floor).toBe(floor);
    }

    // The reported room MUST be the canonical binding's room (edge.rooms[0]).
    // We re-derive it from the network and compare per-mesh.
    const meshToEdgeId = new Map<THREE.Mesh, string>();
    for (const child of wallsGroup.children) {
      if (child instanceof THREE.Mesh && child.name.startsWith('wall_edge_')) {
        meshToEdgeId.set(child, child.name.replace('wall_edge_', ''));
      }
    }
    for (const entry of seen) {
      const edgeId = meshToEdgeId.get(entry.mesh);
      expect(edgeId).toBeDefined();
      const edge = net.edges.get(edgeId!);
      expect(edge).toBeDefined();
      expect(entry.room).toBe(edge!.rooms[0].room);
      expect(entry.wall.direction).toBe(edge!.rooms[0].direction);
    }
  });
});

// ---------------------------------------------------------------------------
// 4 + 5. End-to-end via SceneBuildOptions.wallEngine
// ---------------------------------------------------------------------------

describe('SceneBuildOptions.wallEngine', () => {
  test("'network' produces wall_edge_* meshes; default 'legacy' produces none", () => {
    const data = createTwoRoomFloorplan();

    const networkResult = buildFloorplanScene(data, { wallEngine: 'network' });
    const legacyResult = buildFloorplanScene(data, { wallEngine: 'legacy' });

    const networkEdgeMeshes = collectWallEdgeMeshes(networkResult.scene);
    const legacyEdgeMeshes = collectWallEdgeMeshes(legacyResult.scene);

    expect(networkEdgeMeshes.length).toBeGreaterThan(0);
    expect(legacyEdgeMeshes).toHaveLength(0);

    // Both engines must put walls into a `walls_*` group somewhere in the
    // scene so the visibility-toggle / layer story works either way.
    expect(collectAllWallsGroupMeshes(networkResult.scene).length).toBeGreaterThan(0);
    expect(collectAllWallsGroupMeshes(legacyResult.scene).length).toBeGreaterThan(0);
  });

  test("'network' end-to-end fires onWallMesh with the canonical (wall, room, floor)", () => {
    const data = createTwoRoomFloorplan();
    const seen: Array<{ mesh: THREE.Mesh; wall: JsonWall; room: JsonRoom; floor: JsonFloor }> = [];

    buildFloorplanScene(data, {
      wallEngine: 'network',
      onWallMesh: (mesh, wall, room, floor) => {
        seen.push({ mesh, wall, room, floor });
      },
    });

    expect(seen.length).toBeGreaterThan(0);
    for (const entry of seen) {
      expect(['top', 'bottom', 'left', 'right']).toContain(entry.wall.direction);
      expect(entry.mesh.name.startsWith('wall_edge_')).toBe(true);
      // The room must be one of the rooms on the floor.
      const roomNames = entry.floor.rooms.map((r) => r.name);
      expect(roomNames).toContain(entry.room.name);
    }
  });
});
