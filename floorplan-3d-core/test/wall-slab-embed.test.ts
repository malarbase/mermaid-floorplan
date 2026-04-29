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

import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { DIMENSIONS } from '../src/constants';
import { buildFloorplanScene } from '../src/scene-builder';
import type { JsonExport, JsonFloor, JsonRoom } from '../src/types';
import { createWallSegmentGeometry } from '../src/wall-builder';
import type { WallSegment } from '../src/wall-ownership';

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

describe('scene builder — wall meshes embed into slabs', () => {
  const E = DIMENSIONS.WALL.EMBED;
  const G = DIMENSIONS.WALL.CEILING_GAP;

  /**
   * Collect all wall meshes from a scene along with their floor group Y offsets,
   * then verify each mesh's bounding box spans [elevation - E, elevation + wallHeight + E]
   * in world space.
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

        // The mesh center in parent coords is elevation + wallHeight/2.
        // World Y = yOffset + mesh.position.y + local offset.
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
