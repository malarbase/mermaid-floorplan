/**
 * Reactive hook for subscribing to 3D selection changes.
 * 
 * Wraps the SelectionManager's onSelectionChange API into Solid.js signals,
 * handling subscription lifecycle (createEffect + onCleanup) and data extraction.
 * 
 * Components using this hook become presentational -- they receive selection
 * data as reactive signals rather than reaching into the core API.
 */

import { createSignal, createEffect, onCleanup, type Accessor } from "solid-js";

/** Property values extracted from the selected entity's mesh */
export interface EntityProperties {
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
}

/** The reactive selection state returned by useSelection */
export interface SelectionState {
  /** All selected entities */
  entities: any[];
  /** Number of selected entities */
  count: number;
  /** Whether anything is selected */
  hasSelection: boolean;
  /** The first (primary) selected entity, or null */
  primary: any | null;
  /** Entity type of primary selection (e.g., "room", "wall") */
  primaryType: string;
  /** Entity ID of primary selection (e.g., "LivingRoom") */
  primaryId: string;
  /** Floor ID of primary selection */
  primaryFloorId: string;
  /** Extracted properties from the primary entity */
  properties: EntityProperties;
}

const EMPTY_STATE: SelectionState = {
  entities: [],
  count: 0,
  hasSelection: false,
  primary: null,
  primaryType: "",
  primaryId: "",
  primaryFloorId: "",
  properties: { name: "", x: 0, y: 0 },
};

/**
 * Subscribe to selection changes from the 3D viewer core.
 * 
 * Uses `createEffect` to wait for the core to become available (handles async init),
 * and `onCleanup` to properly unsubscribe when the component unmounts or core changes.
 * 
 * @param core - Accessor returning the viewer core instance (may be null during loading)
 * @returns Accessor for the current SelectionState
 * 
 * @example
 * ```tsx
 * const selection = useSelection(() => props.core);
 * 
 * return (
 *   <Show when={selection().hasSelection}>
 *     <div>Selected: {selection().primaryId}</div>
 *   </Show>
 * );
 * ```
 */
export function useSelection(core: Accessor<any>): Accessor<SelectionState> {
  const [state, setState] = createSignal<SelectionState>(EMPTY_STATE);

  createEffect(() => {
    const c = core();
    if (!c) {
      setState(EMPTY_STATE);
      return;
    }

    const sm = c.getSelectionManager?.();
    if (!sm || typeof sm.onSelectionChange !== "function") {
      return;
    }

    // Register the listener -- onSelectionChange returns an unsubscribe function
    const unsub = sm.onSelectionChange((event: any) => {
      const selection: ReadonlySet<any> = event.selection;
      const arr = Array.from(selection);
      const primary = arr[0] ?? null;

      setState({
        entities: arr,
        count: arr.length,
        hasSelection: arr.length > 0,
        primary,
        primaryType: primary?.entityType ?? "",
        primaryId: primary?.entityId ?? "",
        primaryFloorId: primary?.floorId ?? "",
        properties: extractProperties(primary),
      });
    });

    onCleanup(() => {
      unsub?.();
      setState(EMPTY_STATE);
    });
  });

  return state;
}

/**
 * Extract editable properties from a SelectableObject.
 * 
 * Uses the Three.js mesh's position for spatial data.
 * Width/height are derived from the mesh's scale or bounding box when available.
 */
function extractProperties(entity: any): EntityProperties {
  if (!entity) return { name: "", x: 0, y: 0 };

  const mesh = entity.mesh;
  const props: EntityProperties = {
    name: entity.entityId || "",
    x: roundTo(mesh?.position?.x ?? 0, 2),
    y: roundTo(mesh?.position?.z ?? 0, 2),
  };

  // For rooms, try to derive width/height from mesh geometry or scale
  if (entity.entityType === "room" && mesh) {
    // Try bounding box first (already computed geometries)
    const geo = mesh.geometry ?? mesh.children?.[0]?.geometry;
    if (geo) {
      if (!geo.boundingBox) geo.computeBoundingBox?.();
      if (geo.boundingBox) {
        const bb = geo.boundingBox;
        const scaleX = mesh.scale?.x ?? 1;
        const scaleZ = mesh.scale?.z ?? 1;
        props.width = roundTo(Math.abs(bb.max.x - bb.min.x) * scaleX, 2);
        props.height = roundTo(Math.abs(bb.max.z - bb.min.z) * scaleZ, 2);
      }
    }
  }

  if (entity.entityType === "furniture") {
    const yRot = mesh?.rotation?.y ?? 0;
    props.rotation = Math.round((yRot * 180) / Math.PI);
  }

  return props;
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
