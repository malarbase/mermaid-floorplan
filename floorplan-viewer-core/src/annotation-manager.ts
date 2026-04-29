/**
 * Annotation Manager - Handles area labels, dimension labels, and floor summaries
 */

import type { JsonConfig, JsonExport, JsonStair } from 'floorplan-3d-core';
import { DIMENSIONS, type LengthUnit, METERS_TO_UNIT } from 'floorplan-3d-core';
import type * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

// Area unit type
export type AreaUnit = 'sqft' | 'sqm' | 'cent';

// Annotation state
export interface AnnotationState {
  showRoomName: boolean;
  showArea: boolean;
  showDimensions: boolean;
  showFloorSummary: boolean;
  showStairInfo: boolean;
  areaUnit: AreaUnit;
  lengthUnit: LengthUnit;
}

export interface AnnotationCallbacks {
  getFloors: () => THREE.Group[];
  getFloorplanData: () => JsonExport | null;
  getConfig: () => JsonConfig;
  getFloorVisibility: (id: string) => boolean;
  /** Container for overlay UI elements. If provided, floor summary panel is appended here instead of document.body. */
  overlayContainer?: HTMLElement;
}

export class AnnotationManager {
  private roomLabels: CSS2DObject[] = [];
  private stairLabels: CSS2DObject[] = [];
  private dimensionLabels: CSS2DObject[] = [];
  private floorSummaryPanel: HTMLElement | null = null;
  /** Whether the floor summary panel was dynamically created (vs. pre-existing in HTML) */
  private dynamicallyCreated: boolean = false;

