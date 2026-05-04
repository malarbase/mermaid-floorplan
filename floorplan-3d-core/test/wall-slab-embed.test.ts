/**
 * Tests for wall slab-embed geometry
 *
 * Asymmetric wall span:
 *   bottom = elevation - EMBED            (extends DOWN into slab below to bury
 *                                          the floor↔wall coplanar seam)
 *   top    = elevation + wallHeight       (sits a CEILING_GAP-sized air gap
 *            - CEILING_GAP                 BELOW the ceiling slab so the two
 *                                          solids never overlap volumetrically;
 *                                          overlap there causes shimmer at
 *                                          orbit angles, even at small EMBED.)
 */

import { beforeAll, describe, expect, test } from 'vitest';
import { DIMENSIONS } from '../src/constants';
import { initCSG } from '../src/csg-manager';
import { buildFloorplanScene } from '../src/scene-builder';
import type { JsonExport, JsonFloor, JsonRoom } from '../src/types';
import { createWallSegmentGeometry } from '../src/wall-builder';
import type { WallSegment } from '../src/wall-ownership';

// Both engines build with CSG when available — initialise here so the network
// branch's CSG-dependent code path is exercised when the integration tests
// below run under `wallEngine: 'network'`. The unit tests on
// `createWallSegmentGeometry` don't depend on CSG, but the `beforeAll` cost
// is negligible and keeps the file's setup uniform.
beforeAll(async () => {
  await initCSG();
});

