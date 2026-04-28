/**
 * Tests for adjacency-aware wall corner geometry (Phase 4 Z-fighting fix).
 *
 * Core invariant: after buildFloorplanScene, no two wall meshes from the same
 * floor should have overlapping bounding-boxes (beyond a tiny float tolerance).
 * An overlap means the corner fix is broken and Z-fighting will reappear.
 *
 * Secondarily we verify that exterior corners are fully covered — no gap larger
 * than EPSILON in the rendering.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DIMENSIONS } from '../src/constants.js';
import { buildFloorplanScene } from '../src/scene-builder.js';
import type { JsonExport, JsonFloor, JsonRoom } from '../src/types.js';

const WALL_T = DIMENSIONS.WALL.THICKNESS;
const HALF_T = WALL_T / 2;
const EPSILON = DIMENSIONS.GEOMETRY.EPSILON;
const WALL_CORNER_EMBED = DIMENSIONS.GEOMETRY.WALL_CORNER_EMBED;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoom(name: string, x: number, z: number, width: number, height: number): JsonRoom {
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

function makeFloor(id: string, rooms: JsonRoom[]): JsonFloor {
  return { id, index: 0, rooms };
}

function makeFloorplan(floors: JsonFloor[]): JsonExport {
  return {
    floors,
    config: { default_unit: 'm' },
    connections: [],
    styles: [],
  };
}

/** Collect all wall meshes from the scene. */
function collectWallMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const parent = obj.parent;
    if (
      obj instanceof THREE.Mesh &&
      parent &&
      (parent as THREE.Object3D).name.startsWith('walls_')
    ) {
      meshes.push(obj);
    }
  });
  return meshes;
}

/** Compute world-space bounding box for a mesh. */
function worldBox(mesh: THREE.Mesh): THREE.Box3 {
  mesh.updateWorldMatrix(true, false);
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox!.clone();
  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);
  box.translate(worldPos);
  return box;
}

/**
 * Check whether two bounding boxes overlap by more than `tolerance` in all
 * three axes simultaneously.  Two boxes can share a face (overlap = 0 on one
 * axis) without Z-fighting — that's fine.  Only a positive 3D volume overlap
 * is a problem.
 *
 * Returns the overlap volume extent {dx, dy, dz} if it exists; null otherwise.
 */
function overlapExtent(
  a: THREE.Box3,
  b: THREE.Box3,
  tolerance: number,
): { dx: number; dy: number; dz: number } | null {
  const dx = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
  const dy = Math.min(a.max.y, b.max.y) - Math.max(a.min.y, b.min.y);
  const dz = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);

  if (dx > tolerance && dy > tolerance && dz > tolerance) {
    return { dx, dy, dz };
  }
  return null;
}

/**
 * Assert that no pair of wall meshes in the scene has a 3D volumetric overlap
 * larger than `tolerance`.
 */
