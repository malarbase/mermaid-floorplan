import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Pivot indicator that shows the camera's orbit target point
 * Features:
 * - RGB colored 3D axis gizmo (X=red, Y=green, Z=blue)
 * - Auto-fade after inactivity
 * - Toggle for always-visible mode (P key)
 */
export class PivotIndicator {
  private scene: THREE.Scene;
  private controls: OrbitControls;
  private group: THREE.Group;
  private axesHelper: THREE.AxesHelper;
  private sphere: THREE.Mesh;

  // Visibility state
  private alwaysVisible: boolean = false;
  private currentOpacity: number = 0;
  private targetOpacity: number = 0;
  private fadeTimer: number | null = null;
  private lastTargetPosition: THREE.Vector3 = new THREE.Vector3();

  // Configuration
  private readonly FADE_IN_DURATION = 150; // ms
  private readonly FADE_OUT_DURATION = 800; // ms
  private readonly INACTIVITY_DELAY = 1500; // ms before fading out
  private readonly SIZE = 0.5; // Size of the axes
  private readonly SPHERE_SIZE = 0.08; // Size of the center sphere

  constructor(scene: THREE.Scene, controls: OrbitControls) {
    this.scene = scene;
    this.controls = controls;

    // Create container group
    this.group = new THREE.Group();
    this.group.name = 'PivotIndicator';
    this.group.renderOrder = 999; // Render on top

    // Create axes helper
    this.axesHelper = new THREE.AxesHelper(this.SIZE);
    // Make axes render on top (disable depth test)
    (this.axesHelper.material as THREE.Material).depthTest = false;
    this.group.add(this.axesHelper);

    // Create center sphere
    const sphereGeometry = new THREE.SphereGeometry(this.SPHERE_SIZE, 16, 12);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });
    this.sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.group.add(this.sphere);

    // Start with hidden indicator
    this.setOpacity(0);
    this.scene.add(this.group);

    // Store initial position
    this.lastTargetPosition.copy(this.controls.target);

    // Start update loop
    this.update = this.update.bind(this);
  }

  /**
   * Toggle between always-visible and auto-fade modes
   */
  public toggleAlwaysVisible(): boolean {
    this.alwaysVisible = !this.alwaysVisible;

    if (this.alwaysVisible) {
      this.show();
    } else {
      this.scheduleFadeOut();
    }

    return this.alwaysVisible;
  }

  /**
   * Get current visibility mode
   */
  public isAlwaysVisible(): boolean {
    return this.alwaysVisible;
  }

  /**
   * Show the indicator (fade in)
   */
  public show(): void {
    if (this.fadeTimer !== null) {
      window.clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    this.targetOpacity = 1;

    if (!this.alwaysVisible) {
      this.scheduleFadeOut();
    }
  }

  /**
   * Called when camera is being manipulated (rotate/pan/zoom)
   */
  public onCameraActivity(): void {
    this.show();
  }

  /**
   * Schedule fade out after inactivity delay
   */
  private scheduleFadeOut(): void {
    if (this.fadeTimer !== null) {
      window.clearTimeout(this.fadeTimer);
    }

    this.fadeTimer = window.setTimeout(() => {
      this.targetOpacity = 0;
      this.fadeTimer = null;
    }, this.INACTIVITY_DELAY);
  }

  /**
   * Set opacity of all indicator parts
   */
  private setOpacity(opacity: number): void {
    this.currentOpacity = opacity;

    // Update axes opacity
    const axesMaterial = this.axesHelper.material as THREE.Material;
    axesMaterial.opacity = opacity;
    axesMaterial.transparent = true;
    axesMaterial.needsUpdate = true;

    // Update sphere opacity
    const sphereMaterial = this.sphere.material as THREE.MeshBasicMaterial;
    sphereMaterial.opacity = opacity * 0.8;

    // Hide entirely when fully transparent
    this.group.visible = opacity > 0.01;
  }

  /**
   * Update position and opacity (call each frame)
   */
  public update(deltaTime: number = 16): void {
    // Update position to match controls target
    this.group.position.copy(this.controls.target);

    // Check if target has moved
    if (!this.lastTargetPosition.equals(this.controls.target)) {
      this.lastTargetPosition.copy(this.controls.target);
      this.onCameraActivity();
    }

    // Animate opacity
    if (Math.abs(this.currentOpacity - this.targetOpacity) > 0.01) {
      const fadeSpeed =
        this.targetOpacity > this.currentOpacity
          ? deltaTime / this.FADE_IN_DURATION
          : deltaTime / this.FADE_OUT_DURATION;

      if (this.targetOpacity > this.currentOpacity) {
        this.currentOpacity = Math.min(this.currentOpacity + fadeSpeed, this.targetOpacity);
      } else {
        this.currentOpacity = Math.max(this.currentOpacity - fadeSpeed, this.targetOpacity);
      }

      this.setOpacity(this.currentOpacity);
    }
  }

  /**
   * Update the indicator size based on camera distance
   */
  public updateSize(camera: THREE.Camera): void {
    const distance = camera.position.distanceTo(this.controls.target);
    const scale = Math.max(0.2, Math.min(2, distance * 0.05));
    this.group.scale.setScalar(scale);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.fadeTimer !== null) {
      window.clearTimeout(this.fadeTimer);
    }

    this.scene.remove(this.group);
    this.axesHelper.dispose();
    this.sphere.geometry.dispose();
    (this.sphere.material as THREE.Material).dispose();
  }
}
