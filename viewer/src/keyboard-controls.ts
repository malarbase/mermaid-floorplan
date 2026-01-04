import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PivotIndicator } from './pivot-indicator';

/**
 * Configuration for keyboard controls
 */
export interface KeyboardControlsConfig {
    panSpeed: number;           // Base pan speed (units per second)
    zoomSpeed: number;          // Zoom speed multiplier
    verticalSpeed: number;      // Vertical movement speed (units per second)
    precisionModifier: number;  // Speed multiplier when Shift is held
    smoothTransitionDuration: number; // Duration of camera transitions (ms)
}

/**
 * Camera state for smooth transitions
 */
interface CameraState {
    position: THREE.Vector3;
    target: THREE.Vector3;
    isOrthographic: boolean;
}

/**
 * Keyboard-based camera navigation following standard 3D software conventions
 * 
 * Controls:
 * - WASD: Pan camera (forward/left/backward/right)
 * - Q/E: Move camera down/up
 * - +/- or PageUp/PageDown: Zoom in/out
 * - Shift: Precision modifier (slower movement)
 * - 1/3/7: Front/Right/Top orthographic views
 * - 5 or Numpad5: Toggle perspective/orthographic
 * - Home: Reset camera to default
 * - F: Frame geometry in view
 * - C: Center pivot on geometry
 * - P: Toggle pivot indicator visibility
 * - ?/H: Toggle help overlay
 */
export class KeyboardControls {
    private controls: OrbitControls;
    private perspectiveCamera: THREE.PerspectiveCamera;
    private orthographicCamera: THREE.OrthographicCamera;
    private pivotIndicator: PivotIndicator | null = null;
    
    // Callbacks
    private onCameraModeToggle: () => void;
    private onUpdateOrthographicSize: () => void;
    private getBoundingBox: () => THREE.Box3 | null;
    private setHelpOverlayVisible: (visible: boolean) => void;
    
    // State
    private pressedKeys: Set<string> = new Set();
    private isOrthographic: boolean = false;
    private defaultCameraState: CameraState;
    
    // Animation
    private transitionStartTime: number | null = null;
    private transitionStartState: CameraState | null = null;
    private transitionEndState: CameraState | null = null;
    
    // Configuration
    private config: KeyboardControlsConfig = {
        panSpeed: 15,
        zoomSpeed: 1.5,
        verticalSpeed: 10,
        precisionModifier: 0.2,
        smoothTransitionDuration: 400,
    };
    
    constructor(
        controls: OrbitControls,
        perspectiveCamera: THREE.PerspectiveCamera,
        orthographicCamera: THREE.OrthographicCamera,
        options: {
            onCameraModeToggle: () => void;
            onUpdateOrthographicSize: () => void;
            getBoundingBox: () => THREE.Box3 | null;
            setHelpOverlayVisible: (visible: boolean) => void;
        }
    ) {
        this.controls = controls;
        this.perspectiveCamera = perspectiveCamera;
        this.orthographicCamera = orthographicCamera;
        this.onCameraModeToggle = options.onCameraModeToggle;
        this.onUpdateOrthographicSize = options.onUpdateOrthographicSize;
        this.getBoundingBox = options.getBoundingBox;
        this.setHelpOverlayVisible = options.setHelpOverlayVisible;
        
        // Store default camera state
        this.defaultCameraState = {
            position: this.perspectiveCamera.position.clone(),
            target: this.controls.target.clone(),
            isOrthographic: false,
        };
        
        // Bind event handlers
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.update = this.update.bind(this);
        
        // Add event listeners
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }
    
    /**
     * Set the pivot indicator for activity notifications
     */
    public setPivotIndicator(indicator: PivotIndicator): void {
        this.pivotIndicator = indicator;
    }
    
    /**
     * Set camera mode (for syncing with external toggle)
     */
    public setOrthographicMode(isOrthographic: boolean): void {
        this.isOrthographic = isOrthographic;
    }
    
