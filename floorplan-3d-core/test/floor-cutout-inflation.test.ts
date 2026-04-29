/**
 * Tests for stair/lift CSG cutter inflation in generateRoomFloorSlabWithCSG.
 *
 * The cutter box that is subtracted from a floor slab must be slightly larger
 * than the stair/lift footprint so the cut edge does not sit exactly on the
 * stair's outer face.  Coplanar faces at that boundary would cause Z-fighting.
 *
 * We test the exported `computeCutterBox` helper (which encapsulates the
 * inflation arithmetic) directly — no WebGL or CSG evaluator is needed.
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { computeCutterBox, DIMENSIONS } from '../src/index.js';

const INFLATE = DIMENSIONS.GEOMETRY.CUTTER_INFLATE;

describe('computeCutterBox — cutter footprint inflation', () => {
  it('cutter width is stair width + 2 * CUTTER_INFLATE', () => {
    const stairWidth = 1.0;
    const stairDepth = 3.0;
    const penetration = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(stairWidth, 5, stairDepth),
    );

    const { w } = computeCutterBox(penetration);

    expect(w).toBeCloseTo(stairWidth + 2 * INFLATE, 8);
  });

  it('cutter depth is stair depth + 2 * CUTTER_INFLATE', () => {
    const stairWidth = 1.0;
    const stairDepth = 3.0;
    const penetration = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(stairWidth, 5, stairDepth),
    );

    const { d } = computeCutterBox(penetration);

    expect(d).toBeCloseTo(stairDepth + 2 * INFLATE, 8);
  });

  it('cutter is strictly larger than the stair footprint in both axes', () => {
    const penetration = new THREE.Box3(new THREE.Vector3(2, 0, 3), new THREE.Vector3(3, 5, 6));
    const rawW = penetration.max.x - penetration.min.x;
    const rawD = penetration.max.z - penetration.min.z;

    const { w, d } = computeCutterBox(penetration);

    expect(w).toBeGreaterThan(rawW);
    expect(d).toBeGreaterThan(rawD);
  });

  it('cutter centre matches penetration centre', () => {
    const penetration = new THREE.Box3(new THREE.Vector3(2, 0, 3), new THREE.Vector3(4, 5, 7));
    const expectedCx = 3; // (2 + 4) / 2
    const expectedCz = 5; // (3 + 7) / 2

    const { cx, cz } = computeCutterBox(penetration);

    expect(cx).toBeCloseTo(expectedCx, 8);
    expect(cz).toBeCloseTo(expectedCz, 8);
  });

  it('applies symmetric inflation (each side expanded by exactly CUTTER_INFLATE)', () => {
    const penetration = new THREE.Box3(new THREE.Vector3(10, 0, 20), new THREE.Vector3(11, 3, 23));

    const { w, d, cx, cz } = computeCutterBox(penetration);
    const rawW = penetration.max.x - penetration.min.x;
    const rawD = penetration.max.z - penetration.min.z;

    // Each side expanded by INFLATE; total expansion 2 * INFLATE
    expect(w - rawW).toBeCloseTo(2 * INFLATE, 8);
    expect(d - rawD).toBeCloseTo(2 * INFLATE, 8);

    // Centre unchanged by symmetric inflation
    expect(cx).toBeCloseTo(penetration.min.x + rawW / 2, 8);
    expect(cz).toBeCloseTo(penetration.min.z + rawD / 2, 8);
  });

  it('CUTTER_INFLATE constant is at least 0.5 mm and at most 5 mm', () => {
    // Sanity-check the constant is in the architecturally meaningful range.
    // Below 0.5 mm the inflation may not survive float arithmetic at scale;
    // above 5 mm the visual gap becomes perceptible.
    expect(INFLATE).toBeGreaterThanOrEqual(0.0005);
    expect(INFLATE).toBeLessThanOrEqual(0.005);
  });
});
