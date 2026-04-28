/**
 * Layer Visibility Manager - Handles render-layer visibility (floors, walls,
 * connections, stairs, lifts) without rebuilding the scene.
 *
 * Works by toggling `.visible` on child groups that carry a `userData.layer`
 * tag stamped by `buildFloorplanSceneFromNormalized` in `floorplan-3d-core`.
 * Three.js propagates parent visibility to children automatically, so this
 * composes correctly with `FloorManager`'s per-floor visibility without any
 * extra coordination.
 *
 * Desired visibility state persists across `loadFloorplan` calls, so user
 * toggle choices survive new files being loaded.
 */

import type * as THREE from 'three';

export type Layer = 'floor' | 'wall' | 'connection' | 'stair' | 'lift';

export const ALL_LAYERS: Layer[] = ['floor', 'wall', 'connection', 'stair', 'lift'];

export interface LayerVisibilityManagerOptions {
  /**
   * Called when a layer is hidden (visible set to false).
   * Consumers can wire this to clear any selections whose meshes belong
   * to the hidden layer.
   */
  onLayerHidden?: (layer: Layer) => void;
}

export class LayerVisibilityManager {
  private desiredVisibility = new Map<Layer, boolean>(ALL_LAYERS.map((l) => [l, true]));
  private _floors: readonly THREE.Group[] = [];
  private readonly onLayerHidden?: (layer: Layer) => void;

  constructor(options: LayerVisibilityManagerOptions = {}) {
    this.onLayerHidden = options.onLayerHidden;
  }

  /**
   * (Re-)index a fresh set of floor groups after a `loadFloorplan` call.
   * Applies the current desired visibility state to every tagged child so
   * that user toggle choices survive across floorplan reloads.
   */
  initLayerVisibility(floors: readonly THREE.Group[]): void {
    this._floors = floors;
    for (const floorGroup of this._floors) {
      this.applyToFloor(floorGroup);
    }
  }

  /**
   * Show or hide all scene objects tagged with `layer`.
   * Fires `onLayerHidden` callback when hiding so consumers can clear stale
   * selections.
   */
  setLayerVisible(layer: Layer, visible: boolean): void {
    this.desiredVisibility.set(layer, visible);
    for (const floorGroup of this._floors) {
      this.applyToFloor(floorGroup);
    }
    if (!visible) {
      this.onLayerHidden?.(layer);
    }
  }

  /** Returns the current desired visibility for `layer` (default: true). */
  isLayerVisible(layer: Layer): boolean {
    return this.desiredVisibility.get(layer) ?? true;
  }

  /**
   * Apply desired layer visibility to a single floor group's direct children.
   * Called automatically by `initLayerVisibility` and `setLayerVisible`;
   * also safe to call externally after custom floor-group manipulation.
   */
  applyToFloor(floorGroup: THREE.Group): void {
    for (const child of floorGroup.children) {
      const layer = child.userData.layer as Layer | undefined;
      if (layer !== undefined) {
        child.visible = this.desiredVisibility.get(layer) ?? true;
      }
    }
  }
}
