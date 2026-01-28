/**
 * EditorUI - Solid.js Editor UI Root Component
 *
 * Extends FloorplanUI with editor-specific functionality:
 * - Parse error state display
 * - Properties panel for single selection
 * - Add room dialog
 * - Delete confirmation dialog
 * - Export menu
 * - Validation warnings panel
 *
 * Works with InteractiveEditorCore for full editor experience.
 */

import {
  createSignal,
  createEffect,
  onMount,
  onCleanup,
  Show,
  For,
  type JSX,
} from 'solid-js';
import { render } from 'solid-js/web';
import type { InteractiveEditorCore, EntityLocation } from '../../interactive-editor-core.js';
import type { SelectableObject } from '../../scene-context.js';
import { createDebugLogger } from '../../utils/debug.js';
import { HeaderBar } from './HeaderBar.jsx';

const log = createDebugLogger('[EditorUI]');
import { FileDropdown, type FileOperation, type RecentFile } from './FileDropdown.jsx';
import { CommandPalette, type Command } from './CommandPalette.jsx';
import { PropertiesPanel, type PropertyDefinition } from './PropertiesPanel.jsx';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark';

export interface EditorUIProps {
  /** Reference to the editor core */
  editorCore: InteractiveEditorCore;
  /** Initial filename */
  initialFilename?: string;
  /** Initial editor panel state */
  initialEditorOpen?: boolean;
  /** Initial authentication state */
  initialAuthenticated?: boolean;
  /** Initial theme */
  initialTheme?: Theme;
  /** Enable header auto-hide */
  headerAutoHide?: boolean;
  /** Commands for command palette */
  commands?: Command[];
  /** Recent files for file dropdown */
  recentFiles?: RecentFile[];
  /** Callback when a property changes */
  onPropertyChange?: (entityType: string, entityId: string, property: string, value: string) => void;
  /** Callback when delete is requested */
  onDelete?: (entityType: string, entityId: string) => void;
  /** Callback to get entity data for properties panel */
  getEntityData?: (entityType: string, entityId: string) => Record<string, unknown>;
  /** Callback when a command is executed from the command palette */
  onCommandExecute?: (commandId: string) => void;
}

export interface EditorUIConfig extends Omit<EditorUIProps, 'editorCore'> {
  /** Container element to mount UI into */
  container?: HTMLElement;
}

export interface EditorUIAPI {
  /** The root container element */
  element: HTMLElement;
  /** Update filename */
  setFilename: (filename: string) => void;
  /** Update editor open state */
  setEditorOpen: (open: boolean) => void;
  /** Update authentication state */
  setAuthenticated: (authenticated: boolean) => void;
  /** Update theme */
  setTheme: (theme: Theme) => void;
  /** Update commands */
  setCommands: (commands: Command[]) => void;
  /** Update recent files */
  setRecentFiles: (files: RecentFile[]) => void;
  /** Show command palette */
  showCommandPalette: () => void;
  /** Hide command palette */
  hideCommandPalette: () => void;
  /** Show add room dialog */
  showAddRoomDialog: () => void;
  /** Hide properties panel */
  hidePropertiesPanel: () => void;
  /** Dispose and cleanup */
  dispose: () => void;
}

// ============================================================================
// Add Room Dialog Component
// ============================================================================

interface AddRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (room: { name: string; x: number; y: number; width: number; height: number }) => void;
  existingNames?: Set<string>;
}

