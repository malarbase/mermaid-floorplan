import { Show, For } from "solid-js";
import type { EntityProperties } from "~/hooks/useSelection";

interface PropertyDef {
  name: keyof EntityProperties;
  label: string;
  type: "text" | "number" | "readonly";
  step?: number;
  min?: number;
  max?: number;
}

const PROPERTY_DEFS: Record<string, PropertyDef[]> = {
  room: [
    { name: "name", label: "Name", type: "text" },
    { name: "x", label: "X", type: "number", step: 0.5 },
    { name: "y", label: "Y", type: "number", step: 0.5 },
    { name: "width", label: "Width", type: "number", step: 0.5, min: 0.5 },
    { name: "height", label: "Height", type: "number", step: 0.5, min: 0.5 },
  ],
  wall: [
    { name: "name", label: "Name", type: "readonly" },
    { name: "x", label: "X", type: "readonly" },
    { name: "y", label: "Y", type: "readonly" },
  ],
  furniture: [
    { name: "name", label: "Name", type: "text" },
    { name: "x", label: "X", type: "number", step: 0.5 },
    { name: "y", label: "Y", type: "number", step: 0.5 },
    { name: "rotation", label: "Rotation", type: "number", step: 15, min: 0, max: 360 },
  ],
};

interface PropertiesPanelProps {
  /** Whether something is selected */
  hasSelection: boolean;
  /** Entity type (e.g., "room", "wall") */
  entityType: string;
  /** Entity ID (e.g., "LivingRoom") */
  entityId: string;
  /** Extracted property values */
  properties: EntityProperties;
  /** Called when a property value changes */
  onPropertyChange?: (property: string, value: any) => void;
}

/**
 * Properties panel -- pure presentational component.
 * Receives selection data as props. Collapses to a header when nothing is selected,
 * expands with a 2-column property grid when an entity is selected.
 */
export default function PropertiesPanel(props: PropertiesPanelProps) {
  const getDefs = () => PROPERTY_DEFS[props.entityType] || [];

  return (
    <div class="border-t border-base-300 bg-base-100">
      {/* Header - always visible */}
      <div class="flex items-center gap-2 px-3 py-2">
        <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
          Properties
        </span>
        <Show when={props.hasSelection}>
          <span class="text-xs text-base-content/70">
            — {props.entityType}: {props.entityId}
          </span>
        </Show>
        <Show when={!props.hasSelection}>
          <span class="text-xs text-base-content/40 italic">No selection</span>
        </Show>
      </div>

      {/* Property fields - shown only when something is selected */}
      <Show when={props.hasSelection}>
        <div class="px-3 pb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <For each={getDefs()}>
            {(def) => (
              <div class={`form-control ${def.name === "name" ? "col-span-2" : ""}`}>
                <label class="label py-0.5">
                  <span class="label-text text-xs text-base-content/60">{def.label}</span>
                </label>
                {def.type === "readonly" ? (
                  <span class="text-sm text-base-content/80 px-2 py-1">
                    {props.properties[def.name] ?? "—"}
                  </span>
                ) : def.type === "number" ? (
                  <input
                    type="number"
                    class="input input-xs input-bordered w-full"
                    value={props.properties[def.name] ?? ""}
                    step={def.step}
                    min={def.min}
                    max={def.max}
                    onChange={(e) =>
                      props.onPropertyChange?.(def.name, parseFloat(e.target.value))
                    }
                  />
                ) : (
                  <input
                    type="text"
                    class="input input-xs input-bordered w-full"
                    value={props.properties[def.name] ?? ""}
                    onChange={(e) => props.onPropertyChange?.(def.name, e.target.value)}
                  />
                )}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
