/**
 * Tests for wall slab-embedment.
 *
 * Walls extend EMBED into the floor slab below (bottom face hidden) and EMBED
 * into the floor slab above (top face hidden), eliminating coplanar z-fighting
 * at both the floor–wall seam and the wall–ceiling seam.  Key contracts:
 *
 *   1. wallBottom < slabTop       — wall's bottom Y is strictly below the slab's
 *                                    top surface (the coplanar face is gone).
 *   2. wallTop > elevation + wallHeight  — wall extends EMBED into the slab above.
 *   3. totalHeight == wallHeight + 2 * EMBED
 *   4. Assertions hold for both ground-level and elevated rooms.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DIMENSIONS } from '../src/constants.js';
import { buildFloorplanScene } from '../src/scene-builder.js';
import type { JsonExport } from '../src/types.js';

const WALL_HEIGHT = DIMENSIONS.WALL.HEIGHT;
const EMBED = DIMENSIONS.WALL.EMBED;
const EPS = 1e-6;

/**
 * Collect all wall meshes from a scene group hierarchy.
 * Wall meshes live in groups named `walls_<floorId>`.
 */
function collectWallMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const parent = obj.parent;
    if (
      obj instanceof THREE.Mesh &&
      parent &&
      'name' in parent &&
      (parent as THREE.Object3D).name.startsWith('walls_')
    ) {
      meshes.push(obj);
    }
  });
  return meshes;
}

/**
 * Collect all floor slab meshes from a scene group hierarchy.
 * Slab meshes live in groups named `floor_slabs_<floorId>`.
 */
function collectSlabMeshes(scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    const parent = obj.parent;
    if (
      obj instanceof THREE.Mesh &&
      parent &&
      'name' in parent &&
      (parent as THREE.Object3D).name.startsWith('floor_slabs_')
    ) {
      meshes.push(obj);
    }
  });
  return meshes;
}

/**
 * Compute the world-space Y extent of a mesh (bottom / top).
 * Uses the mesh world matrix + geometry bounding box.
 */
function worldYExtent(mesh: THREE.Mesh): { bottom: number; top: number } {
  mesh.updateWorldMatrix(true, false);
  mesh.geometry.computeBoundingBox();
  const local = mesh.geometry.boundingBox!;
  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);
  // For axis-aligned boxes the world Y is position.y + local Y bounds.
  return {
    bottom: worldPos.y + local.min.y,
    top: worldPos.y + local.max.y,
  };
}

function makeFloorplan(elevation = 0): JsonExport {
  return {
    floors: [
      {
        id: 'ground',
        index: 0,
        rooms: [
          {
            name: 'Room',
            x: 0,
            z: 0,
            width: 6,
            height: 6,
            elevation,
            walls: [
              { direction: 'top', type: 'solid' },
              { direction: 'bottom', type: 'solid' },
              { direction: 'left', type: 'solid' },
              { direction: 'right', type: 'solid' },
            ],
          },
        ],
      },
    ],
    config: {
      default_unit: 'm',
    },
    connections: [],
    styles: [],
  };
}

describe('wall slab-embedment — floor/wall coplanar face eliminated', () => {
  it('wall bottom is below slab top (ground level room)', () => {
    const { scene } = buildFloorplanScene(makeFloorplan(0));

    const wallMeshes = collectWallMeshes(scene);
    const slabMeshes = collectSlabMeshes(scene);

    expect(wallMeshes.length).toBeGreaterThan(0);
    expect(slabMeshes.length).toBeGreaterThan(0);

    const slabTop = slabMeshes.reduce((max, m) => Math.max(max, worldYExtent(m).top), -Infinity);

    for (const wallMesh of wallMeshes) {
      const { bottom } = worldYExtent(wallMesh);
      expect(bottom).toBeLessThan(slabTop - EPS);
    }
  });

  it('wall top equals elevation + wallHeight + EMBED (extends into ceiling slab)', () => {
    const elevation = 0;
    const { scene } = buildFloorplanScene(makeFloorplan(elevation));

    const wallMeshes = collectWallMeshes(scene);
    expect(wallMeshes.length).toBeGreaterThan(0);

    const expectedTop = elevation + WALL_HEIGHT + EMBED;

    for (const wallMesh of wallMeshes) {
      const { top } = worldYExtent(wallMesh);
      expect(top).toBeCloseTo(expectedTop, 4);
    }
  });

  it('wall is exactly wallHeight + 2 * EMBED tall', () => {
    const { scene } = buildFloorplanScene(makeFloorplan(0));
    const wallMeshes = collectWallMeshes(scene);
    expect(wallMeshes.length).toBeGreaterThan(0);

    for (const wallMesh of wallMeshes) {
      const { bottom, top } = worldYExtent(wallMesh);
      const actualHeight = top - bottom;
      expect(actualHeight).toBeCloseTo(WALL_HEIGHT + 2 * EMBED, 4);
    }
  });

  it('wall bottom equals elevation − EMBED (embedded into floor slab)', () => {
    const elevation = 0;
    const { scene } = buildFloorplanScene(makeFloorplan(elevation));
    const wallMeshes = collectWallMeshes(scene);

    for (const wallMesh of wallMeshes) {
      const { bottom } = worldYExtent(wallMesh);
      expect(bottom).toBeCloseTo(elevation - EMBED, 4);
    }
  });

  it('wall bottom is still above slab bottom (wall does not pass through slab)', () => {
    const { scene } = buildFloorplanScene(makeFloorplan(0));

    const wallMeshes = collectWallMeshes(scene);
    const slabMeshes = collectSlabMeshes(scene);

    const slabBottom = slabMeshes.reduce(
      (min, m) => Math.min(min, worldYExtent(m).bottom),
      Infinity,
    );

    for (const wallMesh of wallMeshes) {
      const { bottom } = worldYExtent(wallMesh);
      expect(bottom).toBeGreaterThan(slabBottom - EPS);
    }
  });

  it('same contracts hold for an elevated room (elevation = 4 m)', () => {
    const elevation = 4;
    const { scene } = buildFloorplanScene(makeFloorplan(elevation));

    const wallMeshes = collectWallMeshes(scene);
    expect(wallMeshes.length).toBeGreaterThan(0);

    for (const wallMesh of wallMeshes) {
      const { bottom, top } = worldYExtent(wallMesh);
      expect(top).toBeCloseTo(elevation + WALL_HEIGHT + EMBED, 4);
      expect(bottom).toBeCloseTo(elevation - EMBED, 4);
    }
  });
});
