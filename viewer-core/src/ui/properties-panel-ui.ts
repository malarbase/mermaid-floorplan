/**
 * Properties Panel UI component for displaying and editing entity properties
 * Uses .fp-properties-panel classes from shared-styles.css
 */

import { injectStyles } from './styles.js';

export interface PropertyDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'readonly';
  value?: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface PropertiesPanelUIOptions {
  onPropertyChange?: (property: string, value: string) => void;
  onDelete?: () => void;
}

export interface PropertiesPanelUI {
  element: HTMLElement;
  show: (entityType: string, entityId: string, properties: PropertyDefinition[]) => void;
  hide: () => void;
  updateProperty: (property: string, value: string | number) => void;
  isVisible: () => boolean;
  destroy: () => void;
}

/**
 * Create a properties panel UI for editing entity properties
 */
export function createPropertiesPanelUI(options: PropertiesPanelUIOptions = {}): PropertiesPanelUI {
  injectStyles();
  
  const { onPropertyChange, onDelete } = options;
  
  // Create panel
  const panel = document.createElement('div');
  panel.className = 'fp-properties-panel';
  
  // Content container
  const content = document.createElement('div');
  content.className = 'fp-properties-panel-content';
  panel.appendChild(content);
  
  // Title
  const title = document.createElement('div');
  title.className = 'fp-properties-panel-title';
  content.appendChild(title);
  
  // Form
  const form = document.createElement('div');
  form.className = 'fp-properties-panel-form';
  content.appendChild(form);
  
  // Actions (delete button)
  const actions = document.createElement('div');
  actions.className = 'fp-properties-panel-actions';
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'fp-dialog-btn danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.style.padding = '6px 12px';
  deleteBtn.style.fontSize = '12px';
  deleteBtn.addEventListener('click', () => onDelete?.());
  actions.appendChild(deleteBtn);
  content.appendChild(actions);
  
  // Map of property inputs
  const propertyInputs: Map<string, HTMLInputElement | HTMLSelectElement | HTMLSpanElement> = new Map();
  
  function show(entityType: string, entityId: string, properties: PropertyDefinition[]) {
    // Update title
    title.textContent = `${entityType}: ${entityId}`;
    
    // Clear and rebuild form
    form.innerHTML = '';
    propertyInputs.clear();
    
    properties.forEach(prop => {
      const row = document.createElement('div');
      row.className = 'fp-property-row';
      
      const label = document.createElement('span');
      label.className = 'fp-property-label';
      label.textContent = prop.label;
      row.appendChild(label);
      
      if (prop.type === 'readonly') {
        const value = document.createElement('span');
        value.className = 'fp-property-value readonly';
        value.textContent = String(prop.value ?? '');
        row.appendChild(value);
        propertyInputs.set(prop.name, value);
      } else if (prop.type === 'select' && prop.options) {
        const select = document.createElement('select');
        select.className = 'fp-property-input';
        select.name = prop.name;
        
        prop.options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if (String(prop.value) === opt.value) {
            option.selected = true;
          }
          select.appendChild(option);
        });
        
        select.addEventListener('change', () => {
          onPropertyChange?.(prop.name, select.value);
        });
        
        row.appendChild(select);
        propertyInputs.set(prop.name, select);
      } else {
        const input = document.createElement('input');
        input.className = 'fp-property-input';
        input.type = prop.type;
        input.name = prop.name;
        input.value = String(prop.value ?? '');
        
        if (prop.type === 'number') {
          if (prop.min !== undefined) input.min = String(prop.min);
          if (prop.max !== undefined) input.max = String(prop.max);
          if (prop.step !== undefined) input.step = String(prop.step);
        }
        
        input.addEventListener('change', () => {
          onPropertyChange?.(prop.name, input.value);
        });
        
        // Also trigger on Enter key
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            input.blur();
            onPropertyChange?.(prop.name, input.value);
          }
        });
        
        row.appendChild(input);
        propertyInputs.set(prop.name, input);
      }
      
      form.appendChild(row);
    });
    
    // Show panel
    panel.classList.add('visible');
    panel.style.display = 'block';
  }
  
  function hide() {
    panel.classList.remove('visible');
    panel.style.display = 'none';
  }
  
  function updateProperty(property: string, value: string | number) {
    const input = propertyInputs.get(property);
    if (input) {
      if (input instanceof HTMLSpanElement) {
        input.textContent = String(value);
      } else {
        input.value = String(value);
      }
    }
  }
  
  function isVisible() {
    return panel.classList.contains('visible');
  }
  
  function destroy() {
    panel.remove();
  }
  
  // Initialize as hidden
  hide();
  
  return {
    element: panel,
    show,
    hide,
    updateProperty,
    isVisible,
    destroy,
  };
}
