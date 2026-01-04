/**
 * Annotation Manager - Handles area labels, dimension labels, and floor summaries
 */
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { DIMENSIONS, METERS_TO_UNIT, type LengthUnit } from 'floorplan-3d-core';
import type { JsonExport, JsonConfig } from 'floorplan-3d-core';

// Area unit type
export type AreaUnit = 'sqft' | 'sqm';

// Annotation state
export interface AnnotationState {
    showArea: boolean;
    showDimensions: boolean;
    showFloorSummary: boolean;
    areaUnit: AreaUnit;
    lengthUnit: LengthUnit;
}

export interface AnnotationCallbacks {
    getFloors: () => THREE.Group[];
    getFloorplanData: () => JsonExport | null;
    getConfig: () => JsonConfig;
    getFloorVisibility: (id: string) => boolean;
}

export class AnnotationManager {
    private areaLabels: CSS2DObject[] = [];
    private dimensionLabels: CSS2DObject[] = [];
    private floorSummaryPanel: HTMLElement | null = null;
    
    public state: AnnotationState = {
        showArea: false,
        showDimensions: false,
        showFloorSummary: false,
        areaUnit: 'sqft',
        lengthUnit: 'ft',
    };
    
    constructor(private callbacks: AnnotationCallbacks) {
        this.createFloorSummaryPanel();
    }
    
    /**
     * Setup UI control event listeners
     */
    public setupControls(): void {
        const showAreaToggle = document.getElementById('show-area') as HTMLInputElement;
        showAreaToggle?.addEventListener('change', (e) => {
            this.state.showArea = (e.target as HTMLInputElement).checked;
            this.updateAreaAnnotations();
        });
        
        const showDimensionsToggle = document.getElementById('show-dimensions') as HTMLInputElement;
        showDimensionsToggle?.addEventListener('change', (e) => {
            this.state.showDimensions = (e.target as HTMLInputElement).checked;
            this.updateDimensionAnnotations();
        });
        
        const showFloorSummaryToggle = document.getElementById('show-floor-summary') as HTMLInputElement;
        showFloorSummaryToggle?.addEventListener('change', (e) => {
            this.state.showFloorSummary = (e.target as HTMLInputElement).checked;
            this.updateFloorSummary();
        });
        
        // Unit dropdowns
        const areaUnitSelect = document.getElementById('area-unit') as HTMLSelectElement;
        areaUnitSelect?.addEventListener('change', (e) => {
            this.state.areaUnit = (e.target as HTMLSelectElement).value as AreaUnit;
            this.updateAreaAnnotations();
            this.updateFloorSummary();
        });
        
        const lengthUnitSelect = document.getElementById('length-unit') as HTMLSelectElement;
        lengthUnitSelect?.addEventListener('change', (e) => {
            this.state.lengthUnit = (e.target as HTMLSelectElement).value as LengthUnit;
            this.updateDimensionAnnotations();
        });
    }
    
    /**
     * Initialize unit settings from config
     */
    public initFromConfig(config: JsonConfig): void {
        if (config.area_unit === 'sqm') {
            this.state.areaUnit = 'sqm';
            const areaUnitSelect = document.getElementById('area-unit') as HTMLSelectElement;
            if (areaUnitSelect) areaUnitSelect.value = 'sqm';
        }
        if (config.default_unit) {
            const unit = config.default_unit as LengthUnit;
            if (['m', 'ft', 'cm', 'in', 'mm'].includes(unit)) {
                this.state.lengthUnit = unit;
                const lengthUnitSelect = document.getElementById('length-unit') as HTMLSelectElement;
                if (lengthUnitSelect) lengthUnitSelect.value = unit;
            }
        }
    }
    
    /**
     * Update all annotations
     */
    public updateAll(): void {
        this.updateAreaAnnotations();
        this.updateDimensionAnnotations();
        this.updateFloorSummary();
    }
    
    /**
     * Create the floor summary panel element
     */
    private createFloorSummaryPanel(): void {
        this.floorSummaryPanel = document.createElement('div');
        this.floorSummaryPanel.id = 'floor-summary-panel';
        this.floorSummaryPanel.className = 'floor-summary-panel';
        this.floorSummaryPanel.style.display = 'none';
        document.body.appendChild(this.floorSummaryPanel);
    }
    
    /**
     * Update the floor summary panel content
     */
    public updateFloorSummary(): void {
        const floorplanData = this.callbacks.getFloorplanData();
        
        if (!this.floorSummaryPanel || !floorplanData) return;
        
        if (!this.state.showFloorSummary) {
            this.floorSummaryPanel.style.display = 'none';
            return;
        }
        
        this.floorSummaryPanel.style.display = 'block';
        
        const floors = floorplanData.floors;
        // Filter to only visible floors
        const visibleFloors = floors.filter(floor => this.callbacks.getFloorVisibility(floor.id));
        
        let html = '<div class="floor-summary-title">Floor Summary</div>';
        
        if (visibleFloors.length === 0) {
            html += '<div class="no-floors-message">No visible floors</div>';
        } else {
            visibleFloors.forEach((floor) => {
                const roomCount = floor.rooms.length;
                let totalArea = 0;
                let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
                
                floor.rooms.forEach(room => {
                    totalArea += room.width * room.height;
                    minX = Math.min(minX, room.x);
                    maxX = Math.max(maxX, room.x + room.width);
                    minZ = Math.min(minZ, room.z);
                    maxZ = Math.max(maxZ, room.z + room.height);
                });
                
                const boundingArea = (maxX - minX) * (maxZ - minZ);
                const efficiency = boundingArea > 0 ? (totalArea / boundingArea * 100).toFixed(1) : 0;
                
                const areaDisplay = this.formatArea(totalArea);
                
                html += `
                    <div class="floor-summary-item">
                        <div class="floor-name">${floor.id}</div>
                        <div class="floor-stats">
                            <span>Rooms: ${roomCount}</span>
                            <span>Area: ${areaDisplay}</span>
                            <span>Efficiency: ${efficiency}%</span>
                        </div>
                    </div>
                `;
            });
        }
        
        this.floorSummaryPanel.innerHTML = html;
    }
    
