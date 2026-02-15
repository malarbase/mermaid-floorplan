/**
 * Tests for camera utilities
 */

import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { computeSceneBounds, frameBoundingBox, setupCamera } from '../src/camera-utils';
import type { Render3DOptions, SceneBounds } from '../src/types';

/**
 * Create a simple scene with a box for testing
 */
function createTestScene(
  size: { x: number; y: number; z: number } = { x: 10, y: 5, z: 10 },
): THREE.Scene {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geometry, material);
  // Center the box at origin
  mesh.position.set(size.x / 2, size.y / 2, size.z / 2);
  scene.add(mesh);
  return scene;
}

describe('computeSceneBounds', () => {
  test('should compute bounds for a simple scene', () => {
    const scene = createTestScene({ x: 10, y: 5, z: 10 });
    const bounds = computeSceneBounds(scene);

    expect(bounds.min.x).toBeCloseTo(0);
    expect(bounds.min.y).toBeCloseTo(0);
    expect(bounds.min.z).toBeCloseTo(0);
    expect(bounds.max.x).toBeCloseTo(10);
    expect(bounds.max.y).toBeCloseTo(5);
    expect(bounds.max.z).toBeCloseTo(10);
  });

  test('should compute center correctly', () => {
    const scene = createTestScene({ x: 10, y: 10, z: 10 });
    const bounds = computeSceneBounds(scene);

    expect(bounds.center.x).toBeCloseTo(5);
    expect(bounds.center.y).toBeCloseTo(5);
    expect(bounds.center.z).toBeCloseTo(5);
  });

  test('should compute size correctly', () => {
    const scene = createTestScene({ x: 20, y: 10, z: 15 });
    const bounds = computeSceneBounds(scene);

    expect(bounds.size.x).toBeCloseTo(20);
    expect(bounds.size.y).toBeCloseTo(10);
    expect(bounds.size.z).toBeCloseTo(15);
  });

  test('should handle empty scene with default bounds', () => {
    const scene = new THREE.Scene();
    const bounds = computeSceneBounds(scene);

    // Empty scenes should get default bounds
    expect(bounds.size.x).toBeGreaterThan(0);
    expect(bounds.size.y).toBeGreaterThan(0);
    expect(bounds.size.z).toBeGreaterThan(0);
  });
});

