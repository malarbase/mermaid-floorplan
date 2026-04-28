/**
 * Layer visibility controls UI component
 *
 * Renders five checkboxes (Floors / Walls / Doors & Windows / Stairs / Lifts)
 * inside a collapsible "Layers" block. Intended to be appended inside the
 * existing View section (`viewContent`) of the control panel.
 */

import type { Layer } from '../layer-visibility-manager.js';
import { cls } from './class-names.js';

export interface LayerEntry {
  label: string;
  layer: Layer;
}

export const LAYER_ENTRIES: LayerEntry[] = [
  { label: 'Floors', layer: 'floor' },
  { label: 'Walls', layer: 'wall' },
  { label: 'Doors & Windows', layer: 'connection' },
  { label: 'Stairs', layer: 'stair' },
  { label: 'Lifts', layer: 'lift' },
];

export interface LayerControlsUIOptions {
  onLayerToggle: (layer: Layer, visible: boolean) => void;
  /** Initial visibility per layer — defaults to all true. */
  initialVisibility?: Partial<Record<Layer, boolean>>;
}

export interface LayerControlsUI {
  element: HTMLElement;
  /** Update checked state for a layer without triggering the callback. */
  setChecked: (layer: Layer, checked: boolean) => void;
}

/**
 * Create a "Layers" block with five checkboxes for toggling render layers.
 * Returns a `div` element ready to be appended inside a View section's
 * content container.
 */
export function createLayerControlsUI(options: LayerControlsUIOptions): LayerControlsUI {
  const { onLayerToggle, initialVisibility = {} } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'fp-control-group';

  const header = document.createElement('div');
  header.className = 'fp-control-row';

  const headerLabel = document.createElement('label');
  headerLabel.className = cls.text.label;
  headerLabel.textContent = 'Layers';
  header.appendChild(headerLabel);
  wrapper.appendChild(header);

  const checkboxMap = new Map<Layer, HTMLInputElement>();

  for (const { label, layer } of LAYER_ENTRIES) {
    const item = document.createElement('label');
    item.className = cls.checkbox.wrapper;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = cls.checkbox.input;
    checkbox.id = `layer-toggle-${layer}`;
    checkbox.checked = initialVisibility[layer] ?? true;
    checkbox.addEventListener('change', () => {
      onLayerToggle(layer, checkbox.checked);
    });

    const labelText = document.createElement('span');
    labelText.className = cls.checkbox.label;
    labelText.textContent = label;

    item.appendChild(checkbox);
    item.appendChild(labelText);
    wrapper.appendChild(item);

    checkboxMap.set(layer, checkbox);
  }

  return {
    element: wrapper,
    setChecked(layer: Layer, checked: boolean) {
      const cb = checkboxMap.get(layer);
      if (cb) cb.checked = checked;
    },
  };
}
