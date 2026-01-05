/**
 * PropertiesPanel - UI for viewing and editing selected element properties.
 * 
 * Features:
 * - Displays properties based on selected entity type
 * - Supports editing common properties (position, size, style)
 * - Emits change events that can be applied to the Monaco editor
 */
import type { SelectableObject, SourceRange } from 'viewer-core';

/**
 * Property definition for rendering form controls.
 */
export interface PropertyDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'readonly';
  options?: string[];  // For select type
  step?: number;       // For number type
  min?: number;
  max?: number;
}

/**
 * Property change event emitted when user edits a property.
 */
export interface PropertyChangeEvent {
  entityType: string;
  entityId: string;
  floorId: string;
  property: string;
  oldValue: unknown;
  newValue: unknown;
  sourceRange?: SourceRange;
}

/**
 * Property definitions for each entity type.
 */
const PROPERTY_DEFINITIONS: Record<string, PropertyDef[]> = {
  room: [
    { name: 'name', label: 'Name', type: 'text' },
    { name: 'x', label: 'X', type: 'number', step: 0.5 },
    { name: 'y', label: 'Y', type: 'number', step: 0.5 },
    { name: 'width', label: 'Width', type: 'number', step: 0.5, min: 0.5 },
    { name: 'height', label: 'Height', type: 'number', step: 0.5, min: 0.5 },
    { name: 'roomHeight', label: 'Room Height', type: 'number', step: 0.1, min: 0.1 },
    { name: 'style', label: 'Style', type: 'text' },
  ],
  wall: [
    { name: 'room', label: 'Parent Room', type: 'readonly' },
    { name: 'direction', label: 'Direction', type: 'readonly' },
    { name: 'type', label: 'Wall Type', type: 'select', options: ['solid', 'open', 'door', 'window'] },
  ],
  connection: [
    { name: 'fromRoom', label: 'From Room', type: 'readonly' },
    { name: 'toRoom', label: 'To Room', type: 'readonly' },
    { name: 'type', label: 'Type', type: 'select', options: ['door', 'double-door', 'window', 'opening'] },
    { name: 'position', label: 'Position %', type: 'number', step: 5, min: 0, max: 100 },
  ],
};

/**
 * Configuration for PropertiesPanel.
 */
export interface PropertiesPanelConfig {
  /** Container element ID or element */
  container: string | HTMLElement;
  /** Callback when property changes */
  onPropertyChange?: (event: PropertyChangeEvent) => void;
  /** Custom property definitions (extends defaults) */
  propertyDefs?: Record<string, PropertyDef[]>;
}

/**
 * Properties panel for viewing and editing selected element properties.
 */
export class PropertiesPanel {
  private container: HTMLElement;
  private titleEl: HTMLElement;
  private formEl: HTMLElement;
  private currentSelection: SelectableObject | null = null;
  private currentData: Record<string, unknown> = {};
  private propertyDefs: Record<string, PropertyDef[]>;
  private onPropertyChange?: (event: PropertyChangeEvent) => void;

  constructor(config: PropertiesPanelConfig) {
    // Get container
    if (typeof config.container === 'string') {
      const el = document.getElementById(config.container);
      if (!el) {
        throw new Error(`Container element '${config.container}' not found`);
      }
      this.container = el;
    } else {
      this.container = config.container;
    }

    this.onPropertyChange = config.onPropertyChange;
    this.propertyDefs = { ...PROPERTY_DEFINITIONS, ...config.propertyDefs };

    // Create panel structure
    this.container.innerHTML = `
      <div class="properties-panel-content">
        <div class="properties-panel-title">Properties</div>
        <div class="properties-panel-form"></div>
      </div>
    `;

    this.titleEl = this.container.querySelector('.properties-panel-title')!;
    this.formEl = this.container.querySelector('.properties-panel-form')!;

    // Initially hidden
    this.hide();
  }

  /**
   * Show the properties panel for a selected entity.
   * 
   * @param selection - The selected entity
   * @param data - Entity data (from JSON or mesh userData)
   */
  show(selection: SelectableObject, data: Record<string, unknown>): void {
    this.currentSelection = selection;
    this.currentData = { ...data };
    
    // Update title
    this.titleEl.textContent = `${this.capitalize(selection.entityType)}: ${selection.entityId}`;
    
    // Render form
    this.renderForm();
    
    // Show panel
    this.container.style.display = 'block';
  }

