/**
 * Camera utilities for 3D floorplan rendering
 * Supports isometric and perspective camera configurations
 */

import * as THREE from 'three';
import type { SceneBounds, Render3DOptions } from './types.js';

/**
 * Camera configuration result
 */
export interface CameraSetupResult {
  camera: THREE.Camera;
  /** Projection type used */
  projection: 'isometric' | 'perspective';
  /** Camera position used */
  position: [number, number, number];
  /** Camera target (look-at point) */
  target: [number, number, number];
  /** FOV (for perspective camera) */
  fov?: number;
}

/**
 * Compute bounding box from a Three.js scene
 */
export function computeSceneBounds(scene: THREE.Scene): SceneBounds {
  const box = new THREE.Box3().setFromObject(scene);
  
  // Handle empty scenes
  if (box.isEmpty()) {
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 5, z: 10 },
      center: { x: 5, y: 2.5, z: 5 },
      size: { x: 10, y: 5, z: 10 },
    };
  }

  const center = new THREE.Vector3();
  box.getCenter(center);

  const size = new THREE.Vector3();
  box.getSize(size);

  return {
    min: { x: box.min.x, y: box.min.y, z: box.min.z },
    max: { x: box.max.x, y: box.max.y, z: box.max.z },
    center: { x: center.x, y: center.y, z: center.z },
    size: { x: size.x, y: size.y, z: size.z },
  };
}

/**
 * Set up camera based on options and scene bounds
 */
export function setupCamera(
  options: Render3DOptions,
  sceneBounds: SceneBounds,
  aspectRatio: number
): CameraSetupResult {
  const projection = options.projection ?? 'isometric';

  if (projection === 'perspective') {
    return setupPerspectiveCamera(options, sceneBounds, aspectRatio);
  } else {
    return setupIsometricCamera(sceneBounds, aspectRatio);
  }
}

/**
 * Set up an isometric (orthographic) camera
 * Standard architectural isometric: 30° from horizontal
 */
function setupIsometricCamera(
  sceneBounds: SceneBounds,
  aspectRatio: number
): CameraSetupResult {
  const { center, size } = sceneBounds;

  // Calculate the diagonal distance needed to frame the scene
  const maxDimension = Math.max(size.x, size.z) * 1.2; // 20% padding
  const height = Math.max(size.y, maxDimension * 0.5) * 1.2;

  // Isometric angle: 30° from horizontal (standard architectural)
  const angle = Math.PI / 6; // 30 degrees
  const distance = maxDimension * 1.5;

  // Position camera at diagonal, looking at center
  // Use 45° rotation around Y for classic isometric view
  const camX = center.x + distance * Math.cos(Math.PI / 4);
  const camY = center.y + distance * Math.sin(angle) + height / 2;
  const camZ = center.z + distance * Math.sin(Math.PI / 4);

  // Orthographic frustum
  const frustumSize = maxDimension;
  const halfWidth = (frustumSize * aspectRatio) / 2;
  const halfHeight = frustumSize / 2;

  const camera = new THREE.OrthographicCamera(
    -halfWidth,
    halfWidth,
    halfHeight,
    -halfHeight,
    0.1,
    distance * 3
  );

  camera.position.set(camX, camY, camZ);
  camera.lookAt(center.x, center.y, center.z);
  camera.updateProjectionMatrix();

  return {
    camera,
    projection: 'isometric',
    position: [camX, camY, camZ],
    target: [center.x, center.y, center.z],
  };
}

/**
 * Set up a perspective camera with user-specified position
 */
function setupPerspectiveCamera(
  options: Render3DOptions,
  sceneBounds: SceneBounds,
  aspectRatio: number
): CameraSetupResult {
  const { center, size } = sceneBounds;
  const fov = options.fov ?? 50;

  // Default camera position if not specified
  const defaultDistance = Math.max(size.x, size.y, size.z) * 2;
  const position: [number, number, number] = options.cameraPosition ?? [
    center.x + defaultDistance,
    center.y + defaultDistance * 0.6,
    center.z + defaultDistance,
  ];

  // Default target is scene center
  const target: [number, number, number] = options.cameraTarget ?? [
    center.x,
    center.y,
    center.z,
  ];

  const camera = new THREE.PerspectiveCamera(
    fov,
    aspectRatio,
    0.1,
    defaultDistance * 5
  );

  camera.position.set(...position);
  camera.lookAt(...target);
  camera.updateProjectionMatrix();

  return {
    camera,
    projection: 'perspective',
    position,
    target,
    fov,
  };
}

/**
 * Create a camera that frames a specific bounding box
 */
export function frameBoundingBox(
  bounds: SceneBounds,
  camera: THREE.Camera,
  padding: number = 0.2
): void {
  const { center, size } = bounds;
  const maxDim = Math.max(size.x, size.y, size.z) * (1 + padding);

  if (camera instanceof THREE.OrthographicCamera) {
    const aspect = camera.right / camera.top;
    const halfHeight = maxDim / 2;
    const halfWidth = halfHeight * aspect;

    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }

  camera.lookAt(center.x, center.y, center.z);
}

