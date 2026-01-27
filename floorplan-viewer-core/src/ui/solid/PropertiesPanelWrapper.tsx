/**
 * PropertiesPanelWrapper - Vanilla-compatible wrapper for Solid PropertiesPanel
 *
 * This wrapper provides the same interface as the vanilla PropertiesPanelUI
 * but uses the Solid.js implementation internally.
 *
 * Usage:
 *   import { createSolidPropertiesPanel } from './solid/PropertiesPanelWrapper';
 *   const panel = createSolidPropertiesPanel({ onPropertyChange, onDelete });
 */

import { createSignal, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import { PropertiesPanel, type PropertyDefinition, type PropertyType, type PropertyOption } from './PropertiesPanel.jsx';

// Re-export types
export type { PropertyDefinition, PropertyType, PropertyOption };

export interface PropertiesPanelConfig {
  /** Callback when a property changes */
  onPropertyChange?: (property: string, value: string) => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
}

export interface PropertiesPanelAPI {
  /** The panel element */
  element: HTMLElement;
  /** Show the panel with entity data */
  show: (entityType: string, entityId: string, properties: PropertyDefinition[]) => void;
  /** Hide the panel */
  hide: () => void;
  /** Update a property value */
  updateProperty: (property: string, value: string | number) => void;
  /** Check if panel is visible */
  isVisible: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

/**
 * Create a Solid-based PropertiesPanel with vanilla-compatible API.
 */
export function createSolidPropertiesPanel(config: PropertiesPanelConfig = {}): PropertiesPanelAPI {
  const { onPropertyChange, onDelete } = config;

  // Create container element
  const container = document.createElement('div');
  container.id = 'solid-properties-panel-root';

  // Reactive state
  const [isVisible, setIsVisible] = createSignal(false);
  const [entityType, setEntityType] = createSignal('');
  const [entityId, setEntityId] = createSignal('');
  const [properties, setProperties] = createSignal<PropertyDefinition[]>([]);

  // Render the Solid component
  const dispose = render(() => {
    return (
      <PropertiesPanel
        isVisible={isVisible()}
        entityType={entityType()}
        entityId={entityId()}
        properties={properties()}
        onPropertyChange={onPropertyChange}
        onDelete={onDelete}
      />
    );
  }, container);

  return {
    element: container,

    show: (type: string, id: string, props: PropertyDefinition[]) => {
      setEntityType(type);
      setEntityId(id);
      setProperties([...props]);
      setIsVisible(true);
    },

    hide: () => {
      setIsVisible(false);
    },

    updateProperty: (property: string, value: string | number) => {
      setProperties(prev => prev.map(p => 
        p.name === property ? { ...p, value } : p
      ));
    },

    isVisible: () => isVisible(),

    destroy: () => {
      dispose();
      container.remove();
    },
  };
}
