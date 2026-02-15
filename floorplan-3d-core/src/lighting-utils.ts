/**
 * Lighting utilities for 3D floorplan rendering
 * Provides ambient and directional lighting with optional shadows
 */

import * as THREE from 'three';
import type { SceneBounds } from './types.js';

/**
 * Lighting configuration options
 */
export interface LightingOptions {
  /** Ambient light intensity (default: 0.6) */
  ambientIntensity?: number;
  /** Directional light intensity (default: 0.8) */
  directionalIntensity?: number;
  /** Ambient light color (default: white) */
  ambientColor?: number;
  /** Directional light color (default: white) */
  directionalColor?: number;
  /** Enable shadows (default: false for headless, true for browser) */
  shadows?: boolean;
  /** Shadow map size (default: 2048) */
  shadowMapSize?: number;
}

/**
 * Set up scene lighting with ambient and directional lights
 */
export function setupLighting(
  scene: THREE.Scene,
  sceneBounds: SceneBounds,
  options: LightingOptions = {},
): void {
  const {
    ambientIntensity = 0.6,
    directionalIntensity = 0.8,
    ambientColor = 0xffffff,
    directionalColor = 0xffffff,
    shadows = false,
    shadowMapSize = 2048,
  } = options;

  // Ambient light for base illumination
  const ambientLight = new THREE.AmbientLight(ambientColor, ambientIntensity);
  ambientLight.name = 'ambient_light';
  scene.add(ambientLight);

  // Main directional light (sun-like)
  const directionalLight = new THREE.DirectionalLight(directionalColor, directionalIntensity);
  directionalLight.name = 'directional_light';

  // Position light above and to the side of the scene
  const { center, size } = sceneBounds;
  const maxDim = Math.max(size.x, size.y, size.z);
  const lightDistance = maxDim * 2;

  directionalLight.position.set(
    center.x + lightDistance,
    center.y + lightDistance * 1.5,
    center.z + lightDistance,
  );
  directionalLight.target.position.set(center.x, center.y, center.z);

  if (shadows) {
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = shadowMapSize;
    directionalLight.shadow.mapSize.height = shadowMapSize;

    // Configure shadow camera to cover the scene
    const shadowCameraSize = maxDim * 1.5;
    directionalLight.shadow.camera.left = -shadowCameraSize;
    directionalLight.shadow.camera.right = shadowCameraSize;
    directionalLight.shadow.camera.top = shadowCameraSize;
    directionalLight.shadow.camera.bottom = -shadowCameraSize;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = lightDistance * 3;
    directionalLight.shadow.bias = -0.001;
  }

  scene.add(directionalLight);
  scene.add(directionalLight.target);

  // Optional fill light from the opposite side (softer)
  const fillLight = new THREE.DirectionalLight(0xffffff, directionalIntensity * 0.3);
  fillLight.name = 'fill_light';
  fillLight.position.set(
    center.x - lightDistance * 0.5,
    center.y + lightDistance * 0.8,
    center.z - lightDistance * 0.5,
  );
  scene.add(fillLight);
}

/**
 * Create a hemisphere light for outdoor-like lighting
 * Useful for more natural illumination
 */
export function createHemisphereLight(
  skyColor: number = 0x87ceeb,
  groundColor: number = 0x362907,
  intensity: number = 0.5,
): THREE.HemisphereLight {
  return new THREE.HemisphereLight(skyColor, groundColor, intensity);
}
