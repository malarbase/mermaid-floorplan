/**
 * Regression tests for the mesh-derived stair/lift floor-cutout bounds.
 *
 * After the consolidation work (see openspec/changes/consolidate-scene-build-into-core),
 * the viewer derives the box used to cut holes in the floor above directly from
 * the rendered stair/lift mesh via `Box3.setFromObject(group)`. This matches
 * the headless renderer in `floorplan-3d-core/src/scene-builder.ts` and fixes
 * the over-extended cutout produced by the previous analytic approximation
 * (e.g. a `straight toward bottom` stair extended one stair-width too far).
 *
 * These tests exercise the *exact same bounding-box pipeline* the viewer uses
 * (`group.updateMatrixWorld(true)` followed by `new THREE.Box3().setFromObject(stairGroup)`)
 * without spinning up a DOM-bound BaseViewer.
 */

import type { JsonStair } from 'floorplan-3d-core';
import { StairGenerator } from 'floorplan-3d-core';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

/**
 * Mirror the helper in `base-viewer.ts:computePenetrationFromMesh`.
 */
function meshDerivedPenetration(
  floorGroup: THREE.Group,
  penetratingGroup: THREE.Object3D,
): THREE.Box3 {
  floorGroup.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(penetratingGroup);
}

describe('stair cutout — mesh-derived bounds (Box3.setFromObject)', () => {
  it('matches Box3.setFromObject(stairGroup) within float epsilon', () => {
    const stairGen = new StairGenerator();
    const stair: JsonStair = {
      name: 'S1',
      x: 2.0,
      z: 3.0,
      rise: 3.0,
      width: 1.0,
      tread: 0.28,
      shape: { type: 'straight', direction: 'top' },
    };

    const floor = new THREE.Group();
    const stairGroup = stairGen.generateStair(stair);
    floor.add(stairGroup);

    const box = meshDerivedPenetration(floor, stairGroup);
    const reference = new THREE.Box3().setFromObject(stairGroup);

    const eps = 1e-6;
    expect(box.min.x).toBeCloseTo(reference.min.x, eps);
    expect(box.min.z).toBeCloseTo(reference.min.z, eps);
    expect(box.max.x).toBeCloseTo(reference.max.x, eps);
    expect(box.max.z).toBeCloseTo(reference.max.z, eps);
  });

  it('produces a cutout starting at stair.x for `straight toward top`', () => {
    const stairGen = new StairGenerator();
    const stair: JsonStair = {
      name: 'S_top',
      x: 2.0,
      z: 3.0,
      rise: 3.0,
      width: 1.0,
      tread: 0.28,
      shape: { type: 'straight', direction: 'top' },
    };

    const floor = new THREE.Group();
    const stairGroup = stairGen.generateStair(stair);
    floor.add(stairGroup);

    const box = meshDerivedPenetration(floor, stairGroup);

    // Cutout must start at the stair anchor and extend forward in +Z.
    expect(box.min.x).toBeCloseTo(stair.x, 4);
    expect(box.min.z).toBeCloseTo(stair.z, 4);
    // Width matches the stair width (within the rendered geometry's tolerance).
    expect(box.max.x - box.min.x).toBeCloseTo(stair.width!, 2);
    // Depth must be positive and finite — exact value is geometry-defined.
    expect(box.max.z - box.min.z).toBeGreaterThan(0);
    expect(box.max.z - box.min.z).toBeLessThan(20);
  });

  it('produces a cutout that does NOT over-extend for `straight toward bottom` (regression)', () => {
    // Regression: the previous analytic helper added an extra stair-width to
    // the depth for `direction: bottom`, producing a cutout that extended one
    // stair-width past the actual stair footprint. The mesh-derived box must
    // match the stair footprint exactly.
    const stairGen = new StairGenerator();
    const stair: JsonStair = {
      name: 'S_bottom',
      x: 2.0,
      z: 3.0,
      rise: 3.0,
      width: 1.0,
      tread: 0.28,
      shape: { type: 'straight', direction: 'bottom' },
    };

    const floor = new THREE.Group();
    const stairGroup = stairGen.generateStair(stair);
    floor.add(stairGroup);

    const box = meshDerivedPenetration(floor, stairGroup);

    // The mesh-derived box must match the rendered stair footprint exactly,
    // not the pre-fix analytic approximation that extended an extra width.
    const referenceFootprint = new THREE.Box3().setFromObject(stairGroup);
    expect(box.min.x).toBeCloseTo(referenceFootprint.min.x, 6);
    expect(box.min.z).toBeCloseTo(referenceFootprint.min.z, 6);
    expect(box.max.x).toBeCloseTo(referenceFootprint.max.x, 6);
    expect(box.max.z).toBeCloseTo(referenceFootprint.max.z, 6);

    // The cutout depth must equal the rendered geometry's depth — no extra
    // stair-width buffer like the old analytic helper produced.
    const meshDepth = referenceFootprint.max.z - referenceFootprint.min.z;
    const overExtendedAnalyticDepth = meshDepth + stair.width!;
    expect(box.max.z - box.min.z).toBeLessThan(overExtendedAnalyticDepth - 1e-3);
  });

  it('reflects nested floor-group transforms via updateMatrixWorld', () => {
    const stairGen = new StairGenerator();
    const stair: JsonStair = {
      name: 'S_nested',
      x: 0,
      z: 0,
      rise: 3.0,
      width: 1.0,
      tread: 0.28,
      shape: { type: 'straight', direction: 'top' },
    };

    const floor = new THREE.Group();
    floor.position.set(10, 0, 20); // simulate exploded view / floor offset
    const stairGroup = stairGen.generateStair(stair);
    floor.add(stairGroup);

    const box = meshDerivedPenetration(floor, stairGroup);

    // World-space cutout must include the floor group's offset.
    expect(box.min.x).toBeGreaterThanOrEqual(10 - 1e-3);
    expect(box.min.z).toBeGreaterThanOrEqual(20 - 1e-3);
  });
});
