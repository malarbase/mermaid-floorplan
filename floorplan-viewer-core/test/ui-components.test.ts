/**
 * Tests for UI components (header-bar, file-dropdown, command-palette, drag-drop, editor-panel)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup jsdom before imports
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;
global.HTMLElement = dom.window.HTMLElement;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.Event = dom.window.Event;
global.HTMLSpanElement = dom.window.HTMLSpanElement;

import {
  createHeaderBar,
  createFileDropdown,
  createCommandPalette,
  createFileCommands,
  createViewCommands,
  initializeDragDrop,
  createEditorPanel,
  createDialogUI,
  createConfirmDialogUI,
  createPropertiesPanelUI,
} from '../src/ui/index.js';

describe('Header Bar', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create header bar element', () => {
    const header = createHeaderBar();
    expect(header.element).toBeInstanceOf(HTMLElement);
    expect(header.element.classList.contains('fp-header-bar')).toBe(true);
  });

  it('should have setFilename method', () => {
    const header = createHeaderBar({ filename: 'test.floorplan' });
    expect(header.setFilename).toBeDefined();
    // setFilename should not throw
    expect(() => header.setFilename('new-file.floorplan')).not.toThrow();
  });

  it('should have setEditorOpen method', () => {
    const header = createHeaderBar({ editorOpen: false });
    expect(header.setEditorOpen).toBeDefined();
    expect(() => header.setEditorOpen(true)).not.toThrow();
  });

  it('should have dispose method', () => {
    const header = createHeaderBar();
    expect(header.dispose).toBeDefined();
    expect(() => header.dispose()).not.toThrow();
  });
});

describe('File Dropdown', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create file dropdown element', () => {
    const dropdown = createFileDropdown();
    expect(dropdown.element).toBeInstanceOf(HTMLElement);
    expect(dropdown.element.classList.contains('fp-file-dropdown')).toBe(true);
  });

  it('should have show/hide methods', () => {
    const dropdown = createFileDropdown();
    expect(dropdown.show).toBeDefined();
    expect(dropdown.hide).toBeDefined();
    // hide should not throw
    expect(() => dropdown.hide()).not.toThrow();
  });
});

describe('Command Palette', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create command palette element', () => {
    const commands = [
      { id: 'test', label: 'Test Command', action: vi.fn() },
    ];
    const palette = createCommandPalette({ commands });
    expect(palette.element).toBeInstanceOf(HTMLElement);
  });

  it('should have element property', () => {
    const commands = [
      { id: 'test', label: 'Test Command', action: vi.fn() },
    ];
    const palette = createCommandPalette({ commands });
    expect(palette.element).toBeDefined();
    expect(palette.element).toBeInstanceOf(HTMLElement);
  });

  it('should create file commands array', () => {
    const commands = createFileCommands({
      isAuthenticated: true,
      onOpenFile: vi.fn(),
      onOpenUrl: vi.fn(),
      onSave: vi.fn(),
      onExportJson: vi.fn(),
      onExportGlb: vi.fn(),
      onExportGltf: vi.fn(),
    });

    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should create view commands array', () => {
    const commands = createViewCommands({
      onToggleTheme: vi.fn(),
      onToggleOrtho: vi.fn(),
      onIsometricView: vi.fn(),
      onResetCamera: vi.fn(),
      onFrameAll: vi.fn(),
    });

    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
  });
});

describe('Drag and Drop', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '100px';
    container.style.height = '100px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should initialize drag drop handler with enable method', () => {
    const handler = initializeDragDrop({ target: container });
    expect(handler.enable).toBeDefined();
    expect(() => handler.enable()).not.toThrow();
  });

  it('should initialize drag drop handler with disable method', () => {
    const handler = initializeDragDrop({ target: container });
    expect(handler.disable).toBeDefined();
    expect(() => handler.disable()).not.toThrow();
  });
});

describe('Editor Panel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create editor panel', () => {
    const panel = createEditorPanel();
    expect(panel.element).toBeInstanceOf(HTMLElement);
    expect(panel.element.classList.contains('fp-editor-panel')).toBe(true);
  });

  it('should have editor container', () => {
    const panel = createEditorPanel();
    expect(panel.editorContainer).toBeInstanceOf(HTMLElement);
    expect(panel.editorContainer.classList.contains('fp-editor-panel__editor')).toBe(true);
  });

  it('should toggle open/close state', () => {
    const panel = createEditorPanel({ initiallyOpen: true });
    expect(panel.isOpen()).toBe(true);

    panel.toggle();
    expect(panel.isOpen()).toBe(false);

    panel.toggle();
    expect(panel.isOpen()).toBe(true);
  });

  it('should call onToggle callback', () => {
    const onToggle = vi.fn();
    const panel = createEditorPanel({ initiallyOpen: true, onToggle });

    panel.close();
    expect(onToggle).toHaveBeenCalledWith(false);

    panel.open();
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('should update authentication state', () => {
    const panel = createEditorPanel({ isAuthenticated: false });
    container.appendChild(panel.element);

    // Check login button is visible
    const loginBtn = panel.element.querySelector('.fp-editor-panel__login-btn') as HTMLElement;
    expect(loginBtn.style.display).not.toBe('none');

    panel.setAuthenticated(true);
    expect(loginBtn.style.display).toBe('none');
  });

  it('should show read-only badge when not editable', () => {
    const panel = createEditorPanel({ editable: false });
    container.appendChild(panel.element);

    const badge = panel.element.querySelector('.fp-editor-panel__mode-badge');
    expect(badge?.textContent).toBe('Read-only');
  });

  it('should show editing badge when editable and authenticated', () => {
    const panel = createEditorPanel({ editable: true, isAuthenticated: true });
    container.appendChild(panel.element);

    const badge = panel.element.querySelector('.fp-editor-panel__mode-badge');
    expect(badge?.textContent).toBe('Editing');
  });

  it('should call onLoginClick callback', () => {
    const onLoginClick = vi.fn();
    const panel = createEditorPanel({ onLoginClick });
    container.appendChild(panel.element);

    const loginBtn = panel.element.querySelector('.fp-editor-panel__login-btn') as HTMLElement;
    loginBtn.click();

    expect(onLoginClick).toHaveBeenCalled();
  });

  it('should update status text', () => {
    const panel = createEditorPanel();
    container.appendChild(panel.element);

    panel.setStatus('Parsing...');
    const statusText = panel.element.querySelector('.fp-editor-panel__status-text');
    expect(statusText?.textContent).toBe('Parsing...');
  });

  it('should show error status', () => {
    const panel = createEditorPanel();
    container.appendChild(panel.element);

    panel.showError('Parse error');
    const statusText = panel.element.querySelector('.fp-editor-panel__status-text');
    expect(statusText?.textContent).toContain('Parse error');
    expect(statusText?.classList.contains('fp-editor-panel__status-text--error')).toBe(true);
  });

  it('should have destroy method', () => {
    const panel = createEditorPanel();
    expect(panel.destroy).toBeDefined();
    expect(() => panel.destroy()).not.toThrow();
  });
});

describe('Dialog UI', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create dialog element', () => {
    const dialog = createDialogUI({
      title: 'Test Dialog',
    });
    expect(dialog.element).toBeInstanceOf(HTMLElement);
    expect(dialog.element.classList.contains('fp-dialog-overlay')).toBe(true);
  });

  it('should have show/hide methods', () => {
    const dialog = createDialogUI({
      title: 'Test Dialog',
    });
    container.appendChild(dialog.element);

    expect(dialog.show).toBeDefined();
    expect(dialog.hide).toBeDefined();

    dialog.show();
    expect(dialog.element.classList.contains('visible')).toBe(true);

    dialog.hide();
    expect(dialog.element.classList.contains('visible')).toBe(false);
  });

  it('should create fields and get values', () => {
    const dialog = createDialogUI({
      title: 'Test Dialog',
      fields: [
        { name: 'name', label: 'Name', type: 'text', value: 'Room1' },
        { name: 'width', label: 'Width', type: 'number', value: 10 },
      ],
    });
    container.appendChild(dialog.element);

    const values = dialog.getValues();
    expect(values.name).toBe('Room1');
    expect(values.width).toBe('10');
  });

  it('should set and clear error', () => {
    const dialog = createDialogUI({
      title: 'Test Dialog',
    });
    container.appendChild(dialog.element);

    dialog.setError('Test error message');
    const errorEl = dialog.element.querySelector('.fp-dialog-error');
    expect(errorEl?.textContent).toBe('Test error message');
    expect(errorEl?.classList.contains('visible')).toBe(true);

    dialog.clearError();
    expect(errorEl?.textContent).toBe('');
    expect(errorEl?.classList.contains('visible')).toBe(false);
  });

  it('should call primary action onClick with values', () => {
    const onClick = vi.fn();
    const dialog = createDialogUI({
      title: 'Test Dialog',
      fields: [
        { name: 'name', label: 'Name', type: 'text', value: 'Test' },
      ],
      primaryAction: {
        label: 'Submit',
        onClick,
      },
    });
    container.appendChild(dialog.element);

    const submitBtn = dialog.element.querySelector('.fp-dialog-btn.primary') as HTMLElement;
    submitBtn.click();

    expect(onClick).toHaveBeenCalledWith({ name: 'Test' });
  });

  it('should call cancel action onClick', () => {
    const onCancel = vi.fn();
    const dialog = createDialogUI({
      title: 'Test Dialog',
      cancelAction: {
        label: 'Cancel',
        onClick: onCancel,
      },
    });
    container.appendChild(dialog.element);

    const cancelBtn = dialog.element.querySelector('.fp-dialog-btn.cancel') as HTMLElement;
    cancelBtn.click();

    expect(onCancel).toHaveBeenCalled();
  });

  it('should have destroy method', () => {
    const dialog = createDialogUI({
      title: 'Test Dialog',
    });
    expect(dialog.destroy).toBeDefined();
    expect(() => dialog.destroy()).not.toThrow();
  });
});

describe('Confirm Dialog UI', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create confirm dialog element', () => {
    const dialog = createConfirmDialogUI({
      title: 'Confirm Delete',
      message: 'Are you sure?',
      onConfirm: vi.fn(),
    });
    expect(dialog.element).toBeInstanceOf(HTMLElement);
    expect(dialog.element.classList.contains('fp-dialog-overlay')).toBe(true);
  });

  it('should have show/hide methods', () => {
    const dialog = createConfirmDialogUI({
      title: 'Confirm',
      message: 'Test',
      onConfirm: vi.fn(),
    });
    container.appendChild(dialog.element);

    dialog.show();
    expect(dialog.element.classList.contains('visible')).toBe(true);

    dialog.hide();
    expect(dialog.element.classList.contains('visible')).toBe(false);
  });

  it('should call onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    const dialog = createConfirmDialogUI({
      title: 'Confirm',
      message: 'Test',
      onConfirm,
    });
    container.appendChild(dialog.element);

    const confirmBtn = dialog.element.querySelector('.fp-dialog-btn.danger') as HTMLElement;
    confirmBtn.click();

    expect(onConfirm).toHaveBeenCalled();
  });

  it('should call onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    const dialog = createConfirmDialogUI({
      title: 'Confirm',
      message: 'Test',
      onConfirm: vi.fn(),
      onCancel,
    });
    container.appendChild(dialog.element);

    const cancelBtn = dialog.element.querySelector('.fp-dialog-btn.cancel') as HTMLElement;
    cancelBtn.click();

    expect(onCancel).toHaveBeenCalled();
  });

  it('should display warning section', () => {
    const dialog = createConfirmDialogUI({
      title: 'Confirm',
      message: 'Test',
      warning: {
        title: 'Warning',
        items: ['Item 1', 'Item 2'],
      },
      onConfirm: vi.fn(),
    });
    container.appendChild(dialog.element);

    const warningEl = dialog.element.querySelector('.fp-confirm-dialog-warning') as HTMLElement;
    expect(warningEl.style.display).toBe('block');

    const warningItems = warningEl.querySelectorAll('li');
    expect(warningItems.length).toBe(2);
  });

  it('should update warning items', () => {
    const dialog = createConfirmDialogUI({
      title: 'Confirm',
      message: 'Test',
      onConfirm: vi.fn(),
    });
    container.appendChild(dialog.element);

    dialog.updateWarning('New Warning', ['New Item 1', 'New Item 2', 'New Item 3']);

    const warningEl = dialog.element.querySelector('.fp-confirm-dialog-warning') as HTMLElement;
    expect(warningEl.style.display).toBe('block');

    const warningTitle = warningEl.querySelector('.fp-confirm-dialog-warning-title');
    expect(warningTitle?.textContent).toBe('New Warning');

    const warningItems = warningEl.querySelectorAll('li');
    expect(warningItems.length).toBe(3);
  });

  it('should have destroy method', () => {
    const dialog = createConfirmDialogUI({
      title: 'Confirm',
      message: 'Test',
      onConfirm: vi.fn(),
    });
    expect(dialog.destroy).toBeDefined();
    expect(() => dialog.destroy()).not.toThrow();
  });
});

describe('Properties Panel UI', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should create properties panel element', () => {
    const panel = createPropertiesPanelUI();
    expect(panel.element).toBeInstanceOf(HTMLElement);
    expect(panel.element.classList.contains('fp-properties-panel')).toBe(true);
  });

  it('should start hidden', () => {
    const panel = createPropertiesPanelUI();
    expect(panel.isVisible()).toBe(false);
  });

  it('should show panel with properties', () => {
    const panel = createPropertiesPanelUI();
    container.appendChild(panel.element);

    panel.show('Room', 'Living Room', [
      { name: 'width', label: 'Width', type: 'number', value: 10 },
      { name: 'height', label: 'Height', type: 'number', value: 8 },
    ]);

    expect(panel.isVisible()).toBe(true);
  });

  it('should hide panel', () => {
    const panel = createPropertiesPanelUI();
    container.appendChild(panel.element);

    panel.show('Room', 'Test', []);
    expect(panel.isVisible()).toBe(true);

    panel.hide();
    expect(panel.isVisible()).toBe(false);
  });

  it('should display title with entity type and id', () => {
    const panel = createPropertiesPanelUI();
    container.appendChild(panel.element);

    panel.show('Room', 'Kitchen', []);

    const title = panel.element.querySelector('.fp-properties-panel-title');
    expect(title?.textContent).toBe('Room: Kitchen');
  });

  it('should create property inputs', () => {
    const panel = createPropertiesPanelUI();
    container.appendChild(panel.element);

    panel.show('Room', 'Test', [
      { name: 'name', label: 'Name', type: 'text', value: 'TestRoom' },
      { name: 'width', label: 'Width', type: 'number', value: 10 },
    ]);

    const inputs = panel.element.querySelectorAll('.fp-property-input');
    expect(inputs.length).toBe(2);
  });

  it('should create readonly properties', () => {
    const panel = createPropertiesPanelUI();
    container.appendChild(panel.element);

    panel.show('Room', 'Test', [
      { name: 'id', label: 'ID', type: 'readonly', value: 'room-123' },
    ]);

    const readonlyEl = panel.element.querySelector('.fp-property-value.readonly');
    expect(readonlyEl?.textContent).toBe('room-123');
  });

  it('should create select properties', () => {
    const panel = createPropertiesPanelUI();
    container.appendChild(panel.element);

    panel.show('Room', 'Test', [
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        value: 'bedroom',
        options: [
          { value: 'bedroom', label: 'Bedroom' },
          { value: 'bathroom', label: 'Bathroom' },
        ],
      },
    ]);

    const select = panel.element.querySelector('select') as HTMLSelectElement;
    expect(select).toBeDefined();
    expect(select.value).toBe('bedroom');
  });

  it('should call onPropertyChange when input changes', () => {
    const onPropertyChange = vi.fn();
    const panel = createPropertiesPanelUI({ onPropertyChange });
    container.appendChild(panel.element);

    panel.show('Room', 'Test', [
      { name: 'width', label: 'Width', type: 'number', value: 10 },
    ]);

    const input = panel.element.querySelector('input') as HTMLInputElement;
    input.value = '15';
    input.dispatchEvent(new Event('change'));

    expect(onPropertyChange).toHaveBeenCalledWith('width', '15');
  });

  it('should call onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    const panel = createPropertiesPanelUI({ onDelete });
    container.appendChild(panel.element);

    panel.show('Room', 'Test', []);

    const deleteBtn = panel.element.querySelector('.fp-dialog-btn.danger') as HTMLElement;
    deleteBtn.click();

    expect(onDelete).toHaveBeenCalled();
  });

  it('should update property value', () => {
    const panel = createPropertiesPanelUI();
    container.appendChild(panel.element);

    panel.show('Room', 'Test', [
      { name: 'width', label: 'Width', type: 'number', value: 10 },
    ]);

    panel.updateProperty('width', 20);

    const input = panel.element.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('20');
  });

  it('should have destroy method', () => {
    const panel = createPropertiesPanelUI();
    expect(panel.destroy).toBeDefined();
    expect(() => panel.destroy()).not.toThrow();
  });
});