function AddRoomDialog(props: AddRoomDialogProps) {
  const [name, setName] = createSignal('');
  const [x, setX] = createSignal('0');
  const [y, setY] = createSignal('0');
  const [width, setWidth] = createSignal('4');
  const [height, setHeight] = createSignal('4');
  const [error, setError] = createSignal('');

  // Reset form when dialog opens
  createEffect(() => {
    if (props.isOpen) {
      setName('');
      setX('0');
      setY('0');
      setWidth('4');
      setHeight('4');
      setError('');
    }
  });

  const validate = (): boolean => {
    const roomName = name().trim();
    
    if (!roomName) {
      setError('Room name is required');
      return false;
    }
    
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(roomName)) {
      setError('Room name must start with a letter and contain only letters, numbers, and underscores');
      return false;
    }
    
    if (props.existingNames?.has(roomName)) {
      setError(`Room '${roomName}' already exists`);
      return false;
    }
    
    const w = parseFloat(width()) || 4;
    const h = parseFloat(height()) || 4;
    
    if (w < 0.5 || h < 0.5) {
      setError('Width and height must be at least 0.5');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleAdd = () => {
    if (!validate()) return;
    
    props.onAdd({
      name: name().trim(),
      x: parseFloat(x()) || 0,
      y: parseFloat(y()) || 0,
      width: parseFloat(width()) || 4,
      height: parseFloat(height()) || 4,
    });
    
    props.onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose();
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fp-dialog-overlay visible"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
        onKeyDown={handleKeyDown}
      >
        <div class="fp-dialog" onClick={(e) => e.stopPropagation()}>
          <div class="fp-dialog-header">Add Room</div>
          <div class="fp-dialog-body">
            <div class="fp-form-group">
              <label>Room Name</label>
              <input
                type="text"
                class="fp-dialog-input"
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                autofocus
              />
            </div>
            <div class="fp-form-row">
              <div class="fp-form-group">
                <label>X Position</label>
                <input
                  type="number"
                  class="fp-dialog-input"
                  value={x()}
                  onInput={(e) => setX(e.currentTarget.value)}
                />
              </div>
              <div class="fp-form-group">
                <label>Y Position</label>
                <input
                  type="number"
                  class="fp-dialog-input"
                  value={y()}
                  onInput={(e) => setY(e.currentTarget.value)}
                />
              </div>
            </div>
            <div class="fp-form-row">
              <div class="fp-form-group">
                <label>Width</label>
                <input
                  type="number"
                  class="fp-dialog-input"
                  min="0.5"
                  step="0.5"
                  value={width()}
                  onInput={(e) => setWidth(e.currentTarget.value)}
                />
              </div>
              <div class="fp-form-group">
                <label>Height</label>
                <input
                  type="number"
                  class="fp-dialog-input"
                  min="0.5"
                  step="0.5"
                  value={height()}
                  onInput={(e) => setHeight(e.currentTarget.value)}
                />
              </div>
            </div>
            <Show when={error()}>
              <div class="fp-dialog-error fp-visible">{error()}</div>
            </Show>
          </div>
          <div class="fp-dialog-footer">
            <button class="fp-dialog-btn" onClick={props.onClose}>Cancel</button>
            <button class="fp-dialog-btn primary" onClick={handleAdd}>Add Room</button>
          </div>
        </div>
      </div>
    </Show>
  );
}

// ============================================================================
// Delete Confirmation Dialog Component
// ============================================================================

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  entityType?: string;
  entityId?: string;
  message?: string;
  cascadeItems?: string[];
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <div
        class="fp-dialog-overlay visible"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
        onKeyDown={handleKeyDown}
      >
        <div class="fp-dialog" onClick={(e) => e.stopPropagation()}>
          <div class="fp-dialog-header">
            Delete {props.entityType}: {props.entityId}
          </div>
          <div class="fp-dialog-body">
            <p>{props.message}</p>
            <Show when={props.cascadeItems && props.cascadeItems.length > 0}>
              <div class="fp-dialog-warning">
                <strong>Warning:</strong> The following connections will also be deleted:
                <ul class="fp-cascade-list">
                  <For each={props.cascadeItems}>
                    {(item) => <li>{item}</li>}
                  </For>
                </ul>
              </div>
            </Show>
          </div>
          <div class="fp-dialog-footer">
            <button class="fp-dialog-btn" onClick={props.onClose}>Cancel</button>
            <button class="fp-dialog-btn danger" onClick={props.onConfirm}>Delete</button>
          </div>
        </div>
      </div>
    </Show>
  );
}

// ============================================================================
// Export Menu Component
// ============================================================================

interface ExportMenuProps {
  isOpen: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onExport: (format: 'dsl' | 'json' | 'glb' | 'gltf') => void;
}

