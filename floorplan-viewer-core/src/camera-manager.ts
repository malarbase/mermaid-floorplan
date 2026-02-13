/**
 * Camera Manager - Handles camera mode switching, orthographic/perspective, isometric views
 */
import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { KeyboardControls } from './keyboard-controls.js';

export type CameraMode = 'perspective' | 'orthographic';

export interface CameraManagerCallbacks {
  getFloors: () => THREE.Group[];
  getKeyboardControls: () => KeyboardControls | null;
}

export class CameraManager {
  private cameraMode: CameraMode = 'perspective';
  private fov: number = 75;

  // Smooth tween state
  private tweenActive = false;
  private tweenStartPosition = new THREE.Vector3();
  private tweenEndPosition = new THREE.Vector3();
  private tweenStartTarget = new THREE.Vector3();
  private tweenEndTarget = new THREE.Vector3();
  private tweenProgress = 0;
  private tweenDuration = 500; // ms

  constructor(
    private perspectiveCamera: THREE.PerspectiveCamera,
    private orthographicCamera: THREE.OrthographicCamera,
    private controls: OrbitControls,
    private callbacks: CameraManagerCallbacks,
  ) {}

  /**
   * Get the currently active camera
   */
  public get activeCamera(): THREE.Camera {
    return this.cameraMode === 'perspective' ? this.perspectiveCamera : this.orthographicCamera;
  }

  /**
   * Get current camera mode
   */
  public getMode(): CameraMode {
    return this.cameraMode;
  }

  /**
   * Get current FOV
   */
  public getFov(): number {
    return this.fov;
  }

  /**
   * Setup UI control event listeners
   */
  public setupControls(): void {
    // Camera mode toggle
    const cameraModeBtn = document.getElementById('camera-mode-btn') as HTMLButtonElement;
    cameraModeBtn?.addEventListener('click', () => this.toggleCameraMode());

    // FOV slider
    const fovSlider = document.getElementById('fov-slider') as HTMLInputElement;
    fovSlider?.addEventListener('input', (e) => {
      this.fov = parseFloat((e.target as HTMLInputElement).value);
      this.perspectiveCamera.fov = this.fov;
      this.perspectiveCamera.updateProjectionMatrix();
      const fovValue = document.getElementById('fov-value');
      if (fovValue) fovValue.textContent = `${Math.round(this.fov)}°`;
    });

    // Isometric button
    const isometricBtn = document.getElementById('isometric-btn') as HTMLButtonElement;
    isometricBtn?.addEventListener('click', () => this.setIsometricView());
  }

  /**
   * Toggle between perspective and orthographic camera modes.
   *
   * When switching, the frustum / distance is adjusted so the visible extent
   * of the scene stays roughly the same. This prevents the dramatic scale
   * jump that would otherwise occur because the perspective camera's FOV and
   * the orthographic camera's frustum size are independent parameters.
   */
  public toggleCameraMode(): void {
    if (this.cameraMode === 'perspective') {
      this.cameraMode = 'orthographic';
      // Copy position and target from perspective camera
      this.orthographicCamera.position.copy(this.perspectiveCamera.position);

      // Match the orthographic frustum to the perspective camera's visible extent.
      // Visible height at distance d with FOV θ: h = 2 * d * tan(θ/2)
      const distance = this.perspectiveCamera.position.distanceTo(this.controls.target);
      const fovRad = THREE.MathUtils.degToRad(this.perspectiveCamera.fov);
      const frustumSize = 2 * distance * Math.tan(fovRad / 2);
      this.setOrthographicFrustum(frustumSize);
    } else {
      this.cameraMode = 'perspective';
      // Copy position from orthographic camera
      this.perspectiveCamera.position.copy(this.orthographicCamera.position);

      // Adjust perspective camera distance so visible extent matches the
      // orthographic frustum. frustumSize = top - bottom.
      const frustumSize = this.orthographicCamera.top - this.orthographicCamera.bottom;
      const fovRad = THREE.MathUtils.degToRad(this.perspectiveCamera.fov);
      const desiredDistance = frustumSize / (2 * Math.tan(fovRad / 2));

      // Move along the camera→target direction to the desired distance
      const direction = new THREE.Vector3()
        .subVectors(this.perspectiveCamera.position, this.controls.target)
        .normalize();
      this.perspectiveCamera.position
        .copy(this.controls.target)
        .add(direction.multiplyScalar(desiredDistance));
    }

    // Update controls
    this.controls.object = this.activeCamera;
    this.controls.update();

    // Sync with keyboard controls
    const keyboardControls = this.callbacks.getKeyboardControls();
    keyboardControls?.setOrthographicMode(this.cameraMode === 'orthographic');

    // Update UI
    const btn = document.getElementById('camera-mode-btn');
    if (btn) {
      btn.textContent =
        this.cameraMode === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective';
    }

    // Show/hide FOV slider based on camera mode
    const fovGroup = document.getElementById('fov-group');
    if (fovGroup) {
      fovGroup.style.display = this.cameraMode === 'perspective' ? 'flex' : 'none';
    }
  }

