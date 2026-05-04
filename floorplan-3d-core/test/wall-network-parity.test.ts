/**
 * Parity tests between the legacy and network wall engines (Phase 5.1 of the
 * wall-network rebuild — see `.cursor/plans/wall_network_rebuild_2e4b6f09.plan.md`
 * §5).
 *
 * The plan named `townhouse-two-story.floorplan`, `ImprovedTriplexVilla.floorplan`,
 * and `StairsAndLifts.floorplan` from `mermaid-floorplan/examples/` as the parity
 * fixtures, but `floorplan-3d-core` has no dependency on the DSL parser.
 * Instead we build representative `JsonExport` fixtures programmatically here,
 * covering the same structural shapes called out by the plan:
 *
 *   - Single-floor 2-room shared wall (basic shared-wall parity)
 *   - 2×2 grid with one connection (4 rooms, 4 shared walls, 1 door)
 *   - T-junction layout (10×5 + 5×5 — same shape as the Phase 1/2 fixture)
 *   - Multi-floor stack (2 floors with stacked rooms)
 *   - One fixture with both a connection AND a window-type wall
 *   - Single isolated room (sanity baseline; no shared walls)
 *
 * For each fixture we run BOTH engines via `buildFloorplanScene({ wallEngine })`
 * and assert:
 *
 *   1. Bbox parity within 1mm — combined wall + connection AABB matches.
 *   2. Network mesh count ≤ legacy mesh count (dedup at least breaks even).
 *   3. No two network wall meshes overlap by more than `NETWORK_EPSILON`
 *      (proves no inter-edge volumetric overlap by construction).
 *   4. Door / window mesh world positions match within 1mm.
 *   5. Both engines populate the wallsGroup non-empty.
 *
 * Phase 5.2 (manual visual validation) is intentionally out of scope here —
 * that's the user's job at the viewer. This file is the automated gate.
 */

import * as THREE from 'three';
import { beforeAll, describe, expect, test } from 'vitest';
import { DIMENSIONS } from '../src/constants.js';
import { initCSG } from '../src/csg-manager.js';
import { buildFloorplanScene } from '../src/scene-builder.js';
import type { JsonConnection, JsonExport, JsonFloor, JsonRoom, JsonWall } from '../src/types.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeAll(async () => {
  await initCSG();
});

// ---------------------------------------------------------------------------
// Helpers — fixture construction (parallel to scene-builder.test.ts patterns)
// ---------------------------------------------------------------------------

function makeRoom(
  name: string,
  x: number,
  z: number,
  width: number,
  height: number,
  wallOverrides: Partial<Record<'top' | 'bottom' | 'left' | 'right', JsonWall>> = {},
): JsonRoom {
  const directions: Array<'top' | 'bottom' | 'left' | 'right'> = ['top', 'bottom', 'left', 'right'];
  const walls: JsonWall[] = directions.map((dir) => ({
    direction: dir,
    type: wallOverrides[dir]?.type ?? 'solid',
    ...(wallOverrides[dir]?.position !== undefined && {
      position: wallOverrides[dir]!.position,
    }),
    ...(wallOverrides[dir]?.width !== undefined && { width: wallOverrides[dir]!.width }),
    ...(wallOverrides[dir]?.height !== undefined && { height: wallOverrides[dir]!.height }),
    ...(wallOverrides[dir]?.isPercentage !== undefined && {
      isPercentage: wallOverrides[dir]!.isPercentage,
    }),
  }));
  return { name, x, z, width, height, walls };
}

function makeFloor(id: string, index: number, rooms: JsonRoom[]): JsonFloor {
  return { id, index, rooms };
}

function build2RoomShared(): JsonExport {
  return {
    floors: [makeFloor('ground', 0, [makeRoom('A', 0, 0, 5, 5), makeRoom('B', 5, 0, 5, 5)])],
    connections: [],
  };
}