function ExportMenu(props: ExportMenuProps) {
  let menuRef: HTMLDivElement | undefined;

  // Close on click outside
  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      props.onClose();
    }
  };

  createEffect(() => {
    if (props.isOpen) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  const menuStyle = (): JSX.CSSProperties => {
    if (!props.anchorRect) return {};
    return {
      position: 'fixed',
      top: `${props.anchorRect.bottom + 4}px`,
      right: `${window.innerWidth - props.anchorRect.right}px`,
    };
  };

  return (
    <Show when={props.isOpen}>
      <div
        ref={menuRef}
        class="fp-export-menu visible"
        style={menuStyle()}
      >
        <div
          class="fp-export-menu-item"
          onClick={() => { props.onExport('dsl'); props.onClose(); }}
        >
          <span class="icon">📝</span>
          <span class="label">Export DSL (.floorplan)</span>
        </div>
        <div
          class="fp-export-menu-item"
          onClick={() => { props.onExport('json'); props.onClose(); }}
        >
          <span class="icon">📋</span>
          <span class="label">Export JSON</span>
        </div>
        <div class="fp-export-menu-divider" />
        <div
          class="fp-export-menu-item"
          onClick={() => { props.onExport('glb'); props.onClose(); }}
        >
          <span class="icon">📦</span>
          <span class="label">Export GLB (Binary)</span>
        </div>
        <div
          class="fp-export-menu-item"
          onClick={() => { props.onExport('gltf'); props.onClose(); }}
        >
          <span class="icon">🗂️</span>
          <span class="label">Export GLTF (JSON)</span>
        </div>
      </div>
    </Show>
  );
}

// ============================================================================
// Shared State Signals
// ============================================================================

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

export function createEditorUIState(props: EditorUIProps) {
  // Core state signals (from FloorplanUI)
  const [filename, setFilename] = createSignal(props.initialFilename ?? 'Untitled.floorplan');
  const [editorOpen, setEditorOpen] = createSignal(props.initialEditorOpen ?? false);
  const [isAuthenticated, setIsAuthenticated] = createSignal(props.initialAuthenticated ?? false);
  const [theme, setTheme] = createSignal<Theme>(props.initialTheme ?? 'dark');

  // UI visibility signals
  const [headerVisible, setHeaderVisible] = createSignal(!props.headerAutoHide);
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false);
  const [dropdownAnchor, setDropdownAnchor] = createSignal<DOMRect | null>(null);

  // Commands and recent files
  const [commands, setCommands] = createSignal<Command[]>(props.commands ?? []);
  const [recentFiles, setRecentFiles] = createSignal<RecentFile[]>(props.recentFiles ?? []);

  // Editor-specific state
  const [hasParseError, setHasParseError] = createSignal(false);
  const [parseErrorMessage, setParseErrorMessage] = createSignal<string | undefined>();
  const [selection, setSelection] = createSignal<ReadonlySet<SelectableObject>>(new Set());
  const [propertiesPanelVisible, setPropertiesPanelVisible] = createSignal(false);
  const [selectedEntity, setSelectedEntity] = createSignal<{ type: string; id: string; floorId: string } | null>(null);
  const [properties, setProperties] = createSignal<PropertyDefinition[]>([]);

  // Dialog state
  const [addRoomDialogOpen, setAddRoomDialogOpen] = createSignal(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false);
  const [deleteTarget, setDeleteTarget] = createSignal<{
    entityType: string;
    entityId: string;
    message: string;
    cascadeItems?: string[];
  } | null>(null);

  // Export menu state
  const [exportMenuOpen, setExportMenuOpen] = createSignal(false);
  const [exportMenuAnchor, setExportMenuAnchor] = createSignal<DOMRect | null>(null);

  // Entity names for validation
  const [existingRoomNames, setExistingRoomNames] = createSignal<Set<string>>(new Set());

  return {
    // Core state
    filename, setFilename,
    editorOpen, setEditorOpen,
    isAuthenticated, setIsAuthenticated,
    theme, setTheme,

    // UI visibility
    headerVisible, setHeaderVisible,
    dropdownOpen, setDropdownOpen,
    commandPaletteOpen, setCommandPaletteOpen,
    dropdownAnchor, setDropdownAnchor,

    // Commands and files
    commands, setCommands,
    recentFiles, setRecentFiles,

    // Editor-specific
    hasParseError, setHasParseError,
    parseErrorMessage, setParseErrorMessage,
    selection, setSelection,
    propertiesPanelVisible, setPropertiesPanelVisible,
    selectedEntity, setSelectedEntity,
    properties, setProperties,

    // Dialogs
    addRoomDialogOpen, setAddRoomDialogOpen,
    deleteDialogOpen, setDeleteDialogOpen,
    deleteTarget, setDeleteTarget,

    // Export menu
    exportMenuOpen, setExportMenuOpen,
    exportMenuAnchor, setExportMenuAnchor,

    // Validation
    existingRoomNames, setExistingRoomNames,
  };
}

export type EditorUIState = ReturnType<typeof createEditorUIState>;

// ============================================================================
// EditorUI Root Component
// ============================================================================