  // Container dimensions for proper aspect ratio calculation
  private containerWidth: number = window.innerWidth;
  private containerHeight: number = window.innerHeight;

  /**
   * Update orthographic camera frustum based on distance.
   * Called when zooming or resizing while in orthographic mode.
   */
  public updateOrthographicSize(): void {
    const distance = this.orthographicCamera.position.distanceTo(this.controls.target);
    // Use a factor that approximates a 75° FOV perspective view:
    // 2 * tan(37.5°) ≈ 1.534, but we use a slightly smaller factor to
    // avoid the orthographic view feeling too zoomed-out.
    const frustumSize = distance * 1.0;
    this.setOrthographicFrustum(frustumSize);
  }

  /**
   * Set orthographic frustum to an explicit size (vertical extent).
   * Used by toggleCameraMode to match perspective visible extent.
   */
  private setOrthographicFrustum(frustumSize: number): void {
    const aspect = this.containerWidth / this.containerHeight;
    this.orthographicCamera.left = (frustumSize * aspect) / -2;
    this.orthographicCamera.right = (frustumSize * aspect) / 2;
    this.orthographicCamera.top = frustumSize / 2;
    this.orthographicCamera.bottom = frustumSize / -2;
    this.orthographicCamera.updateProjectionMatrix();
  }

  /**
   * Set camera to isometric view
   */
  public setIsometricView(): void {
    const floors = this.callbacks.getFloors();

    // Switch to orthographic if not already
    if (this.cameraMode !== 'orthographic') {
      this.toggleCameraMode();
    }

    // Isometric angles: 45° azimuth, 35.264° elevation
    const azimuth = (45 * Math.PI) / 180;
    const elevation = (35.264 * Math.PI) / 180;

    // Calculate camera distance to fit model
    const boundingBox = new THREE.Box3();
    floors.forEach((floor) => {
      boundingBox.expandByObject(floor);
    });

    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    // Position camera
    const x = center.x + distance * Math.cos(elevation) * Math.sin(azimuth);
    const y = center.y + distance * Math.sin(elevation);
    const z = center.z + distance * Math.cos(elevation) * Math.cos(azimuth);

    this.orthographicCamera.position.set(x, y, z);
    this.controls.target.copy(center);
    this.updateOrthographicSize();
    this.controls.update();
  }

  /**
   * Get bounding box of all visible scene geometry
   */
  public getSceneBoundingBox(): THREE.Box3 | null {
    const floors = this.callbacks.getFloors();

    if (floors.length === 0) return null;

    const boundingBox = new THREE.Box3();
    floors.forEach((floor) => {
      if (floor.visible) {
        boundingBox.expandByObject(floor);
      }
    });

    return boundingBox.isEmpty() ? null : boundingBox;
  }