    /**
     * Handle key down events
     */
    private onKeyDown(event: KeyboardEvent): void {
        // Ignore if typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }
        
        this.pressedKeys.add(event.code);
        
        // Handle single-press actions
        switch (event.code) {
            // Numpad 5 or key 5 - Toggle perspective/orthographic
            case 'Numpad5':
            case 'Digit5':
                this.onCameraModeToggle();
                this.isOrthographic = !this.isOrthographic;
                break;
                
            // 1 - Front view
            case 'Numpad1':
            case 'Digit1':
                this.setFrontView();
                break;
                
            // 3 - Right view
            case 'Numpad3':
            case 'Digit3':
                this.setRightView();
                break;
                
            // 7 - Top view
            case 'Numpad7':
            case 'Digit7':
                this.setTopView();
                break;
                
            // Home - Reset camera
            case 'Home':
                this.resetCamera();
                break;
                
            // F or Numpad . - Frame geometry
            case 'KeyF':
            case 'NumpadDecimal':
                this.frameGeometry();
                break;
                
            // C - Center pivot
            case 'KeyC':
                this.centerPivot();
                break;
                
            // P - Toggle pivot indicator
            case 'KeyP':
                if (this.pivotIndicator) {
                    const nowAlwaysVisible = this.pivotIndicator.toggleAlwaysVisible();
                    console.log(`Pivot indicator: ${nowAlwaysVisible ? 'always visible' : 'auto-fade'}`);
                }
                break;
                
            // ? or H - Toggle help overlay
            case 'Slash': // ? key (Shift+/)
                if (event.shiftKey) {
                    this.toggleHelpOverlay();
                }
                break;
            case 'KeyH':
                this.toggleHelpOverlay();
                break;
        }
    }
    
    /**
     * Handle key up events
     */
    private onKeyUp(event: KeyboardEvent): void {
        this.pressedKeys.delete(event.code);
    }
    
    /**
     * Help overlay visibility state
     */
    private helpOverlayVisible: boolean = false;
    
    /**
     * Toggle help overlay visibility
     */
    private toggleHelpOverlay(): void {
        this.helpOverlayVisible = !this.helpOverlayVisible;
        this.setHelpOverlayVisible(this.helpOverlayVisible);
    }
    
    /**
     * Update function (call each frame)
     */
    public update(deltaTime: number): void {
        // Handle smooth camera transitions
        if (this.transitionStartTime !== null) {
            this.updateTransition();
            return; // Don't process movement during transitions
        }
        
        // Calculate speed modifier
        const speedModifier = this.pressedKeys.has('ShiftLeft') || this.pressedKeys.has('ShiftRight')
            ? this.config.precisionModifier
            : 1;
        
        // Get active camera
        const camera = this.isOrthographic ? this.orthographicCamera : this.perspectiveCamera;
        
        // Calculate movement vectors
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
        
        // Get camera direction (projected onto XZ plane for WASD)
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        
        // Pan speed adjusted by delta time
        const panAmount = this.config.panSpeed * speedModifier * (deltaTime / 1000);
        const verticalAmount = this.config.verticalSpeed * speedModifier * (deltaTime / 1000);
        
        let moved = false;
        const movement = new THREE.Vector3();
        
        // WASD Pan
        if (this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp')) {
            movement.add(forward.clone().multiplyScalar(panAmount));
            moved = true;
        }
        if (this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) {
            movement.add(forward.clone().multiplyScalar(-panAmount));
            moved = true;
        }
        if (this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft')) {
            movement.add(right.clone().multiplyScalar(-panAmount));
            moved = true;
        }
        if (this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) {
            movement.add(right.clone().multiplyScalar(panAmount));
            moved = true;
        }
        
        // Q/E Vertical movement
        if (this.pressedKeys.has('KeyQ')) {
            movement.y -= verticalAmount;
            moved = true;
        }
        if (this.pressedKeys.has('KeyE')) {
            movement.y += verticalAmount;
            moved = true;
        }
        
        // Apply pan movement (moves both camera and target)
        if (moved) {
            camera.position.add(movement);
            this.controls.target.add(movement);
            this.controls.update();
            this.pivotIndicator?.onCameraActivity();
        }
        
        // Zoom with +/- or PageUp/PageDown
        const zoomAmount = this.config.zoomSpeed * speedModifier * (deltaTime / 1000);
        
        if (this.pressedKeys.has('Equal') || this.pressedKeys.has('NumpadAdd') || this.pressedKeys.has('PageUp')) {
            this.zoom(zoomAmount);
        }
        if (this.pressedKeys.has('Minus') || this.pressedKeys.has('NumpadSubtract') || this.pressedKeys.has('PageDown')) {
            this.zoom(-zoomAmount);
        }
    }
    
    /**
     * Zoom the camera
     */
    private zoom(amount: number): void {
        const camera = this.isOrthographic ? this.orthographicCamera : this.perspectiveCamera;
        const direction = new THREE.Vector3();
        direction.subVectors(this.controls.target, camera.position).normalize();
        
        const distance = camera.position.distanceTo(this.controls.target);
        const zoomDistance = distance * amount;
        
        // Don't zoom past the target
        if (distance - zoomDistance > 0.5) {
            camera.position.add(direction.multiplyScalar(zoomDistance));
            this.controls.update();
            this.pivotIndicator?.onCameraActivity();
            
            if (this.isOrthographic) {
                this.onUpdateOrthographicSize();
            }
        }
    }
    
