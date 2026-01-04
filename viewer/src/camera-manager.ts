/**
 * Camera Manager - Handles camera mode switching, orthographic/perspective, isometric views
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { KeyboardControls } from './keyboard-controls';

export type CameraMode = 'perspective' | 'orthographic';

export interface CameraManagerCallbacks {
    getFloors: () => THREE.Group[];
    getKeyboardControls: () => KeyboardControls | null;
}

export class CameraManager {
    private cameraMode: CameraMode = 'perspective';
    private fov: number = 75;
    
    constructor(
        private perspectiveCamera: THREE.PerspectiveCamera,
        private orthographicCamera: THREE.OrthographicCamera,
        private controls: OrbitControls,
        private callbacks: CameraManagerCallbacks
    ) {}
    
    /**
     * Get the currently active camera
     */
    public get activeCamera(): THREE.Camera {
        return this.cameraMode === 'perspective' 
            ? this.perspectiveCamera 
            : this.orthographicCamera;
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
     * Toggle between perspective and orthographic camera modes
     */
    public toggleCameraMode(): void {
        if (this.cameraMode === 'perspective') {
            this.cameraMode = 'orthographic';
            // Copy position and target from perspective camera
            this.orthographicCamera.position.copy(this.perspectiveCamera.position);
            this.updateOrthographicSize();
        } else {
            this.cameraMode = 'perspective';
            // Copy position from orthographic camera
            this.perspectiveCamera.position.copy(this.orthographicCamera.position);
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
            btn.textContent = this.cameraMode === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective';
        }
        
        // Show/hide FOV slider based on camera mode
        const fovGroup = document.getElementById('fov-group');
        if (fovGroup) {
            fovGroup.style.display = this.cameraMode === 'perspective' ? 'flex' : 'none';
        }
    }
    
    /**
     * Update orthographic camera frustum based on distance
     */
    public updateOrthographicSize(): void {
        const aspect = window.innerWidth / window.innerHeight;
        const distance = this.orthographicCamera.position.distanceTo(this.controls.target);
        const frustumSize = distance * 0.5;
        
        this.orthographicCamera.left = frustumSize * aspect / -2;
        this.orthographicCamera.right = frustumSize * aspect / 2;
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
        const azimuth = 45 * Math.PI / 180;
        const elevation = 35.264 * Math.PI / 180;
        
        // Calculate camera distance to fit model
        const boundingBox = new THREE.Box3();
        floors.forEach(floor => {
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
        floors.forEach(floor => {
            if (floor.visible) {
                boundingBox.expandByObject(floor);
            }
        });
        
        return boundingBox.isEmpty() ? null : boundingBox;
    }
    
    /**
     * Handle window resize
     */
    public onWindowResize(): void {
        const aspect = window.innerWidth / window.innerHeight;
        
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();
        
        this.updateOrthographicSize();
    }
}