  /**
   * Compute the camera position and target needed to frame a set of objects.
   * Preserves the current viewing direction but adjusts distance to fit.
   *
   * This is the shared framing logic used by both `focusOnObjects()` (tweened)
   * and `BaseViewer.captureScreenshot()` (instant).
   *
   * @param objects - Array of Three.js Object3D instances to frame
   * @param padding - Extra padding factor (1.0 = tight fit, 2.0 = double margin). Default 1.6
   * @param aspectOverride - Override aspect ratio (e.g. thumbnail dimensions). Uses current viewport if omitted.
   * @returns Computed position and target, or null if objects are empty/invalid.
   */
  public computeFramingForObjects(
    objects: THREE.Object3D[],
    padding = 1.6,
    aspectOverride?: number,
  ): { position: THREE.Vector3; target: THREE.Vector3 } | null {
    if (objects.length === 0) return null;

    // Compute combined bounding box
    const boundingBox = new THREE.Box3();
    for (const obj of objects) {
      boundingBox.expandByObject(obj);
    }
    if (boundingBox.isEmpty()) return null;

    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Determine desired camera distance to frame the bounding box
    const camera = this.activeCamera;
    const aspect = aspectOverride ?? this.containerWidth / this.containerHeight;
    let desiredDistance: number;

    if (camera instanceof THREE.PerspectiveCamera) {
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      // Use the narrower FOV dimension to ensure objects fit
      const effectiveFov = aspect >= 1 ? fovRad : 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
      desiredDistance = (maxDim * padding) / (2 * Math.tan(effectiveFov / 2));
    } else {
      // Orthographic: distance doesn't change visual size, but we still
      // want the camera reasonably placed. Use maxDim * padding as basis.
      desiredDistance = maxDim * padding;
    }

    // Keep the current viewing direction but move to frame the target
    const direction = new THREE.Vector3()
      .subVectors(camera.position, this.controls.target)
      .normalize();

    // If direction is zero (camera at target), use a default
    if (direction.lengthSq() < 0.001) {
      direction.set(0.5, 0.7, 0.5).normalize();
    }

    const newPosition = center.clone().add(direction.multiplyScalar(desiredDistance));
    return { position: newPosition, target: center };
  }

  /**
   * Smoothly animate the camera to frame the given 3D objects.
   * Computes their combined bounding box, then tweens camera position and
   * orbit target so the objects are centered and fit within the viewport.
   *
   * @param objects - Array of Three.js Object3D instances to focus on
   * @param padding - Extra padding factor (1.0 = tight fit, 2.0 = double margin). Default 1.6
   */
  public focusOnObjects(objects: THREE.Object3D[], padding = 1.6): void {
    const framing = this.computeFramingForObjects(objects, padding);
    if (!framing) return;

    // Start smooth tween
    const camera = this.activeCamera;
    this.tweenStartPosition.copy(camera.position);
    this.tweenEndPosition.copy(framing.position);
    this.tweenStartTarget.copy(this.controls.target);
    this.tweenEndTarget.copy(framing.target);
    this.tweenProgress = 0;
    this.tweenActive = true;
  }

  /**
   * Advance the camera tween animation. Call from the render loop with deltaTime in ms.
   * Returns true if a tween is active (camera moved this frame).
   */
  public updateTween(deltaTime: number): boolean {
    if (!this.tweenActive) return false;

    this.tweenProgress += deltaTime / this.tweenDuration;
    if (this.tweenProgress >= 1) {
      this.tweenProgress = 1;
      this.tweenActive = false;
    }

    // Ease-out cubic: 1 - (1-t)^3
    const t = this.tweenProgress;
    const eased = 1 - (1 - t) ** 3;

    const camera = this.activeCamera;
    camera.position.lerpVectors(this.tweenStartPosition, this.tweenEndPosition, eased);
    this.controls.target.lerpVectors(this.tweenStartTarget, this.tweenEndTarget, eased);

    // Update orthographic frustum if needed
    if (this.cameraMode === 'orthographic') {
      this.updateOrthographicSize();
    }

    this.controls.update();
    return true;
  }

  /**
   * Handle window/container resize
   * @param width - Container width (defaults to window.innerWidth)
   * @param height - Container height (defaults to window.innerHeight)
   */
  public onWindowResize(width?: number, height?: number): void {
    this.containerWidth = width ?? window.innerWidth;
    this.containerHeight = height ?? window.innerHeight;

    const aspect = this.containerWidth / this.containerHeight;

    this.perspectiveCamera.aspect = aspect;
    this.perspectiveCamera.updateProjectionMatrix();

    this.updateOrthographicSize();
  }
}
