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
        <div class="fp-properties-panel-content">
          {/* Title */}
          <div class="fp-properties-panel-title">
            {props.entityType}: {props.entityId}
          </div>

          {/* Property Form */}
          <div class="fp-properties-panel-form">
            <For each={props.properties}>
              {(prop) => (
                <div class="fp-property-row">
                  <span class="fp-property-label">{prop.label}</span>

                  {/* Readonly */}
                  <Show when={prop.type === 'readonly'}>
                    <span class="fp-property-value readonly">
                      {getValue(prop.name)}
                    </span>
                  </Show>

                  {/* Select */}
                  <Show when={prop.type === 'select' && prop.options}>
                    <select
                      class="fp-property-input"
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
                      class="fp-property-input"
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
                      class="fp-property-input"
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
          <div class="fp-properties-panel-actions">
            <button
              class="fp-dialog-btn danger"
              style={{ padding: '6px 12px', 'font-size': '12px' }}
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
