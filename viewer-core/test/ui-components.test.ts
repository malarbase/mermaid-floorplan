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

import {
  createHeaderBar,
  createFileDropdown,
  createCommandPalette,
  createFileCommands,
  createViewCommands,
  initializeDragDrop,
  createEditorPanel,
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