export function EditorUI(props: EditorUIProps) {
  const state = createEditorUIState(props);

  // Subscribe to editorCore events
  onMount(() => {
    const { editorCore } = props;

    const unsubFilename = editorCore.on('filenameChange', ({ filename }) => {
      state.setFilename(filename);
    });

    const unsubTheme = editorCore.on('themeChange', ({ theme }) => {
      state.setTheme(theme as Theme);
    });

    const unsubAuth = editorCore.on('authChange', ({ isAuthenticated }) => {
      state.setIsAuthenticated(isAuthenticated);
    });

    const unsubEditor = editorCore.on('editorToggle', ({ isOpen }) => {
      state.setEditorOpen(isOpen);
    });

    const unsubParseError = editorCore.on('parseError', ({ hasError, errorMessage }) => {
      state.setHasParseError(hasError);
      state.setParseErrorMessage(errorMessage);
    });

    const unsubSelection = editorCore.on('selectionChange', ({ selection }) => {
      state.setSelection(selection);
      updatePropertiesPanel(selection);
    });

    const unsubFloorplan = editorCore.on('floorplanLoaded', ({ data }) => {
      // Update existing room names for validation
      const names = new Set<string>();
      for (const floor of data.floors) {
        for (const room of floor.rooms) {
          names.add(room.name);
        }
      }
      state.setExistingRoomNames(names);
    });

    onCleanup(() => {
      unsubFilename();
      unsubTheme();
      unsubAuth();
      unsubEditor();
      unsubParseError();
      unsubSelection();
      unsubFloorplan();
    });
  });

  // Register ⌘K shortcut for command palette
  onMount(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        state.setCommandPaletteOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleShortcut);
    onCleanup(() => {
      document.removeEventListener('keydown', handleShortcut);
    });
  });

  // Update properties panel based on selection
  const updatePropertiesPanel = (selection: ReadonlySet<SelectableObject>) => {
    if (selection.size === 1) {
      const entity = Array.from(selection)[0];
      state.setSelectedEntity({
        type: entity.entityType,
        id: entity.entityId,
        floorId: entity.floorId,
      });

      // Get entity data from callback
      if (props.getEntityData) {
        const data = props.getEntityData(entity.entityType, entity.entityId);
        const propDefs = buildPropertyDefinitions(entity.entityType, data);
        state.setProperties(propDefs);
      }

      state.setPropertiesPanelVisible(true);
    } else {
      state.setPropertiesPanelVisible(false);
      state.setSelectedEntity(null);
    }
  };

  // Build property definitions from entity data
  const buildPropertyDefinitions = (entityType: string, data: Record<string, unknown>): PropertyDefinition[] => {
    const props: PropertyDefinition[] = [];

    if (entityType === 'room') {
      props.push({ name: 'name', label: 'Name', type: 'text', value: String(data.name ?? '') });
      props.push({ name: 'x', label: 'X', type: 'number', value: Number(data.x ?? 0), step: 0.5 });
      props.push({ name: 'y', label: 'Y', type: 'number', value: Number(data.y ?? 0), step: 0.5 });
      props.push({ name: 'width', label: 'Width', type: 'number', value: Number(data.width ?? 4), min: 0.5, step: 0.5 });
      props.push({ name: 'height', label: 'Height', type: 'number', value: Number(data.height ?? 4), min: 0.5, step: 0.5 });
      if (data.roomHeight) {
        props.push({ name: 'roomHeight', label: 'Room Height', type: 'number', value: Number(data.roomHeight), min: 0.5, step: 0.1 });
      }
      if (data.style) {
        props.push({ name: 'style', label: 'Style', type: 'text', value: String(data.style) });
      }
    } else if (entityType === 'wall') {
      props.push({ name: 'room', label: 'Room', type: 'readonly', value: String(data.room ?? '') });
      props.push({ name: 'direction', label: 'Direction', type: 'readonly', value: String(data.direction ?? '') });
      props.push({
        name: 'type',
        label: 'Type',
        type: 'select',
        value: String(data.type ?? 'solid'),
        options: [
          { value: 'solid', label: 'Solid' },
          { value: 'open', label: 'Open' },
          { value: 'glass', label: 'Glass' },
        ],
      });
    } else if (entityType === 'connection') {
      props.push({ name: 'fromRoom', label: 'From Room', type: 'readonly', value: String(data.fromRoom ?? '') });
      props.push({ name: 'toRoom', label: 'To Room', type: 'readonly', value: String(data.toRoom ?? '') });
      props.push({
        name: 'type',
        label: 'Type',
        type: 'select',
        value: String(data.type ?? 'door'),
        options: [
          { value: 'door', label: 'Door' },
          { value: 'archway', label: 'Archway' },
          { value: 'opening', label: 'Opening' },
        ],
      });
      props.push({ name: 'position', label: 'Position %', type: 'number', value: Number(data.position ?? 50), min: 0, max: 100 });
    }

    return props;
  };

  // Handlers
  const handleFileDropdownClick = (anchor: HTMLElement) => {
    if (state.dropdownOpen()) {
      state.setDropdownOpen(false);
    } else {
      state.setDropdownAnchor(anchor.getBoundingClientRect());
      state.setDropdownOpen(true);
    }
  };

  const handleEditorToggle = () => {
    props.editorCore.toggleEditorPanel();
  };

  const handleThemeToggle = () => {
    props.editorCore.handleThemeToggle();
  };

  const handleFileAction = (action: FileOperation, data?: unknown) => {
    state.setDropdownOpen(false);
    props.editorCore.handleFileAction(action, data);
  };

  const handleCommandExecute = (cmd: Command) => {
    // Close command palette
    state.setCommandPaletteOpen(false);
    
    // Execute via callback if provided
    if (props.onCommandExecute) {
      props.onCommandExecute(cmd.id);
    }
  };

  const handlePropertyChange = (property: string, value: string) => {
    const entity = state.selectedEntity();
    if (entity && props.onPropertyChange) {
      props.onPropertyChange(entity.type, entity.id, property, value);
    }
  };

  const handleDelete = () => {
    const entity = state.selectedEntity();
    if (!entity) return;

    // TODO: Calculate cascade items (connections to delete)
    state.setDeleteTarget({
      entityType: entity.type,
      entityId: entity.id,
      message: entity.type === 'wall'
        ? `This will change the wall to "open" (removing the wall). Continue?`
        : `Are you sure you want to delete ${entity.type} "${entity.id}"?`,
      cascadeItems: [], // Would be populated with affected connections
    });
    state.setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    const target = state.deleteTarget();
    if (target && props.onDelete) {
      props.onDelete(target.entityType, target.entityId);
    }
    state.setDeleteDialogOpen(false);
    state.setDeleteTarget(null);
    state.setPropertiesPanelVisible(false);
  };

  const handleAddRoom = (room: { name: string; x: number; y: number; width: number; height: number }) => {
    // This would be handled by a callback prop that generates DSL
    console.log('Add room:', room);
  };

  const handleExport = (format: 'dsl' | 'json' | 'glb' | 'gltf') => {
    // Map to file actions
    const actionMap: Record<string, FileOperation> = {
      dsl: 'save-floorplan',
      json: 'export-json',
      glb: 'export-glb',
      gltf: 'export-gltf',
    };
    props.editorCore.handleFileAction(actionMap[format]);
  };

  return (
    <>
      {/* Header Bar */}
      <HeaderBar
        filename={state.filename}
        editorOpen={state.editorOpen}
        isAuthenticated={state.isAuthenticated}
        theme={state.theme}
        autoHide={props.headerAutoHide ?? false}
        dropdownOpen={state.dropdownOpen}
        onFileDropdownClick={handleFileDropdownClick}
        onEditorToggle={handleEditorToggle}
        onThemeToggle={handleThemeToggle}
        onCommandPaletteClick={() => state.setCommandPaletteOpen(true)}
        onVisibilityChange={(visible) => props.editorCore.layoutManager.setHeaderVisible(visible)}
      />

      {/* File Dropdown */}
      <FileDropdown
        isOpen={state.dropdownOpen}
        anchorRect={state.dropdownAnchor}
        isAuthenticated={state.isAuthenticated}
        recentFiles={state.recentFiles}
        onAction={handleFileAction}
        onClose={() => state.setDropdownOpen(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        commands={state.commands}
        isOpen={state.commandPaletteOpen}
        isAuthenticated={state.isAuthenticated}
        onClose={() => state.setCommandPaletteOpen(false)}
        onExecute={handleCommandExecute}
      />

      {/* Properties Panel */}
      <PropertiesPanel
        isVisible={state.propertiesPanelVisible()}
        entityType={state.selectedEntity()?.type}
        entityId={state.selectedEntity()?.id}
        properties={state.properties()}
        onPropertyChange={handlePropertyChange}
        onDelete={handleDelete}
        onClose={() => state.setPropertiesPanelVisible(false)}
      />

      {/* Parse Error Banner */}
      <Show when={state.hasParseError()}>
        <div class="fp-error-banner visible">
          {state.parseErrorMessage() ?? 'Parse error'}
        </div>
      </Show>

      {/* Add Room Dialog */}
      <AddRoomDialog
        isOpen={state.addRoomDialogOpen()}
        onClose={() => state.setAddRoomDialogOpen(false)}
        onAdd={handleAddRoom}
        existingNames={state.existingRoomNames()}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={state.deleteDialogOpen()}
        entityType={state.deleteTarget()?.entityType}
        entityId={state.deleteTarget()?.entityId}
        message={state.deleteTarget()?.message}
        cascadeItems={state.deleteTarget()?.cascadeItems}
        onClose={() => { state.setDeleteDialogOpen(false); state.setDeleteTarget(null); }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Export Menu */}
      <ExportMenu
        isOpen={state.exportMenuOpen()}
        anchorRect={state.exportMenuAnchor()}
        onClose={() => state.setExportMenuOpen(false)}
        onExport={handleExport}
      />
    </>
  );
}

// ============================================================================
// Vanilla-Compatible Factory
// ============================================================================

/**
 * Create EditorUI with vanilla-compatible API.
 */
export function createEditorUI(
  editorCore: InteractiveEditorCore,
  config: EditorUIConfig = {}
): EditorUIAPI {
  const container = config.container ?? document.createElement('div');
  container.id = 'editor-ui-root';

  if (!config.container) {
    document.body.appendChild(container);
  }

  // Create reactive setters that will be bound during render
  let setFilename: (f: string) => void;
  let setEditorOpen: (o: boolean) => void;
  let setAuthenticated: (a: boolean) => void;
  let setTheme: (t: Theme) => void;
  let setCommands: (c: Command[]) => void;
  let setRecentFiles: (f: RecentFile[]) => void;
  let setCommandPaletteOpen: (o: boolean) => void;
  let setAddRoomDialogOpen: (o: boolean) => void;
  let setPropertiesPanelVisible: (v: boolean) => void;

  const dispose = render(() => {
    const state = createEditorUIState({
      editorCore,
      initialFilename: config.initialFilename,
      initialEditorOpen: config.initialEditorOpen,
      initialAuthenticated: config.initialAuthenticated,
      initialTheme: config.initialTheme,
      headerAutoHide: config.headerAutoHide,
      commands: config.commands,
      recentFiles: config.recentFiles,
      onPropertyChange: config.onPropertyChange,
      onDelete: config.onDelete,
      getEntityData: config.getEntityData,
      onCommandExecute: config.onCommandExecute,
    });

    // Bind setters for external API
    setFilename = state.setFilename;
    setEditorOpen = state.setEditorOpen;
    setAuthenticated = state.setIsAuthenticated;
    setTheme = state.setTheme;
    setCommands = state.setCommands;
    setRecentFiles = state.setRecentFiles;
    setCommandPaletteOpen = state.setCommandPaletteOpen;
    setAddRoomDialogOpen = state.setAddRoomDialogOpen;
    setPropertiesPanelVisible = state.setPropertiesPanelVisible;

    // Subscribe to editorCore events
    const unsubFilename = editorCore.on('filenameChange', ({ filename }) => {
      state.setFilename(filename);
    });

    const unsubTheme = editorCore.on('themeChange', ({ theme }) => {
      state.setTheme(theme as Theme);
    });

    const unsubAuth = editorCore.on('authChange', ({ isAuthenticated }) => {
      state.setIsAuthenticated(isAuthenticated);
    });

    const unsubEditor = editorCore.on('editorToggle', ({ isOpen }) => {
      state.setEditorOpen(isOpen);
    });

    const unsubParseError = editorCore.on('parseError', ({ hasError, errorMessage }) => {
      state.setHasParseError(hasError);
      state.setParseErrorMessage(errorMessage);
    });

    // Build property definitions from entity data
    const buildPropertyDefinitions = (entityType: string, data: Record<string, unknown>): PropertyDefinition[] => {
      const props: PropertyDefinition[] = [];

      if (entityType === 'room') {
        props.push({ name: 'name', label: 'Name', type: 'text', value: String(data.name ?? '') });
        props.push({ name: 'x', label: 'X', type: 'number', value: Number(data.x ?? 0), step: 0.5 });
        props.push({ name: 'y', label: 'Y', type: 'number', value: Number(data.y ?? 0), step: 0.5 });
        props.push({ name: 'width', label: 'Width', type: 'number', value: Number(data.width ?? 4), min: 0.5, step: 0.5 });
        props.push({ name: 'height', label: 'Height', type: 'number', value: Number(data.height ?? 4), min: 0.5, step: 0.5 });
        if (data.roomHeight) {
          props.push({ name: 'roomHeight', label: 'Room Height', type: 'number', value: Number(data.roomHeight), min: 0.5, step: 0.1 });
        }
        if (data.style) {
          props.push({ name: 'style', label: 'Style', type: 'text', value: String(data.style) });
        }
      } else if (entityType === 'wall') {
        props.push({ name: 'room', label: 'Room', type: 'readonly', value: String(data.room ?? '') });
        props.push({ name: 'direction', label: 'Direction', type: 'readonly', value: String(data.direction ?? '') });
        props.push({
          name: 'type',
          label: 'Type',
          type: 'select',
          value: String(data.type ?? 'solid'),
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'open', label: 'Open' },
            { value: 'partial', label: 'Partial' },
          ],
        });
      } else if (entityType === 'connection') {
        props.push({ name: 'fromRoom', label: 'From', type: 'readonly', value: String(data.fromRoom ?? '') });
        props.push({ name: 'toRoom', label: 'To', type: 'readonly', value: String(data.toRoom ?? '') });
        props.push({
          name: 'type',
          label: 'Type',
          type: 'select',
          value: String(data.type ?? 'door'),
          options: [
            { value: 'door', label: 'Door' },
            { value: 'window', label: 'Window' },
            { value: 'open', label: 'Open' },
          ],
        });
        props.push({
          name: 'position',
          label: 'Position',
          type: 'number',
          value: Number(data.position ?? 50),
          min: 0,
          max: 100,
          step: 5,
        });
      }

      return props;
    };

    log('Subscribing to selectionChange event');
    const unsubSelection = editorCore.on('selectionChange', ({ selection }) => {
      log('Received selectionChange event:', { size: selection.size });
      state.setSelection(selection);
      // Update properties panel visibility based on selection
      if (selection.size === 1) {
        const entity = Array.from(selection)[0];
        log('Single selection, showing properties panel:', entity);
        state.setSelectedEntity({
          type: entity.entityType,
          id: entity.entityId,
          floorId: entity.floorId,
        });
        
        // Get entity data from callback and build properties
        if (config.getEntityData) {
          const data = config.getEntityData(entity.entityType, entity.entityId);
          const propDefs = buildPropertyDefinitions(entity.entityType, data);
          state.setProperties(propDefs);
        }
        
        state.setPropertiesPanelVisible(true);
      } else {
        state.setPropertiesPanelVisible(false);
        state.setSelectedEntity(null);
      }
    });

    onCleanup(() => {
      unsubFilename();
      unsubTheme();
      unsubAuth();
      unsubEditor();
      unsubParseError();
      unsubSelection();
    });

    // Register ⌘K shortcut
    const handleShortcut = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        state.setCommandPaletteOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleShortcut);
    onCleanup(() => {
      document.removeEventListener('keydown', handleShortcut);
    });

    // Handlers
    const handleFileDropdownClick = (anchor: HTMLElement) => {
      if (state.dropdownOpen()) {
        state.setDropdownOpen(false);
      } else {
        state.setDropdownAnchor(anchor.getBoundingClientRect());
        state.setDropdownOpen(true);
      }
    };

    const handleEditorToggle = () => {
      editorCore.toggleEditorPanel();
    };

    const handleThemeToggle = () => {
      editorCore.handleThemeToggle();
    };

    const handleFileAction = (action: FileOperation, data?: unknown) => {
      state.setDropdownOpen(false);
      editorCore.handleFileAction(action, data);
    };

    const handleCommandExecute = (cmd: Command) => {
      // Close command palette
      state.setCommandPaletteOpen(false);
      
      // Execute via callback if provided
      if (config.onCommandExecute) {
        config.onCommandExecute(cmd.id);
      }
    };

    const handlePropertyChange = (property: string, value: string) => {
      const entity = state.selectedEntity();
      if (entity && config.onPropertyChange) {
        config.onPropertyChange(entity.type, entity.id, property, value);
      }
    };

    const handleDelete = () => {
      const entity = state.selectedEntity();
      if (!entity) return;

      state.setDeleteTarget({
        entityType: entity.type,
        entityId: entity.id,
        message: entity.type === 'wall'
          ? `This will change the wall to "open". Continue?`
          : `Delete ${entity.type} "${entity.id}"?`,
      });
      state.setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
      const target = state.deleteTarget();
      if (target && config.onDelete) {
        config.onDelete(target.entityType, target.entityId);
      }
      state.setDeleteDialogOpen(false);
      state.setDeleteTarget(null);
      state.setPropertiesPanelVisible(false);
    };

    const handleAddRoom = (room: { name: string; x: number; y: number; width: number; height: number }) => {
      console.log('Add room:', room);
      // Would be handled by parent via callback
    };

    const handleExport = (format: 'dsl' | 'json' | 'glb' | 'gltf') => {
      const actionMap: Record<string, FileOperation> = {
        dsl: 'save-floorplan',
        json: 'export-json',
        glb: 'export-glb',
        gltf: 'export-gltf',
      };
      editorCore.handleFileAction(actionMap[format]);
    };

    return (
      <>
        <HeaderBar
          filename={state.filename}
          editorOpen={state.editorOpen}
          isAuthenticated={state.isAuthenticated}
          theme={state.theme}
          autoHide={config.headerAutoHide ?? false}
          dropdownOpen={state.dropdownOpen}
          onFileDropdownClick={handleFileDropdownClick}
          onEditorToggle={handleEditorToggle}
          onThemeToggle={handleThemeToggle}
          onCommandPaletteClick={() => state.setCommandPaletteOpen(true)}
          onVisibilityChange={(visible) => editorCore.layoutManager.setHeaderVisible(visible)}
        />

        <FileDropdown
          isOpen={state.dropdownOpen}
          anchorRect={state.dropdownAnchor}
          isAuthenticated={state.isAuthenticated}
          recentFiles={state.recentFiles}
          onAction={handleFileAction}
          onClose={() => state.setDropdownOpen(false)}
        />

        <CommandPalette
          commands={state.commands}
          isOpen={state.commandPaletteOpen}
          isAuthenticated={state.isAuthenticated}
          onClose={() => state.setCommandPaletteOpen(false)}
          onExecute={handleCommandExecute}
        />

        <PropertiesPanel
          isVisible={state.propertiesPanelVisible()}
          entityType={state.selectedEntity()?.type}
          entityId={state.selectedEntity()?.id}
          properties={state.properties()}
          onPropertyChange={handlePropertyChange}
          onDelete={handleDelete}
          onClose={() => state.setPropertiesPanelVisible(false)}
        />

        <Show when={state.hasParseError()}>
          <div class="fp-error-banner visible">
            {state.parseErrorMessage() ?? 'Parse error'}
          </div>
        </Show>

        <AddRoomDialog
          isOpen={state.addRoomDialogOpen()}
          onClose={() => state.setAddRoomDialogOpen(false)}
          onAdd={handleAddRoom}
          existingNames={state.existingRoomNames()}
        />

        <DeleteConfirmDialog
          isOpen={state.deleteDialogOpen()}
          entityType={state.deleteTarget()?.entityType}
          entityId={state.deleteTarget()?.entityId}
          message={state.deleteTarget()?.message}
          cascadeItems={state.deleteTarget()?.cascadeItems}
          onClose={() => { state.setDeleteDialogOpen(false); state.setDeleteTarget(null); }}
          onConfirm={handleDeleteConfirm}
        />

        <ExportMenu
          isOpen={state.exportMenuOpen()}
          anchorRect={state.exportMenuAnchor()}
          onClose={() => state.setExportMenuOpen(false)}
          onExport={handleExport}
        />
      </>
    );
  }, container);

  return {
    element: container,

    setFilename: (filename: string) => setFilename?.(filename),
    setEditorOpen: (open: boolean) => setEditorOpen?.(open),
    setAuthenticated: (auth: boolean) => setAuthenticated?.(auth),
    setTheme: (theme: Theme) => setTheme?.(theme),
    setCommands: (commands: Command[]) => setCommands?.(commands),
    setRecentFiles: (files: RecentFile[]) => setRecentFiles?.(files),
    showCommandPalette: () => setCommandPaletteOpen?.(true),
    hideCommandPalette: () => setCommandPaletteOpen?.(false),
    showAddRoomDialog: () => setAddRoomDialogOpen?.(true),
    hidePropertiesPanel: () => setPropertiesPanelVisible?.(false),

    dispose: () => {
      dispose();
      if (!config.container) {
        container.remove();
      }
    },
  };
}