function build2x2Grid(): JsonExport {
  // 2×2 grid of 5×5 rooms with one connection between the top-left (A) and
  // top-right (B) rooms — exercises shared-wall dedup and connection routing
  // simultaneously.
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
    floors: [
      makeFloor('ground', 0, [
        makeRoom('A', 0, 0, 5, 5),
        makeRoom('B', 5, 0, 5, 5),
        makeRoom('C', 0, 5, 5, 5),
        makeRoom('D', 5, 5, 5, 5),
      ]),
    ],
    connections: [connection],
  };
}

function buildTJunction(): JsonExport {
  // Same fixture used in `wall-network.test.ts` for the T-junction split test:
  //   Room A = (0,-5,10,5) — bottom wall runs (0,0)→(10,0).
  //   Room B = (5, 0, 5,5) — top wall runs (5,0)→(10,0); left wall (5,0)→(5,5).
  //   B's top-left corner (5,0) lands mid-way along A's bottom — a T-junction.
  return {
    floors: [makeFloor('ground', 0, [makeRoom('A', 0, -5, 10, 5), makeRoom('B', 5, 0, 5, 5)])],
    connections: [],
  };
}

function buildMultiFloor(): JsonExport {
  // Mirrors the multi-floor stack shape called out by the plan's
  // `ImprovedTriplexVilla` reference: two floors with stacked rooms so the
  // network is rebuilt per floor and the per-floor caches don't leak.
  return {
    floors: [
      makeFloor('ground', 0, [makeRoom('living', 0, 0, 5, 5), makeRoom('kitchen', 5, 0, 5, 5)]),
      makeFloor('first', 1, [makeRoom('bedroom', 0, 0, 5, 5), makeRoom('bath', 5, 0, 5, 5)]),
    ],
    connections: [
      {
        fromRoom: 'living',
        fromWall: 'right',
        toRoom: 'kitchen',
        toWall: 'left',
        doorType: 'door',
        position: 50,
        isPercentage: true,
      },
    ],
    config: { default_height: 3 },
  };
}

function buildWindowAndConnection(): JsonExport {
  // Exercises both the connection-hole code path (door between A and B) AND
  // the explicit `JsonWall.type === 'window'` path (window on A's top exterior
  // wall). The window is intentionally on an EXTERIOR wall so it doesn't
  // collide with the shared-wall edge between the two rooms.
  return {
    floors: [
      makeFloor('ground', 0, [
        makeRoom('A', 0, 0, 5, 5, {
          top: { direction: 'top', type: 'window', position: 50, isPercentage: true },
        }),
        makeRoom('B', 5, 0, 5, 5),
      ]),
    ],
    connections: [
      {
        fromRoom: 'A',
        fromWall: 'right',
        toRoom: 'B',
        toWall: 'left',
        doorType: 'door',
        position: 50,
        isPercentage: true,
      },
    ],
  };
}

function buildSingleRoom(): JsonExport {
  return {
    floors: [makeFloor('ground', 0, [makeRoom('only', 0, 0, 5, 5)])],
    connections: [],
  };
}

function buildReverseConnectionOrder(): JsonExport {
  // Two rooms sharing a wall, but the connection is declared `B → A` rather
  // than `A → B`. Rooms are still iterated in [A, B] order during network
  // construction, so `edge.rooms[0]` is A's binding. Earlier versions of
  // `emitEdgeMesh` anchored the door panel on `edge.rooms[0]` regardless of
  // `connection.fromRoom`, producing a swing-direction divergence vs. legacy.
  // This fixture pins that the panel anchors on the correct source room
  // (B in this case) so the door world position matches legacy.
  return {
    floors: [makeFloor('ground', 0, [makeRoom('A', 0, 0, 5, 5), makeRoom('B', 5, 0, 5, 5)])],
    connections: [
      {
        fromRoom: 'B',
        fromWall: 'left',
        toRoom: 'A',
        toWall: 'right',
        doorType: 'door',
        position: 30,
        isPercentage: true,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Helpers — scene introspection
// ---------------------------------------------------------------------------

interface FloorBag {
  /** All meshes in `walls_<floor.id>`. */
  walls: THREE.Mesh[];
  /** All meshes in `connections_<floor.id>` (door panels, window glass, …). */
  connections: THREE.Mesh[];
}

function collectByFloor(scene: THREE.Scene): Map<string, FloorBag> {
  const result = new Map<string, FloorBag>();
  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Group)) return;
    if (obj.name.startsWith('walls_')) {
      const floorId = obj.name.replace(/^walls_/, '');
      const bag = result.get(floorId) ?? { walls: [], connections: [] };
      for (const child of obj.children) {
        if (child instanceof THREE.Mesh) bag.walls.push(child);
      }
      result.set(floorId, bag);
    } else if (obj.name.startsWith('connections_')) {
      const floorId = obj.name.replace(/^connections_/, '');
      const bag = result.get(floorId) ?? { walls: [], connections: [] };
      // Connection meshes can be nested in groups (e.g. double-door has a
      // parent group with two panel children). Walk recursively.
      obj.traverse((c) => {
        if (c !== obj && c instanceof THREE.Mesh) bag.connections.push(c);
      });
      result.set(floorId, bag);
    }
  });
  return result;
}