describe('setupCamera', () => {
  const testBounds: SceneBounds = {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 10, y: 5, z: 10 },
    center: { x: 5, y: 2.5, z: 5 },
    size: { x: 10, y: 5, z: 10 },
  };

  describe('isometric camera', () => {
    test('should create orthographic camera for isometric view', () => {
      const options: Render3DOptions = { projection: 'isometric' };
      const result = setupCamera(options, testBounds, 16 / 9);

      expect(result.camera).toBeInstanceOf(THREE.OrthographicCamera);
    });

    test('should use isometric by default', () => {
      const options: Render3DOptions = {};
      const result = setupCamera(options, testBounds, 16 / 9);

      expect(result.camera).toBeInstanceOf(THREE.OrthographicCamera);
    });

    test('should position camera above and to the side', () => {
      const options: Render3DOptions = { projection: 'isometric' };
      const result = setupCamera(options, testBounds, 1);

      // Camera should be positioned above the scene
      expect(result.position[1]).toBeGreaterThan(testBounds.center.y);
      // Camera should be positioned away from center
      expect(result.position[0]).toBeGreaterThan(testBounds.center.x);
      expect(result.position[2]).toBeGreaterThan(testBounds.center.z);
    });

    test('should look at scene center', () => {
      const options: Render3DOptions = { projection: 'isometric' };
      const result = setupCamera(options, testBounds, 1);

      expect(result.target[0]).toBeCloseTo(testBounds.center.x);
      expect(result.target[1]).toBeCloseTo(testBounds.center.y);
      expect(result.target[2]).toBeCloseTo(testBounds.center.z);
    });
  });

  describe('perspective camera', () => {
    test('should create perspective camera', () => {
      const options: Render3DOptions = { projection: 'perspective' };
      const result = setupCamera(options, testBounds, 16 / 9);

      expect(result.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    });

    test('should use default FOV of 50', () => {
      const options: Render3DOptions = { projection: 'perspective' };
      const result = setupCamera(options, testBounds, 1);

      expect(result.fov).toBe(50);
    });

    test('should use custom FOV when specified', () => {
      const options: Render3DOptions = { projection: 'perspective', fov: 75 };
      const result = setupCamera(options, testBounds, 1);

      expect(result.fov).toBe(75);
      expect((result.camera as THREE.PerspectiveCamera).fov).toBe(75);
    });

    test('should use custom camera position when specified', () => {
      const customPos: [number, number, number] = [100, 50, 100];
      const options: Render3DOptions = {
        projection: 'perspective',
        cameraPosition: customPos,
      };
      const result = setupCamera(options, testBounds, 1);

      expect(result.position).toEqual(customPos);
      expect(result.camera.position.x).toBe(100);
      expect(result.camera.position.y).toBe(50);
      expect(result.camera.position.z).toBe(100);
    });

    test('should use custom camera target when specified', () => {
      const customTarget: [number, number, number] = [10, 0, 10];
      const options: Render3DOptions = {
        projection: 'perspective',
        cameraTarget: customTarget,
      };
      const result = setupCamera(options, testBounds, 1);

      expect(result.target).toEqual(customTarget);
    });

    test('should calculate default position based on scene size', () => {
      const options: Render3DOptions = { projection: 'perspective' };
      const result = setupCamera(options, testBounds, 1);

      // Default should be at distance proportional to scene size
      const maxSize = Math.max(testBounds.size.x, testBounds.size.y, testBounds.size.z);
      const distance = Math.sqrt(
        (result.position[0] - testBounds.center.x) ** 2 +
          (result.position[1] - testBounds.center.y) ** 2 +
          (result.position[2] - testBounds.center.z) ** 2,
      );

      // Camera should be far enough to see the scene
      expect(distance).toBeGreaterThan(maxSize);
    });
  });

  describe('aspect ratio handling', () => {
    test('should respect 16:9 aspect ratio for orthographic', () => {
      const options: Render3DOptions = { projection: 'isometric' };
      const result = setupCamera(options, testBounds, 16 / 9);
      const camera = result.camera as THREE.OrthographicCamera;

      const aspectRatio = (camera.right - camera.left) / (camera.top - camera.bottom);
      expect(aspectRatio).toBeCloseTo(16 / 9, 1);
    });

    test('should handle square aspect ratio', () => {
      const options: Render3DOptions = { projection: 'isometric' };
      const result = setupCamera(options, testBounds, 1);
      const camera = result.camera as THREE.OrthographicCamera;

      const aspectRatio = (camera.right - camera.left) / (camera.top - camera.bottom);
      expect(aspectRatio).toBeCloseTo(1, 1);
    });
  });
});

describe('frameBoundingBox', () => {
  test('should update orthographic camera frustum', () => {
    const camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 100);
    const bounds: SceneBounds = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 20, y: 10, z: 20 },
      center: { x: 10, y: 5, z: 10 },
      size: { x: 20, y: 10, z: 20 },
    };

    frameBoundingBox(bounds, camera, 0.2);
    camera.updateProjectionMatrix();

    // Frustum should be resized to fit the bounds
    expect(camera.right).toBeGreaterThan(0);
    expect(camera.left).toBeLessThan(0);
  });

  test('should work with perspective camera', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(30, 30, 30);

    const bounds: SceneBounds = {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 5, z: 10 },
      center: { x: 5, y: 2.5, z: 5 },
      size: { x: 10, y: 5, z: 10 },
    };

    // Should not throw
    expect(() => frameBoundingBox(bounds, camera)).not.toThrow();
  });
});
