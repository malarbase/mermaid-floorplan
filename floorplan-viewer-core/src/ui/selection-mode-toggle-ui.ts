/**
 * Selection mode toggle UI component
 */

import { cls } from './class-names.js';
import { injectStyles } from './styles.js';

export interface SelectionModeToggleUIOptions {
  initialEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export interface SelectionModeToggleUI {
  element: HTMLElement;
  checkbox: HTMLInputElement;
  indicator: HTMLElement;
  setEnabled: (enabled: boolean) => void;
  isEnabled: () => boolean;
}

/**
 * Create selection mode toggle UI
 */
export function createSelectionModeToggleUI(
  options: SelectionModeToggleUIOptions = {},
): SelectionModeToggleUI {
  injectStyles();

  const { initialEnabled = false, onToggle, position = 'bottom-right' } = options;

  const container = document.createElement('div');
  container.className = 'fp-selection-mode-toggle';
  container.id = 'selection-mode-toggle';

  // Position based on option
  container.style.position = 'absolute';
  switch (position) {
    case 'bottom-left':
      container.style.bottom = '16px';
      container.style.left = '16px';
      break;
    case 'top-right':
      container.style.top = '16px';
      container.style.right = '16px';
      break;
    case 'top-left':
      container.style.top = '16px';
      container.style.left = '16px';
      break;
    default: // bottom-right
      container.style.bottom = '80px'; // Above selection info
      container.style.right = '16px';
      break;
  }

  // Checkbox row wrapper
  const checkboxRow = document.createElement('label');
  checkboxRow.className = cls.checkbox.wrapper;

  // Checkbox
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = cls.checkbox.input;
  checkbox.id = 'selection-mode-checkbox';
  checkbox.checked = initialEnabled;

  // Label text
  const labelText = document.createElement('span');
  labelText.className = cls.checkbox.label;
  labelText.textContent = 'Selection';

  // Mode indicator
  const indicator = document.createElement('span');
  indicator.className = `fp-selection-mode-indicator ${initialEnabled ? 'selection' : 'navigation'}`;
  indicator.textContent = initialEnabled ? 'ON' : 'NAV';

  checkbox.addEventListener('change', () => {
    const enabled = checkbox.checked;
    indicator.className = `fp-selection-mode-indicator ${enabled ? 'selection' : 'navigation'}`;
    indicator.textContent = enabled ? 'ON' : 'NAV';
    onToggle?.(enabled);
  });

  checkboxRow.appendChild(checkbox);
  checkboxRow.appendChild(labelText);
  checkboxRow.appendChild(indicator);
  container.appendChild(checkboxRow);

  return {
    element: container,
    checkbox,
    indicator,
    setEnabled: (enabled: boolean) => {
      checkbox.checked = enabled;
      indicator.className = `fp-selection-mode-indicator ${enabled ? 'selection' : 'navigation'}`;
      indicator.textContent = enabled ? 'ON' : 'NAV';
    },
    isEnabled: () => checkbox.checked,
  };
}