    /**
     * Set front view (looking at -Z)
     */
    private setFrontView(): void {
        const boundingBox = this.getBoundingBox();
        if (!boundingBox) return;
        
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const distance = Math.max(size.x, size.y) * 1.5;
        
        this.smoothTransitionTo({
            position: new THREE.Vector3(center.x, center.y, center.z + distance),
            target: center.clone(),
            isOrthographic: true,
        });
    }
    
    /**
     * Set right side view (looking at -X)
     */
    private setRightView(): void {
        const boundingBox = this.getBoundingBox();
        if (!boundingBox) return;
        
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const distance = Math.max(size.z, size.y) * 1.5;
        
        this.smoothTransitionTo({
            position: new THREE.Vector3(center.x + distance, center.y, center.z),
            target: center.clone(),
            isOrthographic: true,
        });
    }
    
    /**
     * Set top-down view (looking at -Y)
     */
    private setTopView(): void {
        const boundingBox = this.getBoundingBox();
        if (!boundingBox) return;
        
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const distance = Math.max(size.x, size.z) * 1.5;
        
        this.smoothTransitionTo({
            position: new THREE.Vector3(center.x, center.y + distance, center.z),
            target: center.clone(),
            isOrthographic: true,
        });
    }
    
    /**
     * Reset camera to default position
     */
    private resetCamera(): void {
        this.smoothTransitionTo(this.defaultCameraState);
    }
    
    /**
     * Frame geometry in view
     */
    private frameGeometry(): void {
        const boundingBox = this.getBoundingBox();
        if (!boundingBox) return;
        
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Keep current camera angle, just adjust distance
        const camera = this.isOrthographic ? this.orthographicCamera : this.perspectiveCamera;
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, this.controls.target).normalize();
        
        const distance = maxDim * 2;
        
        this.smoothTransitionTo({
            position: center.clone().add(direction.multiplyScalar(distance)),
            target: center.clone(),
            isOrthographic: this.isOrthographic,
        });
    }
    
    /**
     * Center pivot on geometry
     */
    private centerPivot(): void {
        const boundingBox = this.getBoundingBox();
        if (!boundingBox) return;
        
        const center = boundingBox.getCenter(new THREE.Vector3());
        const camera = this.isOrthographic ? this.orthographicCamera : this.perspectiveCamera;
        
        // Move target to center, keep camera distance
        const offset = new THREE.Vector3();
        offset.subVectors(camera.position, this.controls.target);
        
        this.smoothTransitionTo({
            position: center.clone().add(offset),
            target: center.clone(),
            isOrthographic: this.isOrthographic,
        });
    }
    
    /**
     * Start a smooth camera transition
     */
    private smoothTransitionTo(endState: CameraState): void {
        const camera = this.isOrthographic ? this.orthographicCamera : this.perspectiveCamera;
        
        this.transitionStartState = {
            position: camera.position.clone(),
            target: this.controls.target.clone(),
            isOrthographic: this.isOrthographic,
        };
        
        this.transitionEndState = endState;
        this.transitionStartTime = performance.now();
        
        // If switching camera mode, do it at the start
        if (endState.isOrthographic !== this.isOrthographic) {
            this.onCameraModeToggle();
            this.isOrthographic = endState.isOrthographic;
        }
    }
    
    /**
     * Update smooth camera transition
     */
    private updateTransition(): void {
        if (!this.transitionStartTime || !this.transitionStartState || !this.transitionEndState) {
            return;
        }
        
        const elapsed = performance.now() - this.transitionStartTime;
        const progress = Math.min(elapsed / this.config.smoothTransitionDuration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const camera = this.isOrthographic ? this.orthographicCamera : this.perspectiveCamera;
        
        // Interpolate position and target
        camera.position.lerpVectors(
            this.transitionStartState.position,
            this.transitionEndState.position,
            eased
        );
        
        this.controls.target.lerpVectors(
            this.transitionStartState.target,
            this.transitionEndState.target,
            eased
        );
        
        this.controls.update();
        this.pivotIndicator?.onCameraActivity();
        
        if (this.isOrthographic) {
            this.onUpdateOrthographicSize();
        }
        
        // End transition
        if (progress >= 1) {
            this.transitionStartTime = null;
            this.transitionStartState = null;
            this.transitionEndState = null;
        }
    }
    
    /**
     * Store the current camera position as the new default
     */
    public storeDefaultCameraState(): void {
        this.defaultCameraState = {
            position: this.perspectiveCamera.position.clone(),
            target: this.controls.target.clone(),
            isOrthographic: false,
        };
    }
    
    /**
     * Clean up event listeners
     */
    public dispose(): void {
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }
}

