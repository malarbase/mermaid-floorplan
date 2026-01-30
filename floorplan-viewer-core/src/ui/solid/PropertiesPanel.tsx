/**
 * PropertiesPanel - Solid.js Properties Panel Component
 *
 * A panel for displaying and editing entity properties with:
 * - Dynamic property rendering (text, number, select, readonly)
 * - Real-time value updates
 * - Delete action
 *
 * Features:
 * - Reactive state with createSignal()
 * - Automatic form generation from property definitions
 * - Type-safe property changes
 */

import { createSignal, createEffect, For, Show, createMemo } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

export type PropertyType = 'text' | 'number' | 'select' | 'readonly';

export interface PropertyOption {
  value: string;
  label: string;
}

export interface PropertyDefinition {
  name: string;
  label: string;
  type: PropertyType;
  value?: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: PropertyOption[];
}

export interface PropertiesPanelProps {
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Entity type being edited */
  entityType?: string;
  /** Entity ID being edited */
  entityId?: string;
  /** Property definitions */
  properties?: PropertyDefinition[];
  /** Callback when a property value changes */
  onPropertyChange?: (property: string, value: string) => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
  /** Callback when panel is closed */
  onClose?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function PropertiesPanel(props: PropertiesPanelProps) {
  // Track local property values for controlled inputs
  const [localValues, setLocalValues] = createSignal<Record<string, string | number>>({});

  // Initialize local values when properties change
  createEffect(() => {
    if (props.properties) {
      const values: Record<string, string | number> = {};
      for (const prop of props.properties) {
        values[prop.name] = prop.value ?? '';
      }
      setLocalValues(values);
    }
  });

  // Handle property change
  const handleChange = (property: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [property]: value }));
    props.onPropertyChange?.(property, value);
  };

  // Get local value for a property
  const getValue = (name: string): string => {
    return String(localValues()[name] ?? '');
  };

  return (
    <Show when={props.isVisible}>
      <div class="fp-properties-panel visible">
        <div class="p-3">
          {/* Title */}
          <div class="text-xs font-semibold text-base-content/60 mb-3 pb-2 border-b border-base-content/10">
            {props.entityType}: {props.entityId}
          </div>

          {/* Property Form */}
          <div class="space-y-2">
            <For each={props.properties}>
              {(prop) => (
                <div class="flex items-center gap-2">
                  <span class="text-xs text-base-content/70 w-12 flex-shrink-0">{prop.label}</span>

                  {/* Readonly */}
                  <Show when={prop.type === 'readonly'}>
                    <span class="text-xs text-base-content/50 flex-1">
                      {getValue(prop.name)}
                    </span>
                  </Show>

                  {/* Select */}
                  <Show when={prop.type === 'select' && prop.options}>
                    <select
                      class="select select-xs select-bordered flex-1 bg-base-200"
                      name={prop.name}
                      value={getValue(prop.name)}
                      onChange={(e) => handleChange(prop.name, e.currentTarget.value)}
                    >
                      <For each={prop.options}>
                        {(opt) => (
                          <option value={opt.value}>{opt.label}</option>
                        )}
                      </For>
                    </select>
                  </Show>

                  {/* Text Input */}
                  <Show when={prop.type === 'text'}>
                    <input
                      class="input input-xs input-bordered flex-1 bg-base-200"
                      type="text"
                      name={prop.name}
                      value={getValue(prop.name)}
                      onChange={(e) => handleChange(prop.name, e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                          handleChange(prop.name, e.currentTarget.value);
                        }
                      }}
                    />
                  </Show>

                  {/* Number Input */}
                  <Show when={prop.type === 'number'}>
                    <input
                      class="input input-xs input-bordered flex-1 bg-base-200 w-16"
                      type="number"
                      name={prop.name}
                      value={getValue(prop.name)}
                      min={prop.min}
                      max={prop.max}
                      step={prop.step}
                      onChange={(e) => handleChange(prop.name, e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                          handleChange(prop.name, e.currentTarget.value);
                        }
                      }}
                    />
                  </Show>
                </div>
              )}
            </For>
          </div>

          {/* Actions */}
          <div class="mt-3 pt-2 border-t border-base-content/10">
            <button
              class="btn btn-xs btn-error w-full"
              onClick={() => props.onDelete?.()}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}

export default PropertiesPanel;
