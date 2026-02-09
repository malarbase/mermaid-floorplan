import { Show, For } from "solid-js";
import type { PropertyDefinition } from "~/hooks/useSelection";

interface PropertiesPanelProps {
  /** Whether something is selected */
  hasSelection: boolean;
  /** Entity type (e.g., "room", "wall") */
  entityType: string;
  /** Entity ID (e.g., "LivingRoom") */
  entityId: string;
  /** Rich property definitions (from useSelection) */
  propertyDefs: PropertyDefinition[];
  /** Called when a property value changes */
  onPropertyChange?: (property: string, value: any) => void;
}

/**
 * Properties panel -- pure presentational component.
 * Receives selection data as props. Collapses to a header when nothing is selected,
 * expands with a 2-column property grid when an entity is selected.
 * 
 * Supports: text, number, select, readonly field types.
 */
export default function PropertiesPanel(props: PropertiesPanelProps) {
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
      <Show when={props.hasSelection && props.propertyDefs.length > 0}>
        <div class="px-3 pb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <For each={props.propertyDefs}>
            {(def) => (
              <div class={`form-control ${def.name === "name" ? "col-span-2" : ""}`}>
                <label class="label py-0.5">
                  <span class="label-text text-xs text-base-content/60">{def.label}</span>
                </label>
                {renderField(def, props.onPropertyChange)}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

function renderField(
  def: PropertyDefinition,
  onPropertyChange?: (property: string, value: any) => void,
) {
  switch (def.type) {
    case "readonly":
      return (
        <span class="text-sm text-base-content/80 px-2 py-1">
          {def.value ?? "—"}
        </span>
      );

    case "select":
      return (
        <select
          class="select select-xs select-bordered w-full"
          value={String(def.value ?? "")}
          onChange={(e) => onPropertyChange?.(def.name, e.target.value)}
        >
          <For each={def.options ?? []}>
            {(opt) => (
              <option value={opt.value}>{opt.label}</option>
            )}
          </For>
        </select>
      );

    case "number":
      return (
        <input
          type="number"
          class="input input-xs input-bordered w-full"
          value={def.value ?? ""}
          step={def.step}
          min={def.min}
          max={def.max}
          onChange={(e) => onPropertyChange?.(def.name, parseFloat(e.target.value))}
        />
      );

    default: // "text"
      return (
        <input
          type="text"
          class="input input-xs input-bordered w-full"
          value={def.value ?? ""}
          onChange={(e) => onPropertyChange?.(def.name, e.target.value)}
        />
      );
  }
}