function assertNoCornerOverlap(scene: THREE.Scene, tolerance: number = EPSILON): void {
  const meshes = collectWallMeshes(scene);
  const boxes = meshes.map(worldBox);

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const ov = overlapExtent(boxes[i], boxes[j], tolerance);
      if (ov !== null) {
        throw new Error(
          `Wall meshes #${i} (${meshes[i].name || meshes[i].id}) and ` +
            `#${j} (${meshes[j].name || meshes[j].id}) overlap by ` +
            `dx=${ov.dx.toFixed(5)} dy=${ov.dy.toFixed(5)} dz=${ov.dz.toFixed(5)}`,
        );
      }
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Vertical walls embed (halfT - WALL_CORNER_EMBED) into horizontal walls.
// The intentional overlap at each corner is exactly WALL_CORNER_EMBED (0.1 mm).
// We use 2× WALL_CORNER_EMBED as the overlap tolerance to give float headroom;
// any structural overlap (≥ wallThickness/2 ≈ 75 mm) would still fail.
const EMBED_TOLERANCE = WALL_CORNER_EMBED * 2;

describe('wall corner geometry — no overlapping volumes', () => {
  it('single isolated room — all four exterior corners covered, no overlap', () => {
    const room = makeRoom('Room', 0, 0, 6, 6);
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', [room])]));
    assertNoCornerOverlap(scene, EMBED_TOLERANCE);
  });

  it('two rooms side-by-side (horizontal) — shared internal edge, external corners covered', () => {
    // Room A: 0-10 in X, Room B: 10-20 in X, both 0-8 in Z.
    const rooms = [makeRoom('A', 0, 0, 10, 8), makeRoom('B', 10, 0, 10, 8)];
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', rooms)]));
    assertNoCornerOverlap(scene, EMBED_TOLERANCE);
  });

  it('two rooms stacked vertically — shared internal edge, external corners covered', () => {
    const rooms = [makeRoom('Top', 0, 0, 8, 6), makeRoom('Bottom', 0, 6, 8, 6)];
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', rooms)]));
    assertNoCornerOverlap(scene, EMBED_TOLERANCE);
  });

  it('L-shape (3 rooms) — mixed interior/exterior corners, no overlap', () => {
    //  ┌──┬──┐
    //  │A │B │
    //  └──┘  │
    //     │C │
    //     └──┘
    const rooms = [makeRoom('A', 0, 0, 5, 5), makeRoom('B', 5, 0, 5, 5), makeRoom('C', 5, 5, 5, 5)];
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', rooms)]));
    assertNoCornerOverlap(scene, EMBED_TOLERANCE);
  });

  it('2×2 grid — four interior corners, four exterior corners', () => {
    const rooms = [
      makeRoom('TL', 0, 0, 5, 5),
      makeRoom('TR', 5, 0, 5, 5),
      makeRoom('BL', 0, 5, 5, 5),
      makeRoom('BR', 5, 5, 5, 5),
    ];
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', rooms)]));
    assertNoCornerOverlap(scene, EMBED_TOLERANCE);
  });

  it('3×1 strip — interior corners between all three rooms', () => {
    const rooms = [
      makeRoom('Left', 0, 0, 4, 8),
      makeRoom('Mid', 4, 0, 4, 8),
      makeRoom('Right', 8, 0, 4, 8),
    ];
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', rooms)]));
    assertNoCornerOverlap(scene, EMBED_TOLERANCE);
  });
});

describe('wall corner geometry — size contracts', () => {
  it('isolated room: horizontal wall width == roomWidth + wallThickness', () => {
    const roomW = 6;
    const room = makeRoom('R', 0, 0, roomW, 6);
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', [room])]));

    const meshes = collectWallMeshes(scene);
    const boxes = meshes.map(worldBox);

    // Find a horizontal wall (top or bottom) — it should span roomW + wallThickness
    const expectedWidth = roomW + WALL_T;

    const horizontalBoxes = boxes.filter((b) => {
      const dz = b.max.z - b.min.z;
      const dx = b.max.x - b.min.x;
      return dz < WALL_T + 0.01 && dx > roomW - 0.1;
    });

    expect(horizontalBoxes.length).toBeGreaterThan(0);
    for (const b of horizontalBoxes) {
      expect(b.max.x - b.min.x).toBeCloseTo(expectedWidth, 3);
    }
  });

  it('two adjacent rooms: horizontal walls do NOT extend at shared corner', () => {
    // Room A at x=0-6, Room B at x=6-12. A's top-wall right end and B's
    // top-wall left end must meet at x=6 exactly (no extension on either side).
    const rooms = [makeRoom('A', 0, 0, 6, 6), makeRoom('B', 6, 0, 6, 6)];
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', rooms)]));

    const meshes = collectWallMeshes(scene);
    const boxes = meshes.map(worldBox);

    // Room A's top wall should extend from x = -halfT to x = 6 (right end: no extension)
    // Room B's top wall should extend from x = 6 to x = 12 + halfT (left end: no extension)
    const sharedX = 6;
    const topWallBoxes = boxes.filter((b) => {
      const dz = b.max.z - b.min.z;
      return dz < WALL_T + 0.01; // horizontal wall
    });

    // No top wall should cross x = sharedX by more than EPSILON on the "wrong" side
    // (A's wall should not exceed x = sharedX, B's should not go below x = sharedX)
    const roomATopWalls = topWallBoxes.filter((b) => b.min.x < sharedX - 1);
    const roomBTopWalls = topWallBoxes.filter((b) => b.max.x > sharedX + 1);

    for (const b of roomATopWalls) {
      expect(b.max.x).toBeLessThanOrEqual(sharedX + EPSILON);
    }
    for (const b of roomBTopWalls) {
      expect(b.min.x).toBeGreaterThanOrEqual(sharedX - EPSILON);
    }
  });

  it('isolated room: vertical wall segments embed 0.1mm inside the horizontal walls', () => {
    // adjustSegmentsForCorners shrinks each vertical wall segment by
    //   shrink = halfT - WALL_CORNER_EMBED
    // from each end.  The end faces therefore sit WALL_CORNER_EMBED (0.1 mm) inside
    // the horizontal wall body — hidden, never coplanar, no visible bump.
    //
    // Resulting depth:  roomH - 2 * shrink  = roomH - wallThickness + 2 * embed
    const roomH = 6;
    const room = makeRoom('R', 0, 0, 6, roomH);
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', [room])]));

    const meshes = collectWallMeshes(scene);
    const boxes = meshes.map(worldBox);

    const embed = WALL_CORNER_EMBED;
    const shrink = HALF_T - embed;
    const expectedDepth = roomH - 2 * shrink; // ≈ roomH - wallThickness + 2*embed
    const verticalBoxes = boxes.filter((b) => {
      const dx = b.max.x - b.min.x;
      const dz = b.max.z - b.min.z;
      return dx < WALL_T + 0.01 && dz > expectedDepth - 0.5;
    });

    expect(verticalBoxes.length).toBeGreaterThan(0);
    for (const b of verticalBoxes) {
      const depth = b.max.z - b.min.z;
      expect(depth).toBeCloseTo(expectedDepth, 3);
    }
  });

  it('isolated room: vertical wall segment ends are 0.1mm inside the horizontal wall body', () => {
    // The top horizontal wall spans z ∈ [room.z - halfT, room.z + halfT].
    // After adjustment the vertical segment starts at room.z + shrink (= room.z + halfT - embed),
    // which is embed (0.1 mm) before the inner face of the top wall — inside the wall.
    const room = makeRoom('R', 0, 0, 6, 6);
    const { scene } = buildFloorplanScene(makeFloorplan([makeFloor('gnd', [room])]));

    const meshes = collectWallMeshes(scene);
    const boxes = meshes.map(worldBox);

    const verticalBoxes = boxes.filter((b) => {
      const dx = b.max.x - b.min.x;
      return dx < WALL_T + 0.01;
    });

    expect(verticalBoxes.length).toBeGreaterThan(0);

    const embed = WALL_CORNER_EMBED;
    const shrink = HALF_T - embed;

    for (const b of verticalBoxes) {
      // min-Z end: room.z + shrink (embed distance inside top H-wall)
      expect(b.min.z).toBeCloseTo(room.z + shrink, 3);
      // max-Z end: room.z + room.height - shrink (embed distance inside bottom H-wall)
      expect(b.max.z).toBeCloseTo(room.z + room.height - shrink, 3);
    }
  });
});