  /**
   * Hide the properties panel.
   */
  hide(): void {
    this.container.style.display = 'none';
    this.currentSelection = null;
    this.currentData = {};
    this.formEl.innerHTML = '';
  }

  /**
   * Update properties without changing selection.
   * Useful for refreshing after external changes.
   */
  update(data: Record<string, unknown>): void {
    if (!this.currentSelection) return;
    this.currentData = { ...data };
    this.renderForm();
  }

  /**
   * Render the form controls for current selection.
   */
  private renderForm(): void {
    if (!this.currentSelection) return;

    const defs = this.propertyDefs[this.currentSelection.entityType] ?? [];
    this.formEl.innerHTML = '';

    for (const def of defs) {
      const row = this.createPropertyRow(def);
      this.formEl.appendChild(row);
    }

    // Add note about editing
    const note = document.createElement('div');
    note.className = 'properties-panel-note';
    note.textContent = 'Edit values to update DSL';
    this.formEl.appendChild(note);
  }

  /**
   * Create a form row for a property.
   */
  private createPropertyRow(def: PropertyDef): HTMLElement {
    const row = document.createElement('div');
    row.className = 'property-row';

    const label = document.createElement('label');
    label.textContent = def.label;
    label.className = 'property-label';
    row.appendChild(label);

    const value = this.currentData[def.name];
    let input: HTMLElement;

    switch (def.type) {
      case 'readonly':
        input = document.createElement('span');
        input.className = 'property-value readonly';
        input.textContent = String(value ?? '—');
        break;

      case 'select':
        input = document.createElement('select');
        input.className = 'property-input';
        for (const opt of def.options ?? []) {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          option.selected = opt === String(value);
          input.appendChild(option);
        }
        (input as HTMLSelectElement).addEventListener('change', () => {
          this.handlePropertyChange(def.name, (input as HTMLSelectElement).value);
        });
        break;

      case 'number':
        input = document.createElement('input');
        input.className = 'property-input';
        (input as HTMLInputElement).type = 'number';
        (input as HTMLInputElement).value = String(value ?? '');
        if (def.step !== undefined) (input as HTMLInputElement).step = String(def.step);
        if (def.min !== undefined) (input as HTMLInputElement).min = String(def.min);
        if (def.max !== undefined) (input as HTMLInputElement).max = String(def.max);
        (input as HTMLInputElement).addEventListener('change', () => {
          const numValue = parseFloat((input as HTMLInputElement).value);
          if (!isNaN(numValue)) {
            this.handlePropertyChange(def.name, numValue);
          }
        });
        break;

      case 'text':
      default:
        input = document.createElement('input');
        input.className = 'property-input';
        (input as HTMLInputElement).type = 'text';
        (input as HTMLInputElement).value = String(value ?? '');
        (input as HTMLInputElement).addEventListener('change', () => {
          this.handlePropertyChange(def.name, (input as HTMLInputElement).value);
        });
        break;
    }

    row.appendChild(input);
    return row;
  }

  /**
   * Handle property value change.
   */
  private handlePropertyChange(property: string, newValue: unknown): void {
    if (!this.currentSelection || !this.onPropertyChange) return;

    const oldValue = this.currentData[property];
    this.currentData[property] = newValue;

    this.onPropertyChange({
      entityType: this.currentSelection.entityType,
      entityId: this.currentSelection.entityId,
      floorId: this.currentSelection.floorId,
      property,
      oldValue,
      newValue,
      sourceRange: this.currentSelection.sourceRange,
    });
  }

  /**
   * Capitalize first letter.
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get CSS styles for the properties panel.
   * Call this to get CSS that should be added to the page.
   */
  static getStyles(): string {
    return `
      .properties-panel-content {
        padding: 12px;
      }
      
      .properties-panel-title {
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #444;
      }
      
      .properties-panel-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .property-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .property-label {
        flex: 0 0 80px;
        font-size: 12px;
        color: #999;
      }
      
      .property-input {
        flex: 1;
        background: #333;
        border: 1px solid #555;
        border-radius: 4px;
        padding: 4px 8px;
        color: #fff;
        font-size: 12px;
      }
      
      .property-input:focus {
        outline: none;
        border-color: #4a9eff;
      }
      
      .property-value.readonly {
        flex: 1;
        color: #888;
        font-size: 12px;
      }
      
      .properties-panel-note {
        margin-top: 12px;
        padding-top: 8px;
        border-top: 1px solid #444;
        font-size: 11px;
        color: #666;
        font-style: italic;
      }
    `;
  }
}

