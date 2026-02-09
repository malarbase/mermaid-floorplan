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

// ============================================================================
// Property Definition types (ported from floorplan-viewer-core)
// ============================================================================

export interface PropertyOption {
  value: string;
  label: string;
}

export type PropertyType = "text" | "number" | "select" | "readonly";

export interface PropertyDefinition {
  name: string;
  label: string;
  type: PropertyType;
  value?: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: PropertyOption[];
  tooltip?: string;
}

// ============================================================================
// Selection State
// ============================================================================

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
  /** Count of each entity type selected (e.g., { room: 1, wall: 2 }) */
  typeCounts: Record<string, number>;
  /** Human-readable summary (e.g., "1 room, 2 walls") */
  summary: string;
  /** Entity names (when <= 3 selected) */
  entityNames: string[];
  /** Property definitions for the primary entity (built via getEntityData callback) */
  propertyDefs: PropertyDefinition[];
}

const EMPTY_STATE: SelectionState = {
  entities: [],
  count: 0,
  hasSelection: false,
  primary: null,
  primaryType: "",
  primaryId: "",
  primaryFloorId: "",
  typeCounts: {},
  summary: "",
  entityNames: [],
  propertyDefs: [],
};

/**
 * Callback to get entity data for the properties panel.
 * Returns a data dictionary for the given entity, used to build property definitions.
 */
export type GetEntityDataFn = (entityType: string, entityId: string) => Record<string, unknown>;

/**
 * Subscribe to selection changes from the 3D viewer core.
 * 
 * Uses `createEffect` to wait for the core to become available (handles async init),
 * and `onCleanup` to properly unsubscribe when the component unmounts or core changes.
 * 
 * @param core - Accessor returning the viewer core instance (may be null during loading)
 * @param getEntityData - Optional callback to get entity data for property definitions
 * @returns Accessor for the current SelectionState
 */
export function useSelection(
  core: Accessor<any>,
  getEntityData?: GetEntityDataFn,
): Accessor<SelectionState> {
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

    const unsub = sm.onSelectionChange((event: any) => {
      const selection: ReadonlySet<any> = event.selection;
      const arr = Array.from(selection);
      const primary = arr[0] ?? null;

      // Build type counts and summary
      const typeCounts: Record<string, number> = {};
      for (const entity of arr) {
        const t = entity.entityType ?? "unknown";
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      }

      const summary = Object.entries(typeCounts)
        .map(([type, cnt]) => `${cnt} ${type}${cnt > 1 ? "s" : ""}`)
        .join(", ");

      // Entity names (show when 3 or fewer)
      const entityNames = arr.length <= 3
        ? arr.map((e) => e.entityId ?? "")
        : [];

      // Build property definitions for primary entity
      let propertyDefs: PropertyDefinition[] = [];
      if (primary && getEntityData) {
        try {
          const data = getEntityData(primary.entityType, primary.entityId);
          propertyDefs = buildPropertyDefinitions(primary.entityType, data);
        } catch {
          // Fallback: basic properties from mesh
          propertyDefs = buildFallbackPropertyDefs(primary);
        }
      } else if (primary) {
        // No getEntityData callback -- use fallback mesh extraction
        propertyDefs = buildFallbackPropertyDefs(primary);
      }

      setState({
        entities: arr,
        count: arr.length,
        hasSelection: arr.length > 0,
        primary,
        primaryType: primary?.entityType ?? "",
        primaryId: primary?.entityId ?? "",
        primaryFloorId: primary?.floorId ?? "",
        typeCounts,
        summary,
        entityNames,
        propertyDefs,
      });
    });

    onCleanup(() => {
      unsub?.();
      setState(EMPTY_STATE);
    });
  });

  return state;
}

// ============================================================================
// Property Definition Builders
// ============================================================================

/**
 * Build rich property definitions from entity data (ported from viewer-core).
 * Supports room, wall, connection entity types with appropriate field types.
 */
function buildPropertyDefinitions(entityType: string, data: Record<string, unknown>): PropertyDefinition[] {
  const props: PropertyDefinition[] = [];

  if (entityType === "room") {
    props.push({ name: "name", label: "Name", type: "text", value: String(data.name ?? "") });
    props.push({ name: "x", label: "X", type: "number", value: Number(data.x ?? 0), step: 0.5 });
    props.push({ name: "y", label: "Y", type: "number", value: Number(data.y ?? 0), step: 0.5 });
    props.push({ name: "width", label: "Width", type: "number", value: Number(data.width ?? 4), min: 0.5, step: 0.5 });
    props.push({ name: "height", label: "Height", type: "number", value: Number(data.height ?? 4), min: 0.5, step: 0.5 });
    if (data.roomHeight) {
      props.push({ name: "roomHeight", label: "Room Height", type: "number", value: Number(data.roomHeight), min: 0.5, step: 0.1 });
    }
    if (data.style) {
      props.push({ name: "style", label: "Style", type: "text", value: String(data.style) });
    }
  } else if (entityType === "wall") {
    props.push({ name: "room", label: "Room", type: "readonly", value: String(data.room ?? "") });
    props.push({ name: "direction", label: "Direction", type: "readonly", value: String(data.direction ?? "") });
    props.push({
      name: "type",
      label: "Type",
      type: "select",
      value: String(data.type ?? "solid"),
      options: [
        { value: "solid", label: "Solid" },
        { value: "open", label: "Open" },
        { value: "glass", label: "Glass" },
      ],
    });
  } else if (entityType === "connection") {
    props.push({ name: "fromRoom", label: "From Room", type: "readonly", value: String(data.fromRoom ?? "") });
    props.push({ name: "toRoom", label: "To Room", type: "readonly", value: String(data.toRoom ?? "") });
    props.push({
      name: "type",
      label: "Type",
      type: "select",
      value: String(data.type ?? "door"),
      options: [
        { value: "door", label: "Door" },
        { value: "archway", label: "Archway" },
        { value: "opening", label: "Opening" },
      ],
    });
    props.push({ name: "position", label: "Position %", type: "number", value: Number(data.position ?? 50), min: 0, max: 100 });
  } else {
    // Generic fallback for unknown entity types
    props.push({ name: "name", label: "Name", type: "readonly", value: String(data.name ?? "") });
  }

  return props;
}

/**
 * Fallback: build basic property definitions from the Three.js mesh
 * when no getEntityData callback is available.
 */
function buildFallbackPropertyDefs(entity: any): PropertyDefinition[] {
  const mesh = entity.mesh;
  const props: PropertyDefinition[] = [];

  props.push({ name: "name", label: "Name", type: "readonly", value: entity.entityId ?? "" });
  props.push({ name: "type", label: "Type", type: "readonly", value: entity.entityType ?? "" });

  if (mesh?.position) {
    props.push({ name: "x", label: "X", type: "readonly", value: roundTo(mesh.position.x, 2) });
    props.push({ name: "y", label: "Y", type: "readonly", value: roundTo(mesh.position.z, 2) });
  }

  return props;
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
