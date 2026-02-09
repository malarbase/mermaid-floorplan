/**
 * Tests for UI components (drag-drop, editor-panel, dialog-ui, command-utils)
 *
 * Note: Tests for deprecated vanilla components (header-bar, file-dropdown,
 * command-palette, properties-panel-ui) have been removed. Use Solid.js
 * components via FloorplanUI instead.
 */

import { JSDOM } from 'jsdom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Setup jsdom before imports
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;
global.HTMLElement = dom.window.HTMLElement;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.Event = dom.window.Event;
global.HTMLSpanElement = dom.window.HTMLSpanElement;

import {
  createConfirmDialogUI,
  createDialogUI,
  createEditorPanel,
  createFileCommands,
  createViewCommands,
  initializeDragDrop,
} from '../src/ui/index.js';

describe('Command Utilities', () => {
  it('should create file commands array', () => {
    const commands = createFileCommands({
      onOpenFile: vi.fn(),
      onOpenUrl: vi.fn(),
      onSave: vi.fn(),
      onExportJson: vi.fn(),
      onExportGlb: vi.fn(),
      onExportGltf: vi.fn(),
    });

    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
    // Verify commands have expected structure
    expect(commands[0]).toHaveProperty('id');
    expect(commands[0]).toHaveProperty('label');
    expect(commands[0]).toHaveProperty('execute');
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
    // Verify commands have expected structure
    expect(commands[0]).toHaveProperty('id');
    expect(commands[0]).toHaveProperty('label');
    expect(commands[0]).toHaveProperty('execute');
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
      fields: [{ name: 'name', label: 'Name', type: 'text', value: 'Test' }],
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

// Note: Properties Panel UI tests removed - use Solid.js PropertiesPanel component instead