// Engines exercised by the scene-builder integration tests below. Wrapping in
// `describe.each` per Phase 5.3 of the wall-network rebuild plan
// (`.cursor/plans/wall_network_rebuild_2e4b6f09.plan.md` §5.3): the embed
// contract must hold under BOTH engines because both share the same
// `WALL.EMBED` / `WALL.CEILING_GAP` constants and Y-span math.
const ENGINES = ['legacy', 'network'] as const;
type WallEngine = (typeof ENGINES)[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSegment(startPos: number, endPos: number): WallSegment {
  return {
    startPos,
    endPos,
    ownerStyle: undefined,
    adjacentStyle: undefined,
    hasAdjacentRoom: false,
  };
}

function makeRoom(
  name: string,
  x: number,
  z: number,
  width: number,
  height: number,
  elevation = 0,
  roomHeight?: number,
): JsonRoom {
  return {
    name,
    x,
    z,
    width,
    height,
    elevation,
    roomHeight,
    walls: [
      { direction: 'top', type: 'solid' },
      { direction: 'bottom', type: 'solid' },
      { direction: 'left', type: 'solid' },
      { direction: 'right', type: 'solid' },
    ],
  };
}

function makeFloor(id: string, index: number, rooms: JsonRoom[]): JsonFloor {
  return { id, index, rooms };
}

function makeTwoFloorPlan(wallHeight: number): JsonExport {
  return {
    floors: [
      makeFloor('ground', 0, [makeRoom('room_g', 0, 0, 6, 6)]),
      makeFloor('first', 1, [makeRoom('room_f', 0, 0, 6, 6)]),
    ],
    connections: [],
    config: { default_height: wallHeight },
  };
}

// ---------------------------------------------------------------------------
// Unit tests — createWallSegmentGeometry
// ---------------------------------------------------------------------------

describe('createWallSegmentGeometry — asymmetric span (down-embed + ceiling-gap)', () => {
  const E = DIMENSIONS.WALL.EMBED;
  const G = DIMENSIONS.WALL.CEILING_GAP;
  // Total geometry height = wallHeight + EMBED (down) - CEILING_GAP (up shy)
  const SPAN_DELTA = E - G;

  test('horizontal wall geometry height = wallHeight + EMBED - CEILING_GAP', () => {
    const seg = makeSegment(0, 5);
    const wallHeight = DIMENSIONS.WALL.HEIGHT;
    const geom = createWallSegmentGeometry(seg, DIMENSIONS.WALL.THICKNESS, wallHeight, false);
    geom.computeBoundingBox();
    const { boundingBox: box } = geom;

    expect(box).not.toBeNull();
    const actualHeight = box!.max.y - box!.min.y;
    expect(actualHeight).toBeCloseTo(wallHeight + SPAN_DELTA, 6);
  });

  test('vertical wall geometry height = wallHeight + EMBED - CEILING_GAP', () => {
    const seg = makeSegment(0, 4);
    const wallHeight = 2.8;
    const geom = createWallSegmentGeometry(seg, DIMENSIONS.WALL.THICKNESS, wallHeight, true);
    geom.computeBoundingBox();
    const { boundingBox: box } = geom;

    expect(box).not.toBeNull();
    const actualHeight = box!.max.y - box!.min.y;
    expect(actualHeight).toBeCloseTo(wallHeight + SPAN_DELTA, 6);
  });

  test('geometry is centered at origin in local space', () => {
    const wallHeight = DIMENSIONS.WALL.HEIGHT;
    const seg = makeSegment(0, 3);
    const geom = createWallSegmentGeometry(seg, DIMENSIONS.WALL.THICKNESS, wallHeight, false);
    geom.computeBoundingBox();
    const box = geom.boundingBox!;

    expect(box.max.y).toBeCloseTo((wallHeight + SPAN_DELTA) / 2, 6);
    expect(box.min.y).toBeCloseTo(-(wallHeight + SPAN_DELTA) / 2, 6);
  });

  test('wall never pokes through slab — EMBED < FLOOR.THICKNESS', () => {
    expect(DIMENSIONS.WALL.EMBED).toBeLessThan(DIMENSIONS.FLOOR.THICKNESS);
    expect(DIMENSIONS.WALL.EMBED).toBeGreaterThan(0);
  });

  test('CEILING_GAP is small enough to be invisible but > 0', () => {
    expect(DIMENSIONS.WALL.CEILING_GAP).toBeGreaterThan(0);
    expect(DIMENSIONS.WALL.CEILING_GAP).toBeLessThan(0.05);
  });

  test('span scales with custom wallHeight', () => {
    const customHeight = 4.0;
    const seg = makeSegment(0, 5);
    const geom = createWallSegmentGeometry(seg, DIMENSIONS.WALL.THICKNESS, customHeight, false);
    geom.computeBoundingBox();
    const box = geom.boundingBox!;

    expect(box.max.y - box.min.y).toBeCloseTo(customHeight + SPAN_DELTA, 6);
  });
});

// ---------------------------------------------------------------------------
// Integration tests — scene builder wall mesh Y-extent
// ---------------------------------------------------------------------------

describe.each(
  ENGINES,
)('scene builder — wall meshes embed into slabs (%s engine)', (engine: WallEngine) => {
  const E = DIMENSIONS.WALL.EMBED;
  const G = DIMENSIONS.WALL.CEILING_GAP;

  /**
   * Collect all wall meshes from a scene along with their floor group Y offsets,
   * then verify each mesh's bounding box spans [elevation - E, elevation + wallHeight + E]
   * in world space.
   *
   * Engine-agnostic Y math (Phase 5.3): the formula
   *   worldY = yOffset + mesh.position.y + localBox.min/max.y
   * holds for BOTH engines because:
   *   - Legacy: mesh.geometry is local-space, centred at origin with
   *     y-extent ±(wallHeight+E-G)/2; mesh.position.y carries the per-segment
   *     vertical centre. Adding the floor-group `position.y` (yOffset) gives
   *     world Y.
   *   - Network CSG: after the CSG subtraction the mesh's matrix is identity
   *     and mesh.geometry vertices are in floor-local world space. So
   *     mesh.position.y is 0 and localBox.{min,max}.y already encode the
   *     network's floor-local bottom/top. Adding yOffset still gives world Y.
   *   - Network no-CSG: mesh keeps its local-space extrude geometry and is
   *     placed via mesh.position.y = midY (same shape as legacy). Same math.
   * `setFromObject` is NOT used here because `onWallMesh` fires BEFORE the
   * walls group is attached to the floor group, so the mesh's parent chain
   * doesn't yet include the `position.y = yOffset` floor group when the hook
   * runs.
   */
  function collectWallWorldBounds(plan: JsonExport): Array<{
    worldMinY: number;
    worldMaxY: number;
    elevation: number;
    wallHeight: number;
  }> {
    const floorGroupY = new Map<string, number>();
    const results: Array<{
      worldMinY: number;
      worldMaxY: number;
      elevation: number;
      wallHeight: number;
    }> = [];

    buildFloorplanScene(plan, {
      wallEngine: engine,
      onFloorGroup(group, floor) {
        floorGroupY.set(floor.id, group.position.y);
      },
      onWallMesh(mesh, _wall, room, floor) {
        const yOffset = floorGroupY.get(floor.id) ?? 0;
        const elevation = room.elevation ?? 0;
        const wallHeight =
          _wall.wallHeight ??
          room.roomHeight ??
          plan.config?.default_height ??
          DIMENSIONS.WALL.HEIGHT;

        mesh.geometry.computeBoundingBox();
        const localBox = mesh.geometry.boundingBox!;

        const meshParentY = mesh.position.y;
        const worldMinY = yOffset + meshParentY + localBox.min.y;
        const worldMaxY = yOffset + meshParentY + localBox.max.y;

        results.push({ worldMinY, worldMaxY, elevation: yOffset + elevation, wallHeight });
      },
    });

    return results;
  }

  test('every wall mesh extends EMBED below its floor slab top', () => {
    const plan = makeTwoFloorPlan(DIMENSIONS.WALL.HEIGHT);
    const bounds = collectWallWorldBounds(plan);

    expect(bounds.length).toBeGreaterThan(0);
    for (const { worldMinY, elevation } of bounds) {
      // Wall bottom must be elevation - EMBED (embedded into slab)
      expect(worldMinY).toBeCloseTo(elevation - E, 5);
    }
  });

  test('every wall mesh top sits CEILING_GAP below elevation + wallHeight', () => {
    const plan = makeTwoFloorPlan(DIMENSIONS.WALL.HEIGHT);
    const bounds = collectWallWorldBounds(plan);

    expect(bounds.length).toBeGreaterThan(0);
    for (const { worldMaxY, elevation, wallHeight } of bounds) {
      // Wall top is shy of the ceiling slab by CEILING_GAP, ensuring no
      // volumetric overlap with the slab above.
      expect(worldMaxY).toBeCloseTo(elevation + wallHeight - G, 5);
    }
  });

  test('visible wall span (excluding embed and gap) equals configured wallHeight', () => {
    const customHeight = 3.0;
    const plan = makeTwoFloorPlan(customHeight);
    const bounds = collectWallWorldBounds(plan);

    expect(bounds.length).toBeGreaterThan(0);
    for (const { worldMinY, worldMaxY, wallHeight } of bounds) {
      const visibleHeight = worldMaxY - worldMinY - E + G;
      expect(visibleHeight).toBeCloseTo(wallHeight, 5);
    }
  });

  test('embed survives on elevated rooms (room.elevation != 0)', () => {
    const plan: JsonExport = {
      floors: [makeFloor('ground', 0, [makeRoom('raised', 0, 0, 5, 5, 0.5)])],
      connections: [],
    };
    const bounds = collectWallWorldBounds(plan);

    expect(bounds.length).toBeGreaterThan(0);
    for (const { worldMinY, worldMaxY, elevation, wallHeight } of bounds) {
      expect(worldMinY).toBeCloseTo(elevation - E, 5);
      expect(worldMaxY).toBeCloseTo(elevation + wallHeight - G, 5);
    }
  });
});