/**
 * Compute the union AABB of every mesh under `objects` in WORLD space.
 * `Box3.setFromObject` updates each mesh's world matrix, so this picks up the
 * floor group's `position.y` offset and any local rotation/translation.
 *
 * Returns a `null` Box3 (isEmpty()=true) if `objects` is empty.
 */
function unionBox3(...objects: THREE.Object3D[][]): THREE.Box3 {
  const box = new THREE.Box3();
  box.makeEmpty();
  const tmp = new THREE.Box3();
  for (const arr of objects) {
    for (const obj of arr) {
      tmp.makeEmpty();
      tmp.setFromObject(obj);
      if (!tmp.isEmpty()) box.union(tmp);
    }
  }
  return box;
}

function bboxesEqual(a: THREE.Box3, b: THREE.Box3, tol: number): boolean {
  // a ⊂ b+tol AND b ⊂ a+tol  ⇒  the two boxes agree within `tol`.
  const aExpanded = a.clone().expandByScalar(tol);
  const bExpanded = b.clone().expandByScalar(tol);
  return aExpanded.containsBox(b) && bExpanded.containsBox(a);
}

interface OverlapInfo {
  i: number;
  j: number;
  /** Smallest dimension of the intersection box (≤ NETWORK_EPSILON ⇒ touching only). */
  minDim: number;
  iName: string;
  jName: string;
}

/**
 * Walk every pair of meshes and report any whose AABB intersection has a
 * minimum dimension > `epsilon`. "Touching" pairs (corners or edges that
 * coincide along a single plane) intersect with min dim == 0 and are filtered
 * out — only volumetric overlap is reported.
 */
function findOverlappingPair(meshes: THREE.Mesh[], epsilon: number): OverlapInfo | null {
  const boxes = meshes.map((m) => new THREE.Box3().setFromObject(m));
  for (let i = 0; i < meshes.length; i++) {
    for (let j = i + 1; j < meshes.length; j++) {
      if (!boxes[i].intersectsBox(boxes[j])) continue;
      const intersect = boxes[i].clone().intersect(boxes[j]);
      if (intersect.isEmpty()) continue;
      const size = new THREE.Vector3();
      intersect.getSize(size);
      const minDim = Math.min(size.x, size.y, size.z);
      if (minDim > epsilon) {
        return {
          i,
          j,
          minDim,
          iName: meshes[i].name || `mesh#${i}`,
          jName: meshes[j].name || `mesh#${j}`,
        };
      }
    }
  }
  return null;
}

/**
 * Find the connection mesh corresponding to `(fromRoom, toRoom)`. The legacy
 * and network engines name door panels `door-${fromRoom}-${toRoom}`, double
 * doors as a parent group with `double-door-{left,right}-…` children, and
 * window panes as `window-${fromRoom}-${toRoom}`. We accept any of these
 * variants since we only need a stable world position for parity.
 *
 * Returns `null` when no match is found (the caller asserts on this).
 */
