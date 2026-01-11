/**
 * Selection info display UI component
 */
import { injectStyles } from './styles.js';
import type { SelectableObject } from '../scene-context.js';

export interface SelectionInfoUIOptions {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export interface SelectionInfoUI {
  element: HTMLElement;
  update: (selection: ReadonlySet<SelectableObject>) => void;
  clear: () => void;
}

/**
 * Create selection info display UI
 */
export function createSelectionInfoUI(options: SelectionInfoUIOptions = {}): SelectionInfoUI {
  injectStyles();
  
  const { position = 'bottom-right' } = options;
  
  const container = document.createElement('div');
  container.className = 'fp-selection-info';
  container.id = 'selection-info';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-label', 'Selection status');
  
  // Position based on option
  switch (position) {
    case 'bottom-left':
      container.style.bottom = '16px';
      container.style.left = '16px';
      container.style.right = 'auto';
      break;
    case 'top-right':
      container.style.top = '16px';
      container.style.bottom = 'auto';
      container.style.right = '16px';
      break;
    case 'top-left':
      container.style.top = '16px';
      container.style.bottom = 'auto';
      container.style.left = '16px';
      container.style.right = 'auto';
      break;
    default: // bottom-right
      break;
  }
  
  // Initial content
  container.innerHTML = '<div class="details">No selection</div>';
  
  const update = (selection: ReadonlySet<SelectableObject>) => {
    const count = selection.size;
    
    if (count === 0) {
      container.innerHTML = '<div class="details">No selection</div>';
      container.classList.remove('has-selection');
    } else {
      const types = new Map<string, number>();
      for (const obj of selection) {
        types.set(obj.entityType, (types.get(obj.entityType) || 0) + 1);
      }
      
      const summary = Array.from(types.entries())
        .map(([type, cnt]) => `${cnt} ${type}${cnt > 1 ? 's' : ''}`)
        .join(', ');
      
      let names = '';
      if (count <= 3) {
        names = Array.from(selection).map(s => s.entityId).join(', ');
      }
      
      container.innerHTML = `
        <div class="count">${count}</div>
        <div class="details">${summary}</div>
        ${names ? `<div class="details" style="margin-top: 4px; color: #00ff00;">${names}</div>` : ''}
      `;
      container.classList.add('has-selection');
    }
  };
  
  const clear = () => {
    container.innerHTML = '<div class="details">No selection</div>';
    container.classList.remove('has-selection');
  };
  
  return {
    element: container,
    update,
    clear,
  };
}