  public state: AnnotationState = {
    showRoomName: true,
    showArea: false,
    showDimensions: false,
    showFloorSummary: false,
    showStairInfo: false,
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
      this.updateRoomLabels();
    });

    const showDimensionsToggle = document.getElementById('show-dimensions') as HTMLInputElement;
    showDimensionsToggle?.addEventListener('change', (e) => {
      this.state.showDimensions = (e.target as HTMLInputElement).checked;
      this.updateDimensionAnnotations();
    });

    const showFloorSummaryToggle = document.getElementById(
      'show-floor-summary',
    ) as HTMLInputElement;
    showFloorSummaryToggle?.addEventListener('change', (e) => {
      this.state.showFloorSummary = (e.target as HTMLInputElement).checked;
      this.updateFloorSummary();
    });

    const showStairInfoToggle = document.getElementById('show-stair-info') as HTMLInputElement;
    showStairInfoToggle?.addEventListener('change', (e) => {
      this.state.showStairInfo = (e.target as HTMLInputElement).checked;
      this.updateStairAnnotations();
    });

    // Unit dropdowns
    const areaUnitSelect = document.getElementById('area-unit') as HTMLSelectElement;
    areaUnitSelect?.addEventListener('change', (e) => {
      this.state.areaUnit = (e.target as HTMLSelectElement).value as AreaUnit;
      this.updateRoomLabels();
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
    if (config.area_unit === 'sqm' || config.area_unit === 'cent') {
      this.state.areaUnit = config.area_unit as AreaUnit;
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
    this.updateRoomLabels();
    this.updateStairAnnotations();
    this.updateDimensionAnnotations();
    this.updateFloorSummary();
  }

  /**
   * Create the floor summary panel element.
   * Appends to the overlay container if provided, otherwise falls back to document.body.
   */
  private createFloorSummaryPanel(): void {
    // Check if element already exists (e.g., in interactive-editor HTML)
    const existing =
      document.getElementById('floor-summary') || document.getElementById('floor-summary-panel');
    if (existing) {
      this.floorSummaryPanel = existing as HTMLElement;
      this.dynamicallyCreated = false;
      // Ensure it has the fp- class for shared styles
      existing.classList.add('fp-floor-summary-panel');
      return;
    }

    this.floorSummaryPanel = document.createElement('div');
    this.floorSummaryPanel.id = 'floor-summary-panel';
    this.floorSummaryPanel.className = 'fp-floor-summary-panel';
    // The floor summary panel needs pointer-events so users can interact with it
    this.floorSummaryPanel.style.pointerEvents = 'auto';
    this.dynamicallyCreated = true;

    const container = this.callbacks.overlayContainer ?? document.body;
    container.appendChild(this.floorSummaryPanel);
  }

  /**
   * Update the floor summary panel content
   */
  public updateFloorSummary(): void {
    const floorplanData = this.callbacks.getFloorplanData();

    if (!this.floorSummaryPanel || !floorplanData) return;

    if (!this.state.showFloorSummary) {
      this.floorSummaryPanel.classList.remove('visible');
      return;
    }

    this.floorSummaryPanel.classList.add('visible');

    const floors = floorplanData.floors;
    // Filter to only visible floors
    const visibleFloors = floors.filter((floor) => this.callbacks.getFloorVisibility(floor.id));

    let html = '<div class="floor-summary-title">Floor Summary</div>';

    if (visibleFloors.length === 0) {
      html += '<div class="no-floors-message">No visible floors</div>';
    } else {
      visibleFloors.forEach((floor) => {
        const roomCount = floor.rooms.length;
        let totalArea = 0;
        let minX = Infinity,
          maxX = -Infinity,
          minZ = Infinity,
          maxZ = -Infinity;

        floor.rooms.forEach((room) => {
          totalArea += room.width * room.height;
          minX = Math.min(minX, room.x);
          maxX = Math.max(maxX, room.x + room.width);
          minZ = Math.min(minZ, room.z);
          maxZ = Math.max(maxZ, room.z + room.height);
        });

        const boundingArea = (maxX - minX) * (maxZ - minZ);
        const efficiency = boundingArea > 0 ? ((totalArea / boundingArea) * 100).toFixed(1) : 0;

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
    } else if (this.state.areaUnit === 'cent') {
      const cents = areaInMeters / 40.4686;
      return `${cents.toFixed(2)} cent`;
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
   * Update room labels — a single merged CSS2DObject per room that can show
   * the room name, area, or both as independently-styled child elements.
   * Replaces the former separate updateRoomNameAnnotations / updateAreaAnnotations.
   */
  public updateRoomLabels(): void {
    const floors = this.callbacks.getFloors();
    const floorplanData = this.callbacks.getFloorplanData();

    this.roomLabels.forEach((label) => {
      label.parent?.remove(label);
      label.element.remove();
    });
    this.roomLabels = [];

    if (!this.state.showRoomName && !this.state.showArea) return;
    if (!floorplanData) return;

    floorplanData.floors.forEach((floor, floorIndex) => {
      floor.rooms.forEach((room) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'room-label';

        if (this.state.showRoomName) {
          const nameEl = document.createElement('div');
          nameEl.className = 'room-label__name';
          nameEl.textContent = room.label ?? room.name;
          wrapper.appendChild(nameEl);
        }

        if (this.state.showArea) {
          const areaEl = document.createElement('div');
          areaEl.className = 'room-label__area';
          areaEl.textContent = this.formatArea(room.width * room.height);
          wrapper.appendChild(areaEl);
        }

        const label = new CSS2DObject(wrapper);
        label.position.set(
          room.x + room.width / 2,
          (room.elevation || 0) + 0.6,
          room.z + room.height / 2,
        );
        floors[floorIndex]?.add(label);
        this.roomLabels.push(label);
      });
    });
  }

  /**
   * Compute total step count for a stair from its JSON definition.
   * Matches the formula used in generateStraightStair.
   */
  private computeStepCount(stair: JsonStair): number {
    if (stair.shape.segments) {
      return stair.shape.segments
        .filter((s) => s.type === 'flight')
        .reduce((sum, s) => sum + (s.steps ?? 0), 0);
    }
    const riserHeight = stair.riser ?? 0.18;
    return Math.round(stair.rise / riserHeight);
  }

  /**
   * Update stair info annotations — one label per stair showing name, step count, and rise.
   */
  public updateStairAnnotations(): void {
    const floors = this.callbacks.getFloors();
    const floorplanData = this.callbacks.getFloorplanData();

    this.stairLabels.forEach((label) => {
      label.parent?.remove(label);
      label.element.remove();
    });
    this.stairLabels = [];

    if (!this.state.showStairInfo || !floorplanData) return;

    floorplanData.floors.forEach((floor, floorIndex) => {
      (floor.stairs ?? []).forEach((stair) => {
        const stepCount = this.computeStepCount(stair);
        const riseText = this.formatLength(stair.rise);
        const displayName = stair.label ?? stair.name;

        const labelDiv = document.createElement('div');
        labelDiv.className = 'stair-info-label';

        const nameEl = document.createElement('div');
        nameEl.className = 'stair-info-label__name';
        nameEl.textContent = displayName;

        const stepsEl = document.createElement('div');
        stepsEl.className = 'stair-info-label__detail';
        stepsEl.textContent = `${stepCount} steps`;

        const riseEl = document.createElement('div');
        riseEl.className = 'stair-info-label__detail';
        riseEl.textContent = `${riseText} rise`;

        labelDiv.appendChild(nameEl);
        labelDiv.appendChild(stepsEl);
        labelDiv.appendChild(riseEl);

        const label = new CSS2DObject(labelDiv);
        label.position.set(stair.x, 0.9, stair.z);
        floors[floorIndex]?.add(label);
        this.stairLabels.push(label);
      });
    });
  }

  /**
   * Clean up resources: remove dynamically created DOM elements and CSS2D labels.
   */
  public dispose(): void {
    // Remove dynamically-created floor summary panel from DOM
    if (this.floorSummaryPanel && this.dynamicallyCreated) {
      this.floorSummaryPanel.remove();
    }
    this.floorSummaryPanel = null;

    // Remove CSS2D labels from scene
    for (const label of this.roomLabels) {
      label.parent?.remove(label);
      label.element.remove();
    }
    this.roomLabels = [];

    for (const label of this.stairLabels) {
      label.parent?.remove(label);
      label.element.remove();
    }
    this.stairLabels = [];

    for (const label of this.dimensionLabels) {
      label.parent?.remove(label);
      label.element.remove();
    }
    this.dimensionLabels = [];
  }

  /**
   * Update dimension annotations (labels showing room dimensions)
   */
  public updateDimensionAnnotations(): void {
    const floors = this.callbacks.getFloors();
    const floorplanData = this.callbacks.getFloorplanData();
    const config = this.callbacks.getConfig();

    // Remove existing labels
    this.dimensionLabels.forEach((label) => {
      label.parent?.remove(label);
      label.element.remove();
    });
    this.dimensionLabels = [];

    if (!this.state.showDimensions || !floorplanData) return;

    const globalDefault = config.default_height ?? DIMENSIONS.WALL.HEIGHT;

    floorplanData.floors.forEach((floor, floorIndex) => {
      const floorHeight = floor.height ?? globalDefault;

      floor.rooms.forEach((room) => {
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
          heightLabel.position.set(
            room.x + room.width / 2,
            y + roomHeight / 2,
            room.z + room.height / 2,
          );
          floors[floorIndex]?.add(heightLabel);
          this.dimensionLabels.push(heightLabel);
        }
      });
    });
  }
}
