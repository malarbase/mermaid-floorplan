/**
 * Command Utilities
 *
 * Utility functions for creating standard file and view commands.
 * These are used by both FloorplanUI and EditorUI.
 */

// Platform detection for keyboard shortcuts
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const modKey = isMac ? '⌘' : 'Ctrl+';

/**
 * Command interface for command palette.
 */
export interface Command {
  /** Unique command ID */
  id: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Keyboard shortcut (for display) */
  shortcut?: string;
  /** Category for grouping */
  category?: string;
  /** Whether this command requires authentication */
  requiresAuth?: boolean;
  /** Whether this command is currently disabled */
  disabled?: boolean;
  /** Icon (emoji or text) */
  icon?: string;
  /** Action callback */
  execute: () => void;
}

/**
 * File operation type for dropdown actions.
 */
export type FileOperation =
  | 'open-file'
  | 'open-url'
  | 'open-recent'
  | 'save-floorplan'
  | 'export-json'
  | 'export-glb'
  | 'export-gltf'
  | 'export-dxf';

/**
 * Create default file operation commands.
 */
export function createFileCommands(handlers: {
  onOpenFile?: () => void;
  onOpenUrl?: () => void;
  onSave?: () => void;
  onExportJson?: () => void;
  onExportGlb?: () => void;
  onExportGltf?: () => void;
  onExportDxf?: () => void;
}): Command[] {
  const commands: Command[] = [
    {
      id: 'file.open',
      label: 'Open File...',
      category: 'File',
      shortcut: `${modKey}O`,
      icon: '📂',
      execute: () => handlers.onOpenFile?.(),
    },
    {
      id: 'file.open-url',
      label: 'Open from URL...',
      category: 'File',
      icon: '🔗',
      execute: () => handlers.onOpenUrl?.(),
    },
    {
      id: 'file.save',
      label: 'Save .floorplan',
      category: 'File',
      shortcut: `${modKey}S`,
      icon: '💾',
      requiresAuth: true,
      execute: () => handlers.onSave?.(),
    },
    {
      id: 'file.export-json',
      label: 'Export JSON',
      description: 'Export as JSON data file',
      category: 'File',
      icon: '📄',
      execute: () => handlers.onExportJson?.(),
    },
    {
      id: 'file.export-glb',
      label: 'Export GLB',
      description: '3D model (binary)',
      category: 'File',
      icon: '🎮',
      execute: () => handlers.onExportGlb?.(),
    },
    {
      id: 'file.export-gltf',
      label: 'Export GLTF',
      description: '3D model (text)',
      category: 'File',
      icon: '🎮',
      execute: () => handlers.onExportGltf?.(),
    },
  ];

  // Add DXF export if handler provided
  if (handlers.onExportDxf) {
    commands.push({
      id: 'file.export-dxf',
      label: 'Export DXF',
      description: '2D CAD format',
      category: 'File',
      icon: '📐',
      execute: () => handlers.onExportDxf?.(),
    });
  }

  return commands;
}

/**
 * Create default view commands.
 */
export function createViewCommands(handlers: {
  onToggleTheme?: () => void;
  onToggleOrtho?: () => void;
  onIsometricView?: () => void;
  onResetCamera?: () => void;
  onFrameAll?: () => void;
}): Command[] {
  return [
    {
      id: 'view.toggle-theme',
      label: 'Toggle Theme',
      description: 'Switch between light and dark',
      category: 'View',
      icon: '🎨',
      execute: () => handlers.onToggleTheme?.(),
    },
    {
      id: 'view.toggle-ortho',
      label: 'Toggle Camera Mode',
      description: 'Switch perspective/orthographic',
      category: 'View',
      shortcut: '5',
      icon: '📷',
      execute: () => handlers.onToggleOrtho?.(),
    },
    {
      id: 'view.isometric',
      label: 'Isometric View',
      category: 'View',
      icon: '📐',
      execute: () => handlers.onIsometricView?.(),
    },
    {
      id: 'view.reset-camera',
      label: 'Reset Camera',
      category: 'View',
      shortcut: 'Home',
      icon: '🏠',
      execute: () => handlers.onResetCamera?.(),
    },
    {
      id: 'view.frame-all',
      label: 'Frame All',
      description: 'Fit all geometry in view',
      category: 'View',
      shortcut: 'F',
      icon: '🔲',
      execute: () => handlers.onFrameAll?.(),
    },
  ];
}

/**
 * Create editor-specific commands.
 */
export function createEditorCommands(handlers: {
  onAddRoom?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectAll?: () => void;
  onDeselect?: () => void;
}): Command[] {
  return [
    {
      id: 'edit.add-room',
      label: 'Add Room',
      category: 'Edit',
      icon: '➕',
      requiresAuth: true,
      execute: () => handlers.onAddRoom?.(),
    },
    {
      id: 'edit.undo',
      label: 'Undo',
      category: 'Edit',
      shortcut: `${modKey}Z`,
      icon: '↩️',
      execute: () => handlers.onUndo?.(),
    },
    {
      id: 'edit.redo',
      label: 'Redo',
      category: 'Edit',
      shortcut: `${modKey}⇧Z`,
      icon: '↪️',
      execute: () => handlers.onRedo?.(),
    },
    {
      id: 'edit.select-all',
      label: 'Select All',
      category: 'Edit',
      shortcut: `${modKey}A`,
      icon: '⬜',
      execute: () => handlers.onSelectAll?.(),
    },
    {
      id: 'edit.deselect',
      label: 'Deselect All',
      category: 'Edit',
      shortcut: 'Escape',
      icon: '◻️',
      execute: () => handlers.onDeselect?.(),
    },
  ];
}
