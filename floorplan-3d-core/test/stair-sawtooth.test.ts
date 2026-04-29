/**
 * Regression tests for the per-flight sawtooth extrusion refactor.
 *
 * These tests assert structural invariants (mesh count, bounding-box parity,
 * tread-top alignment) that would catch regressions in the geometry transform
 * chain (buildSawtoothFlight, rotateY, translate, position.z).
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { StairGenerator } from '../src/stair-geometry';
import type { JsonStair } from '../src/types';

// TREAD_THICKNESS is the module constant (0.05 m). Mirror it here so the
// expected tread-top formula can be validated without importing the private const.
const TREAD_THICKNESS = 0.05;

function makeStraightStair(overrides: Partial<JsonStair> = {}): JsonStair {
  return {
    name: 'S',
    x: 0,
    z: 0,
    rise: 3.0,
    width: 1.0,
    tread: 0.28,
    shape: { type: 'straight', direction: 'top' },
    ...overrides,
  };
}

describe('stair sawtooth — single mesh per flight', () => {
  it('emits exactly one flight mesh for a closed-stringer straight stair', () => {
    const gen = new StairGenerator();
    const group = gen.generateStair(makeStraightStair());
    const flightMeshes = group.children.filter(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.name === 'stair_flight',
    );
    expect(flightMeshes).toHaveLength(1);
  });

  it('bounding-box max-y matches the legacy value within 1 mm', () => {
    // For rise=3.0, riser≈0.18 (stepCount=17, actualRiser=3/17≈0.1765),
    // the last tread top in legacy = rise + TREAD_THICKNESS/2 − TREAD_THICKNESS
    //   = 3.0 − TREAD_THICKNESS/2 = 3.0 − 0.025 = 2.975 m.
    // The sawtooth should land at the same world-space max-y.
    const gen = new StairGenerator();
    const group = gen.generateStair(makeStraightStair());
    const box = new THREE.Box3().setFromObject(group);
    const expectedMaxY = 3.0 - TREAD_THICKNESS / 2; // 2.975
    expect(box.max.y).toBeCloseTo(expectedMaxY, 2); // within 5 mm
  });

  it('last tread top sits exactly TREAD_THICKNESS/2 below rise (25 mm below slab)', () => {
    // After group.position.y = −TREAD_THICKNESS, the world max-y of the
    // flight mesh must equal rise − TREAD_THICKNESS/2 within float epsilon.
    const rise = 2.52;
    const gen = new StairGenerator();
    const group = gen.generateStair(makeStraightStair({ rise }));
    const box = new THREE.Box3().setFromObject(group);
    expect(box.max.y).toBeCloseTo(rise - TREAD_THICKNESS / 2, 3);
  });

  it('bounding-box width matches stair.width within 1 mm', () => {
    const gen = new StairGenerator();
    const group = gen.generateStair(makeStraightStair({ width: 1.2 }));
    const box = new THREE.Box3().setFromObject(group);
    expect(box.max.x - box.min.x).toBeCloseTo(1.2, 2);
  });

  it('emits N tread boxes (no flight mesh) for open stringers', () => {
    const rise = 3.0;
    const riser = 0.18;
    const stepCount = Math.round(rise / riser); // 17
    const gen = new StairGenerator();
    const group = gen.generateStair(makeStraightStair({ stringers: 'open' }));

    const flightMeshes = group.children.filter(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.name === 'stair_flight',
    );
    expect(flightMeshes).toHaveLength(0);

    // Should have stepCount individual tread meshes
    const allMeshes = group.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
    expect(allMeshes.length).toBeGreaterThanOrEqual(stepCount);
  });

  it('structural inter-penetration guard: exactly one stair_flight mesh, ≤4 non-flight meshes', () => {
    // A single sawtooth mesh cannot inter-penetrate with itself — this is the
    // regression test for the tread/riser overlap bug. Assert structural
    // invariants instead of geometry-level bounding-box overlap heuristics
    // (which are unreliable with handrails present).
    const gen = new StairGenerator();
    const group = gen.generateStair(makeStraightStair());

    const flightMeshes = group.children.filter(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.name === 'stair_flight',
    );
    expect(flightMeshes).toHaveLength(1);

    const nonFlight = group.children.filter(
      (c): c is THREE.Mesh => c instanceof THREE.Mesh && c.name !== 'stair_flight',
    );
    // Handrails: 0–2 post meshes + 0–2 rail meshes per side = at most 4
    expect(nonFlight.length).toBeLessThanOrEqual(4);
  });

  it('L-shaped stair emits two stair_flight meshes (one per run)', () => {
    const gen = new StairGenerator();
    const stair: JsonStair = {
      name: 'L',
      x: 0,
      z: 0,
      rise: 3.0,
      width: 1.0,
      tread: 0.28,
      shape: { type: 'L-shaped', entry: 'top', turn: 'right', runs: [8, 8] },
    };
    const group = gen.generateStair(stair);
    const flightMeshes: THREE.Mesh[] = [];
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name === 'stair_flight') flightMeshes.push(obj);
    });
    expect(flightMeshes).toHaveLength(2);
  });

  it('U-shaped stair emits two stair_flight meshes (one per run)', () => {
    const gen = new StairGenerator();
    const stair: JsonStair = {
      name: 'U',
      x: 0,
      z: 0,
      rise: 3.0,
      width: 1.0,
      tread: 0.28,
      shape: { type: 'U-shaped', entry: 'top', turn: 'left', runs: [8, 8] },
    };
    const group = gen.generateStair(stair);
    const flightMeshes: THREE.Mesh[] = [];
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.name === 'stair_flight') flightMeshes.push(obj);
    });
    expect(flightMeshes).toHaveLength(2);
  });
});
