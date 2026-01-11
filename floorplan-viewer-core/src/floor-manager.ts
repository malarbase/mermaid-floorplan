/**
 * Floor Manager - Handles floor visibility and floor list UI
 */
import * as THREE from 'three';
import type { JsonExport } from 'floorplan-3d-core';

export interface FloorManagerCallbacks {
    getFloors: () => THREE.Group[];
    getFloorplanData: () => JsonExport | null;
    onVisibilityChange: () => void;
}

export class FloorManager {
    private floorVisibility: Map<string, boolean> = new Map();
    
    constructor(private callbacks: FloorManagerCallbacks) {}
    
    /**
     * Setup UI control event listeners
     */
    public setupControls(): void {
        const showAllFloorsBtn = document.getElementById('show-all-floors') as HTMLButtonElement;
        showAllFloorsBtn?.addEventListener('click', () => this.setAllFloorsVisible(true));
        
        const hideAllFloorsBtn = document.getElementById('hide-all-floors') as HTMLButtonElement;
        hideAllFloorsBtn?.addEventListener('click', () => this.setAllFloorsVisible(false));
    }
    
    /**
     * Get visibility of a floor by ID
     */
    public getFloorVisibility(floorId: string): boolean {
        return this.floorVisibility.get(floorId) ?? true;
    }
    
    /**
     * Get list of visible floor IDs
     */
    public getVisibleFloorIds(): string[] {
        const floorplanData = this.callbacks.getFloorplanData();
        if (!floorplanData) return [];
        
        return floorplanData.floors
            .map(floor => floor.id)
            .filter(floorId => this.getFloorVisibility(floorId));
    }
    
    /**
     * Update the floor list UI based on current floorplan data
     */
    public updateFloorListUI(): void {
        const floorListEl = document.getElementById('floor-list');
        if (!floorListEl) return;
        
        const floorplanData = this.callbacks.getFloorplanData();
        
        // Clear existing content
        floorListEl.innerHTML = '';
        
        if (!floorplanData || floorplanData.floors.length === 0) {
            floorListEl.innerHTML = '<div class="no-floors-message">Load a floorplan to see floors</div>';
            return;
        }
        
        // Create checkbox for each floor
        floorplanData.floors.forEach((floor, index) => {
            const floorId = floor.id;
            const isVisible = this.floorVisibility.get(floorId) ?? true;
            
            const floorItem = document.createElement('div');
            floorItem.className = 'fp-floor-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `floor-toggle-${index}`;
            checkbox.checked = isVisible;
            checkbox.addEventListener('change', () => {
                this.setFloorVisible(floorId, checkbox.checked);
            });
            
            const label = document.createElement('label');
            label.htmlFor = `floor-toggle-${index}`;
            label.textContent = floorId;
            
            floorItem.appendChild(checkbox);
            floorItem.appendChild(label);
            floorListEl.appendChild(floorItem);
        });
    }
    
    /**
     * Set visibility of a specific floor
     */
    public setFloorVisible(floorId: string, visible: boolean): void {
        this.floorVisibility.set(floorId, visible);
        
        const floorplanData = this.callbacks.getFloorplanData();
        const floors = this.callbacks.getFloors();
        
        // Find and update the THREE.Group
        const floorIndex = floorplanData?.floors.findIndex(f => f.id === floorId) ?? -1;
        if (floorIndex >= 0 && floors[floorIndex]) {
            floors[floorIndex].visible = visible;
        }
        
        // Notify caller of visibility change (e.g., to update floor summary)
        this.callbacks.onVisibilityChange();
    }
    
    /**
     * Set visibility of all floors
     */
    public setAllFloorsVisible(visible: boolean): void {
        const floorplanData = this.callbacks.getFloorplanData();
        const floors = this.callbacks.getFloors();
        
        if (!floorplanData) return;
        
        floorplanData.floors.forEach((floor, index) => {
            this.floorVisibility.set(floor.id, visible);
            if (floors[index]) {
                floors[index].visible = visible;
            }
        });
        
        // Update UI checkboxes
        this.updateFloorListUI();
        this.callbacks.onVisibilityChange();
    }
    
    /**
     * Initialize floor visibility state when loading a new floorplan
     */
    public initFloorVisibility(): void {
        this.floorVisibility.clear();
        
        const floorplanData = this.callbacks.getFloorplanData();
        
        if (floorplanData) {
            // All floors visible by default
            floorplanData.floors.forEach(floor => {
                this.floorVisibility.set(floor.id, true);
            });
        }
        
        this.updateFloorListUI();
    }
}