    /**
     * Format an area value based on current unit setting
     */
    public formatArea(areaInMeters: number): string {
        if (this.state.areaUnit === 'sqm') {
            return `${areaInMeters.toFixed(1)} sqm`;
        } else {
            // Convert to square feet
            const sqft = areaInMeters * 10.7639;
            return `${sqft.toFixed(0)} sqft`;
        }
    }
    
    /**
     * Format a length value based on current unit setting
     */
    public formatLength(lengthInMeters: number): string {
        const unit = this.state.lengthUnit;
        const converted = lengthInMeters * METERS_TO_UNIT[unit];
        
        if (unit === 'ft') {
            return `${converted.toFixed(1)}ft`;
        } else if (unit === 'm') {
            return `${converted.toFixed(2)}m`;
        } else if (unit === 'cm') {
            return `${converted.toFixed(0)}cm`;
        } else if (unit === 'in') {
            return `${converted.toFixed(1)}in`;
        } else {
            return `${converted.toFixed(0)}mm`;
        }
    }
    
    /**
     * Update area annotations (labels showing room areas)
     */
    public updateAreaAnnotations(): void {
        const floors = this.callbacks.getFloors();
        const floorplanData = this.callbacks.getFloorplanData();
        
        // Remove existing labels
        this.areaLabels.forEach(label => {
            label.parent?.remove(label);
            label.element.remove();
        });
        this.areaLabels = [];
        
        if (!this.state.showArea || !floorplanData) return;
        
        floorplanData.floors.forEach((floor, floorIndex) => {
            floor.rooms.forEach(room => {
                const area = room.width * room.height;
                const areaText = this.formatArea(area);
                
                // Create label element
                const labelDiv = document.createElement('div');
                labelDiv.className = 'area-label';
                labelDiv.textContent = areaText;
                
                const label = new CSS2DObject(labelDiv);
                const centerX = room.x + room.width / 2;
                const centerZ = room.z + room.height / 2;
                // Use local coordinates (relative to floor group)
                const y = (room.elevation || 0) + 0.5;
                
                label.position.set(centerX, y, centerZ);
                floors[floorIndex]?.add(label);
                this.areaLabels.push(label);
            });
        });
    }
    
    /**
     * Update dimension annotations (labels showing room dimensions)
     */
    public updateDimensionAnnotations(): void {
        const floors = this.callbacks.getFloors();
        const floorplanData = this.callbacks.getFloorplanData();
        const config = this.callbacks.getConfig();
        
        // Remove existing labels
        this.dimensionLabels.forEach(label => {
            label.parent?.remove(label);
            label.element.remove();
        });
        this.dimensionLabels = [];
        
        if (!this.state.showDimensions || !floorplanData) return;
        
        const globalDefault = config.default_height ?? DIMENSIONS.WALL.HEIGHT;
        
        floorplanData.floors.forEach((floor, floorIndex) => {
            const floorHeight = floor.height ?? globalDefault;
            
            floor.rooms.forEach(room => {
                // Width label (above room, along X axis)
                const widthText = this.formatLength(room.width);
                const widthDiv = document.createElement('div');
                widthDiv.className = 'dimension-label width-label';
                widthDiv.textContent = `w: ${widthText}`;
                
                const widthLabel = new CSS2DObject(widthDiv);
                // Use local coordinates (relative to floor group)
                const y = (room.elevation || 0) + 0.3;
                widthLabel.position.set(room.x + room.width / 2, y, room.z - 0.5);
                floors[floorIndex]?.add(widthLabel);
                this.dimensionLabels.push(widthLabel);
                
                // Depth label (beside room, along Z axis)
                const depthText = this.formatLength(room.height);
                const depthDiv = document.createElement('div');
                depthDiv.className = 'dimension-label depth-label';
                depthDiv.textContent = `d: ${depthText}`;
                
                const depthLabel = new CSS2DObject(depthDiv);
                depthLabel.position.set(room.x - 0.5, y, room.z + room.height / 2);
                floors[floorIndex]?.add(depthLabel);
                this.dimensionLabels.push(depthLabel);
                
                // Height label (only if non-default)
                const roomHeight = room.roomHeight ?? floorHeight;
                if (roomHeight !== floorHeight) {
                    const heightText = this.formatLength(roomHeight);
                    const heightDiv = document.createElement('div');
                    heightDiv.className = 'dimension-label height-label';
                    heightDiv.textContent = `h: ${heightText}`;
                    
                    const heightLabel = new CSS2DObject(heightDiv);
                    heightLabel.position.set(room.x + room.width / 2, y + roomHeight / 2, room.z + room.height / 2);
                    floors[floorIndex]?.add(heightLabel);
                    this.dimensionLabels.push(heightLabel);
                }
            });
        });
    }
}