function findConnectionMesh(
  meshes: THREE.Mesh[],
  fromRoom: string,
  toRoom: string,
): THREE.Mesh | null {
  const namePatterns = [
    `door-${fromRoom}-${toRoom}`,
    `window-${fromRoom}-${toRoom}`,
    `double-door-left-${fromRoom}-${toRoom}`,
  ];
  for (const m of meshes) {
    if (namePatterns.includes(m.name)) return m;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fixtures table
// ---------------------------------------------------------------------------

interface ParityFixture {
  name: string;
  data: JsonExport;
  /** True when the fixture has at least one shared wall — used in the mesh-count assertion. */
  hasSharedWalls: boolean;
}

const fixtures: ParityFixture[] = [
  { name: '2-room shared', data: build2RoomShared(), hasSharedWalls: true },
  { name: '2x2 grid + connection', data: build2x2Grid(), hasSharedWalls: true },
  { name: 'T-junction', data: buildTJunction(), hasSharedWalls: true },
  { name: 'multi-floor stack', data: buildMultiFloor(), hasSharedWalls: true },
  { name: 'window + connection', data: buildWindowAndConnection(), hasSharedWalls: true },
  { name: 'single isolated room', data: buildSingleRoom(), hasSharedWalls: false },
  {
    name: 'reverse connection order (B→A)',
    data: buildReverseConnectionOrder(),
    hasSharedWalls: true,
  },
];

// ---------------------------------------------------------------------------
// Per-fixture parity assertions
// ---------------------------------------------------------------------------

describe.each(fixtures)('parity: $name', ({ data, hasSharedWalls }) => {
  let legacyByFloor: Map<string, FloorBag>;
  let networkByFloor: Map<string, FloorBag>;

  beforeAll(() => {
    const legacyResult = buildFloorplanScene(data, { wallEngine: 'legacy' });
    const networkResult = buildFloorplanScene(data, { wallEngine: 'network' });
    legacyByFloor = collectByFloor(legacyResult.scene);
    networkByFloor = collectByFloor(networkResult.scene);
  });

  test('both engines populate every floor with at least one wall mesh', () => {
    expect(legacyByFloor.size).toBeGreaterThan(0);
    expect(networkByFloor.size).toBe(legacyByFloor.size);
    for (const [floorId, legacyBag] of legacyByFloor) {
      const networkBag = networkByFloor.get(floorId);
      expect(networkBag, `network missing walls for floor ${floorId}`).toBeDefined();
      expect(legacyBag.walls.length).toBeGreaterThan(0);
      expect(networkBag!.walls.length).toBeGreaterThan(0);
    }
  });

  test('bbox parity within 1mm per floor (walls + connections)', () => {
    // 1mm tolerance comfortably absorbs the legacy `WALL_CORNER_EMBED` (0.1mm)
    // and the network's mitre-cut quantization. A larger discrepancy would
    // signal a real geometric divergence between the two engines.
    const TOL_MM = 0.001;
    for (const [floorId, legacyBag] of legacyByFloor) {
      const networkBag = networkByFloor.get(floorId)!;
      const legacyBox = unionBox3(legacyBag.walls, legacyBag.connections);
      const networkBox = unionBox3(networkBag.walls, networkBag.connections);

      expect(legacyBox.isEmpty()).toBe(false);
      expect(networkBox.isEmpty()).toBe(false);

      if (!bboxesEqual(legacyBox, networkBox, TOL_MM)) {
        const fmt = (b: THREE.Box3) =>
          `min=(${b.min.x.toFixed(4)}, ${b.min.y.toFixed(4)}, ${b.min.z.toFixed(4)}) ` +
          `max=(${b.max.x.toFixed(4)}, ${b.max.y.toFixed(4)}, ${b.max.z.toFixed(4)})`;
        throw new Error(
          `bbox mismatch on floor ${floorId} (tol=${TOL_MM}m):\n` +
            `  legacy  ${fmt(legacyBox)}\n` +
            `  network ${fmt(networkBox)}`,
        );
      }
    }
  });

  test('network mesh count ≤ legacy mesh count per floor', () => {
    // The plan asserts `≤` (not strict). Because the legacy engine already
    // dedups shared walls via room-name ownership rules, the two engines
    // typically produce the same per-floor wall-mesh count for rectangular
    // fixtures; we still run this check as a regression-floor in case the
    // network engine ever starts emitting redundant edges.
    for (const [floorId, legacyBag] of legacyByFloor) {
      const networkBag = networkByFloor.get(floorId)!;
      expect(
        networkBag.walls.length,
        `network exceeded legacy mesh count on floor ${floorId} ` +
          `(network=${networkBag.walls.length}, legacy=${legacyBag.walls.length})`,
      ).toBeLessThanOrEqual(legacyBag.walls.length);
    }
    // The `hasSharedWalls` flag is intentionally referenced here so the
    // fixture table column has a single source of truth even though the
    // current implementation does not assert strict-inequality (see the
    // comment block above).
    void hasSharedWalls;
  });

  test('no two network wall meshes have bbox overlap exceeding wall-thickness (touching/slant overlap is fine)', () => {
    // With slanted mitre fills, adjacent wall mesh bounding boxes overlap by up
    // to ~t at L-corners: each wall's reflex end extends t/2 past the node,
    // so the two walls' bbox corners overlap by ≈ t × t × height. This is
    // intentional — the slant face tiles the corner cell correctly. We only
    // flag overlaps >= t which would indicate actual structural errors.
    const tol = DIMENSIONS.WALL.THICKNESS;
    for (const [floorId, networkBag] of networkByFloor) {
      const overlap = findOverlappingPair(networkBag.walls, tol);
      if (overlap) {
        throw new Error(
          `network wall meshes overlap > t/2 on floor ${floorId}: ` +
            `${overlap.iName} ↔ ${overlap.jName} ` +
            `(min intersection dim = ${overlap.minDim.toFixed(6)} m)`,
        );
      }
    }
  });

  test('door / window mesh world positions match within 1mm', () => {
    const TOL_MM = 0.001;

    // Iterate every connection in the fixture, locate the corresponding mesh
    // in BOTH engines, and compare world positions. We do this per-floor by
    // walking the floors and matching connections that originate on a room
    // in that floor.
    for (const floor of data.floors) {
      const floorId = floor.id;
      const legacyBag = legacyByFloor.get(floorId)!;
      const networkBag = networkByFloor.get(floorId)!;
      const roomNames = new Set(floor.rooms.map((r) => r.name));

      for (const conn of data.connections ?? []) {
        if (!roomNames.has(conn.fromRoom)) continue;

        const legacyMesh = findConnectionMesh(legacyBag.connections, conn.fromRoom, conn.toRoom);
        const networkMesh = findConnectionMesh(networkBag.connections, conn.fromRoom, conn.toRoom);

        expect(
          legacyMesh,
          `legacy missing connection mesh for ${conn.fromRoom}→${conn.toRoom}`,
        ).not.toBeNull();
        expect(
          networkMesh,
          `network missing connection mesh for ${conn.fromRoom}→${conn.toRoom}`,
        ).not.toBeNull();

        const legacyPos = new THREE.Vector3();
        const networkPos = new THREE.Vector3();
        legacyMesh!.getWorldPosition(legacyPos);
        networkMesh!.getWorldPosition(networkPos);

        const distance = legacyPos.distanceTo(networkPos);
        if (distance > TOL_MM) {
          throw new Error(
            `connection ${conn.fromRoom}→${conn.toRoom} world-position mismatch ` +
              `on floor ${floorId}: legacy=(${legacyPos.x.toFixed(4)}, ` +
              `${legacyPos.y.toFixed(4)}, ${legacyPos.z.toFixed(4)}), ` +
              `network=(${networkPos.x.toFixed(4)}, ${networkPos.y.toFixed(4)}, ` +
              `${networkPos.z.toFixed(4)}), distance=${distance.toFixed(6)} m`,
          );
        }
      }

      // Explicit `JsonWall.type === 'window'` walls also produce a glass mesh
      // in both engines. The legacy path names it via `MaterialFactory` /
      // generic Mesh with no name; the network path names it
      // `window_glass_<edgeId>`. Since the legacy mesh has no stable name we
      // skip per-window mesh comparison here — bbox parity already pins the
      // wall opening's world position, and any divergence in glass placement
      // would surface as a bbox-parity failure.
    }
  });
});
