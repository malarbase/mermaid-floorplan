/**
 * FloorplanUI - Unified Solid.js UI Root Component
 *
 * This component owns all 2D UI state and renders the complete UI layer:
 * - HeaderBar with file dropdown trigger
 * - FileDropdown with file operations
 * - CommandPalette with keyboard shortcut (⌘K)
 * - (Editor mode) PropertiesPanel, AddRoomDialog, DeleteConfirmDialog, ErrorBanner
 *
 * Key architecture principles:
 * - All UI state lives in Solid signals (no imperative APIs)
 * - Components coordinate via shared signals (not callbacks)
 * - FloorplanAppCore/InteractiveEditorCore handles 3D rendering separately
 * - Communication with 3D is via event subscription and method calls
 * - Mode-based rendering: 'viewer' (read-only) vs 'editor' (full editing)
 *
 * This module imports standalone components and provides state coordination.
 */

import { getUIThemeMode, type ViewerTheme } from 'floorplan-3d-core';
import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { render } from 'solid-js/web';
import type { FloorplanAppCore } from '../../floorplan-app-core.js';
import type { InteractiveEditorCore } from '../../interactive-editor-core.js';
import type { SelectableObject } from '../../scene-context.js';
import { type Command, CommandPalette } from './CommandPalette.jsx';
import { FileDropdown, type FileOperation, type RecentFile } from './FileDropdown.jsx';
import { HeaderBar } from './HeaderBar.jsx';
import { PropertiesPanel, type PropertyDefinition } from './PropertiesPanel.jsx';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark';

/** Mode determines which features are available */
export type UIMode = 'viewer' | 'editor';

/** Core type that works for both viewer and editor */
export type AppCore = FloorplanAppCore | InteractiveEditorCore;

export interface FloorplanUIProps {
  /** Reference to the 3D app core (FloorplanAppCore or InteractiveEditorCore) */
  appCore: AppCore;
  /** UI mode - 'viewer' for read-only, 'editor' for full editing */
  mode?: UIMode;
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

  // Feature flags (derived from mode by default, but overridable)
  /** Show properties panel when entity selected (default: mode === 'editor') */
  showPropertiesPanel?: boolean;
  /** Show add room button (default: mode === 'editor') */
  showAddRoomButton?: boolean;
  /** Show delete confirm dialog (default: mode === 'editor') */
  showDeleteConfirm?: boolean;
  /** Show export menu (default: true) */
  showExportMenu?: boolean;

  // Editor-specific callbacks (only used when mode === 'editor')
  /** Callback when a property changes */
  onPropertyChange?: (
    entityType: string,
    entityId: string,
    property: string,
    value: string,
  ) => void;
  /** Callback when delete is requested */
  onDelete?: (entityType: string, entityId: string) => void;
  /** Callback to get entity data for properties panel */
  getEntityData?: (entityType: string, entityId: string) => Record<string, unknown>;
  /** Callback when add room is confirmed */
  onAddRoom?: (room: { name: string; x: number; y: number; width: number; height: number }) => void;
}

export interface FloorplanUIConfig extends Omit<FloorplanUIProps, 'appCore'> {
  /** Container element to mount UI into */
  container?: HTMLElement;
}

export interface FloorplanUIAPI {
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
  /** Show add room dialog (editor mode only) */
  showAddRoomDialog: () => void;
  /** Hide properties panel (editor mode only) */
  hidePropertiesPanel: () => void;
  /** Update existing room names for validation (editor mode only) */
  setExistingRoomNames: (names: Set<string>) => void;
  /** Dispose and cleanup */
  dispose: () => void;
}

// ============================================================================
// Shared State Signals (exported for direct use by child components)
// ============================================================================

/**
 * Create shared UI state signals.
 * These signals are passed to child components for reactive coordination.
 */
export function createUIState(props: FloorplanUIProps) {
  // Determine mode and feature flags
  const mode = props.mode ?? 'viewer';
  const isEditorMode = mode === 'editor';

  // Feature flags with mode-based defaults
  const showPropertiesPanel = props.showPropertiesPanel ?? isEditorMode;
  const showAddRoomButton = props.showAddRoomButton ?? isEditorMode;
  const showDeleteConfirm = props.showDeleteConfirm ?? isEditorMode;
  const showExportMenu = props.showExportMenu ?? true;

  // Core state signals
  const [filename, setFilename] = createSignal(props.initialFilename ?? 'Untitled.floorplan');
  const [editorOpen, setEditorOpen] = createSignal(props.initialEditorOpen ?? false);
  const [isAuthenticated, setIsAuthenticated] = createSignal(props.initialAuthenticated ?? false);
  const [theme, setTheme] = createSignal<Theme>(props.initialTheme ?? 'dark');

  // UI visibility signals
  const [headerVisible, setHeaderVisible] = createSignal(!props.headerAutoHide);
  const [dropdownOpen, setDropdownOpen] = createSignal(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = createSignal(false);

  // Dropdown anchor for positioning
  const [dropdownAnchor, setDropdownAnchor] = createSignal<DOMRect | null>(null);

  // Commands and recent files
  const [commands, setCommands] = createSignal<Command[]>(props.commands ?? []);
  const [recentFiles, setRecentFiles] = createSignal<RecentFile[]>(props.recentFiles ?? []);

  // Editor-specific state (only used when mode === 'editor')
  const [hasParseError, setHasParseError] = createSignal(false);
  const [parseErrorMessage, setParseErrorMessage] = createSignal<string | undefined>();
  const [selection, setSelection] = createSignal<ReadonlySet<SelectableObject>>(new Set());
  const [propertiesPanelVisible, setPropertiesPanelVisible] = createSignal(false);
  const [selectedEntity, setSelectedEntity] = createSignal<{
    type: string;
    id: string;
    floorId: string;
  } | null>(null);
  const [properties, setProperties] = createSignal<PropertyDefinition[]>([]);

  // Dialog state (editor mode)
  const [addRoomDialogOpen, setAddRoomDialogOpen] = createSignal(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false);
  const [deleteTarget, setDeleteTarget] = createSignal<{
    entityType: string;
    entityId: string;
    message: string;
    cascadeItems?: string[];
  } | null>(null);

  // Validation state
  const [existingRoomNames, setExistingRoomNames] = createSignal<Set<string>>(new Set());

  return {
    // Mode and flags
    mode,
    isEditorMode,
    showPropertiesPanel,
    showAddRoomButton,
    showDeleteConfirm,
    showExportMenu,

    // Core state
    filename,
    setFilename,
    editorOpen,
    setEditorOpen,
    isAuthenticated,
    setIsAuthenticated,
    theme,
    setTheme,

    // UI visibility
    headerVisible,
    setHeaderVisible,
    dropdownOpen,
    setDropdownOpen,
    commandPaletteOpen,
    setCommandPaletteOpen,

    // Dropdown positioning
    dropdownAnchor,
    setDropdownAnchor,

    // Commands and files
    commands,
    setCommands,
    recentFiles,
    setRecentFiles,

    // Editor-specific state
    hasParseError,
    setHasParseError,
    parseErrorMessage,
    setParseErrorMessage,
    selection,
    setSelection,
    propertiesPanelVisible,
    setPropertiesPanelVisible,
    selectedEntity,
    setSelectedEntity,
    properties,
    setProperties,

    // Dialog state
    addRoomDialogOpen,
    setAddRoomDialogOpen,
    deleteDialogOpen,
    setDeleteDialogOpen,
    deleteTarget,
    setDeleteTarget,

    // Validation
    existingRoomNames,
    setExistingRoomNames,
  };
}

export type UIState = ReturnType<typeof createUIState>;

// ============================================================================
// Add Room Dialog Component (inline for unified UI)
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
      setError(
        'Room name must start with a letter and contain only letters, numbers, and underscores',
      );
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
      <div class="modal modal-open" onKeyDown={handleKeyDown}>
        <div class="modal-box">
          <h3 class="font-bold text-lg mb-4">Add New Room</h3>
          <div class="form-control mb-3">
            <label class="label">
              <span class="label-text">Room Name</span>
            </label>
            <input
              type="text"
              class="input input-bordered"
              value={name()}
              onInput={(e) => setName(e.currentTarget.value)}
              placeholder="e.g., Bedroom, Office"
              autofocus
            />
          </div>
          <div class="grid grid-cols-2 gap-4 mb-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">X Position</span>
              </label>
              <input
                type="number"
                class="input input-bordered"
                value={x()}
                onInput={(e) => setX(e.currentTarget.value)}
                step="0.5"
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Y Position</span>
              </label>
              <input
                type="number"
                class="input input-bordered"
                value={y()}
                onInput={(e) => setY(e.currentTarget.value)}
                step="0.5"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-3">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Width</span>
              </label>
              <input
                type="number"
                class="input input-bordered"
                min="0.5"
                step="0.5"
                value={width()}
                onInput={(e) => setWidth(e.currentTarget.value)}
              />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Height</span>
              </label>
              <input
                type="number"
                class="input input-bordered"
                min="0.5"
                step="0.5"
                value={height()}
                onInput={(e) => setHeight(e.currentTarget.value)}
              />
            </div>
          </div>
          <Show when={error()}>
            <div class="text-error text-sm mb-3">{error()}</div>
          </Show>
          <div class="modal-action">
            <button class="btn" onClick={props.onClose}>
              Cancel
            </button>
            <button class="btn btn-primary" onClick={handleAdd}>
              Add Room
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={props.onClose}></div>
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
      <div class="modal modal-open" onKeyDown={handleKeyDown}>
        <div class="modal-box">
          <h3 class="font-bold text-lg">
            Delete {props.entityType}: {props.entityId}?
          </h3>
          <p class="py-4">{props.message}</p>
          <Show when={props.cascadeItems && props.cascadeItems.length > 0}>
            <div class="alert alert-warning text-sm">
              <div>
                <div class="font-semibold">⚠️ This will also delete:</div>
                <ul class="list-disc list-inside mt-1">
                  <For each={props.cascadeItems}>{(item) => <li>{item}</li>}</For>
                </ul>
              </div>
            </div>
          </Show>
          <div class="modal-action">
            <button class="btn" onClick={props.onClose}>
              Cancel
            </button>
            <button class="btn btn-error" onClick={props.onConfirm}>
              Delete
            </button>
          </div>
        </div>
        <div class="modal-backdrop" onClick={props.onClose}></div>
      </div>
    </Show>
  );
}

// ============================================================================
// Property Definition Builder
// ============================================================================

function buildPropertyDefinitions(
  entityType: string,
  data: Record<string, unknown>,
): PropertyDefinition[] {
  const props: PropertyDefinition[] = [];

  if (entityType === 'room') {
    props.push({ name: 'name', label: 'Name', type: 'text', value: String(data.name ?? '') });
    props.push({ name: 'x', label: 'X', type: 'number', value: Number(data.x ?? 0), step: 0.5 });
    props.push({ name: 'y', label: 'Y', type: 'number', value: Number(data.y ?? 0), step: 0.5 });
    props.push({
      name: 'width',
      label: 'Width',
      type: 'number',
      value: Number(data.width ?? 4),
      min: 0.5,
      step: 0.5,
    });
    props.push({
      name: 'height',
      label: 'Height',
      type: 'number',
      value: Number(data.height ?? 4),
      min: 0.5,
      step: 0.5,
    });
    if (data.roomHeight) {
      props.push({
        name: 'roomHeight',
        label: 'Room Height',
        type: 'number',
        value: Number(data.roomHeight),
        min: 0.5,
        step: 0.1,
      });
    }
    if (data.style) {
      props.push({ name: 'style', label: 'Style', type: 'text', value: String(data.style) });
    }
  } else if (entityType === 'wall') {
    props.push({ name: 'room', label: 'Room', type: 'readonly', value: String(data.room ?? '') });
    props.push({
      name: 'direction',
      label: 'Direction',
      type: 'readonly',
      value: String(data.direction ?? ''),
    });
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
    props.push({
      name: 'fromRoom',
      label: 'From Room',
      type: 'readonly',
      value: String(data.fromRoom ?? ''),
    });
    props.push({
      name: 'toRoom',
      label: 'To Room',
      type: 'readonly',
      value: String(data.toRoom ?? ''),
    });
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
    props.push({
      name: 'position',
      label: 'Position %',
      type: 'number',
      value: Number(data.position ?? 50),
      min: 0,
      max: 100,
    });
  }

  return props;
}

// Platform detection for keyboard shortcuts
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

// ============================================================================
// FloorplanUI Root Component (Unified for viewer and editor modes)
// ============================================================================

export function FloorplanUI(props: FloorplanUIProps) {
  const state = createUIState(props);

  // Set data-theme attribute on document for DaisyUI theming
  createEffect(() => {
    const currentTheme = state.theme();
    document.documentElement.setAttribute('data-theme', currentTheme);
    // Also maintain body.dark-theme for backward compatibility during migration
    document.body.classList.toggle('dark-theme', currentTheme === 'dark');
  });

  // Subscribe to appCore events
  onMount(() => {
    const { appCore } = props;

    // Cast to FloorplanAppCore for common events (works for both base and editor core)
    const baseCore = appCore as FloorplanAppCore;

    const unsubFilename = baseCore.on('filenameChange', ({ filename }: { filename: string }) => {
      state.setFilename(filename);
    });

    const unsubTheme = baseCore.on('themeChange', ({ theme }: { theme: string }) => {
      // Convert ViewerTheme (light/dark/blueprint) to UI Theme (light/dark)
      state.setTheme(getUIThemeMode(theme as ViewerTheme));
    });

    const unsubAuth = baseCore.on(
      'authChange',
      ({ isAuthenticated }: { isAuthenticated: boolean }) => {
        state.setIsAuthenticated(isAuthenticated);
      },
    );

    const unsubEditor = baseCore.on('editorToggle', ({ isOpen }: { isOpen: boolean }) => {
      state.setEditorOpen(isOpen);
    });

    // Editor-specific event subscriptions
    let unsubParseError: (() => void) | undefined;
    let unsubSelection: (() => void) | undefined;
    let unsubFloorplan: (() => void) | undefined;

    if (state.isEditorMode) {
      // Cast to InteractiveEditorCore for editor-specific events
      const editorCore = appCore as InteractiveEditorCore;

      unsubParseError = editorCore.on('parseError', ({ hasError, errorMessage }) => {
        state.setHasParseError(hasError);
        state.setParseErrorMessage(errorMessage);
      });

      unsubSelection = editorCore.on('selectionChange', ({ selection }) => {
        state.setSelection(selection);
        updatePropertiesPanel(selection);
      });

      unsubFloorplan = editorCore.on('floorplanLoaded', ({ data }) => {
        // Update existing room names for validation
        const names = new Set<string>();
        for (const floor of data.floors) {
          for (const room of floor.rooms) {
            names.add(room.name);
          }
        }
        state.setExistingRoomNames(names);
      });
    }

    onCleanup(() => {
      unsubFilename();
      unsubTheme();
      unsubAuth();
      unsubEditor();
      unsubParseError?.();
      unsubSelection?.();
      unsubFloorplan?.();
    });
  });

  // Register ⌘K shortcut for command palette
  onMount(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        state.setCommandPaletteOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', handleShortcut);
    onCleanup(() => {
      document.removeEventListener('keydown', handleShortcut);
    });
  });

  // Update properties panel based on selection (editor mode)
  const updatePropertiesPanel = (selection: ReadonlySet<SelectableObject>) => {
    if (!state.showPropertiesPanel) return;

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
    props.appCore.toggleEditorPanel();
  };

  const handleThemeToggle = () => {
    props.appCore.handleThemeToggle();
  };

  const handleFileAction = (action: FileOperation, data?: unknown) => {
    state.setDropdownOpen(false);
    props.appCore.handleFileAction(action, data);
  };

  const handleCommandExecute = (cmd: Command) => {
    cmd.execute?.();
  };

  // Editor-specific handlers
  const handlePropertyChange = (property: string, value: string) => {
    const entity = state.selectedEntity();
    if (entity && props.onPropertyChange) {
      props.onPropertyChange(entity.type, entity.id, property, value);
    }
  };

  const handleDelete = () => {
    const entity = state.selectedEntity();
    if (!entity) return;

    state.setDeleteTarget({
      entityType: entity.type,
      entityId: entity.id,
      message:
        entity.type === 'wall'
          ? `This will change the wall to "open" (removing the wall). Continue?`
          : `Are you sure you want to delete ${entity.type} "${entity.id}"?`,
      cascadeItems: [],
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

  const handleAddRoom = (room: {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    props.onAddRoom?.(room);
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
        onVisibilityChange={(visible) => props.appCore.layoutManager.setHeaderVisible(visible)}
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

      {/* Editor-specific components */}
      <Show when={state.isEditorMode}>
        {/* Properties Panel */}
        <Show when={state.showPropertiesPanel}>
          <PropertiesPanel
            isVisible={state.propertiesPanelVisible()}
            entityType={state.selectedEntity()?.type}
            entityId={state.selectedEntity()?.id}
            properties={state.properties()}
            onPropertyChange={handlePropertyChange}
            onDelete={handleDelete}
            onClose={() => state.setPropertiesPanelVisible(false)}
          />
        </Show>

        {/* Parse Error Banner */}
        <Show when={state.hasParseError()}>
          <div class="alert alert-error fixed top-0 left-0 right-0 z-[300]">
            {state.parseErrorMessage() ?? 'Parse error'}
          </div>
        </Show>

        {/* Add Room Dialog */}
        <Show when={state.showAddRoomButton}>
          <AddRoomDialog
            isOpen={state.addRoomDialogOpen()}
            onClose={() => state.setAddRoomDialogOpen(false)}
            onAdd={handleAddRoom}
            existingNames={state.existingRoomNames()}
          />
        </Show>

        {/* Delete Confirmation Dialog */}
        <Show when={state.showDeleteConfirm}>
          <DeleteConfirmDialog
            isOpen={state.deleteDialogOpen()}
            entityType={state.deleteTarget()?.entityType}
            entityId={state.deleteTarget()?.entityId}
            message={state.deleteTarget()?.message}
            cascadeItems={state.deleteTarget()?.cascadeItems}
            onClose={() => {
              state.setDeleteDialogOpen(false);
              state.setDeleteTarget(null);
            }}
            onConfirm={handleDeleteConfirm}
          />
        </Show>
      </Show>
    </>
  );
}

// ============================================================================
// Vanilla-Compatible Factory
// ============================================================================

/**
 * Create FloorplanUI with vanilla-compatible API.
 *
 * This unified factory mounts the Solid root component and returns an API
 * for external code to interact with the UI imperatively.
 *
 * Supports both viewer mode (read-only) and editor mode (full editing).
 *
 * @example Viewer mode
 * ```ts
 * const ui = createFloorplanUI(appCore, { mode: 'viewer' });
 * ```
 *
 * @example Editor mode
 * ```ts
 * const ui = createFloorplanUI(editorCore, {
 *   mode: 'editor',
 *   onPropertyChange: (type, id, prop, value) => { ... },
 *   onDelete: (type, id) => { ... },
 *   getEntityData: (type, id) => ({ ... }),
 * });
 * ```
 */
export function createFloorplanUI(
  appCore: AppCore,
  config: FloorplanUIConfig = {},
): FloorplanUIAPI {
  const container = config.container ?? document.createElement('div');
  container.id = config.mode === 'editor' ? 'editor-ui-root' : 'floorplan-ui-root';

  // If no container provided, we need to add ours to the DOM
  if (!config.container) {
    document.body.appendChild(container);
  }

  // Determine mode and feature flags
  const mode = config.mode ?? 'viewer';
  const isEditorMode = mode === 'editor';

  // Create reactive setters that will be bound during render
  let setFilename: (f: string) => void;
  let setEditorOpen: (o: boolean) => void;
  let setAuthenticated: (a: boolean) => void;
  let setTheme: (t: Theme) => void;
  let setCommands: (c: Command[]) => void;
  let setRecentFiles: (f: RecentFile[]) => void;
  let setCommandPaletteOpen: (o: boolean) => void;

  // Editor-specific setters
  let setAddRoomDialogOpen: (o: boolean) => void;
  let setPropertiesPanelVisible: (v: boolean) => void;
  let setExistingRoomNames: (names: Set<string>) => void;

  // Render the Solid component
  const dispose = render(() => {
    const state = createUIState({
      appCore,
      mode,
      initialFilename: config.initialFilename,
      initialEditorOpen: config.initialEditorOpen,
      initialAuthenticated: config.initialAuthenticated,
      initialTheme: config.initialTheme,
      headerAutoHide: config.headerAutoHide,
      commands: config.commands,
      recentFiles: config.recentFiles,
      showPropertiesPanel: config.showPropertiesPanel,
      showAddRoomButton: config.showAddRoomButton,
      showDeleteConfirm: config.showDeleteConfirm,
      showExportMenu: config.showExportMenu,
      onPropertyChange: config.onPropertyChange,
      onDelete: config.onDelete,
      getEntityData: config.getEntityData,
      onAddRoom: config.onAddRoom,
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
    setExistingRoomNames = state.setExistingRoomNames;

    // Set data-theme attribute on document for DaisyUI theming
    createEffect(() => {
      const currentTheme = state.theme();
      document.documentElement.setAttribute('data-theme', currentTheme);
      // Also maintain body.dark-theme for backward compatibility during migration
      document.body.classList.toggle('dark-theme', currentTheme === 'dark');
    });

    // Subscribe to appCore events
    // Cast to FloorplanAppCore for common events (works for both base and editor core)
    const baseCore = appCore as FloorplanAppCore;

    const unsubFilename = baseCore.on('filenameChange', ({ filename }: { filename: string }) => {
      state.setFilename(filename);
    });

    const unsubTheme = baseCore.on('themeChange', ({ theme }: { theme: string }) => {
      // Convert ViewerTheme (light/dark/blueprint) to UI Theme (light/dark)
      state.setTheme(getUIThemeMode(theme as ViewerTheme));
    });

    const unsubAuth = baseCore.on(
      'authChange',
      ({ isAuthenticated }: { isAuthenticated: boolean }) => {
        state.setIsAuthenticated(isAuthenticated);
      },
    );

    const unsubEditor = baseCore.on('editorToggle', ({ isOpen }: { isOpen: boolean }) => {
      state.setEditorOpen(isOpen);
    });

    // Editor-specific event subscriptions
    let unsubParseError: (() => void) | undefined;
    let unsubSelection: (() => void) | undefined;
    let unsubFloorplan: (() => void) | undefined;

    if (isEditorMode) {
      const editorCore = appCore as InteractiveEditorCore;

      unsubParseError = editorCore.on('parseError', ({ hasError, errorMessage }) => {
        state.setHasParseError(hasError);
        state.setParseErrorMessage(errorMessage);
      });

      unsubSelection = editorCore.on('selectionChange', ({ selection }) => {
        state.setSelection(selection);
        // Update properties panel visibility
        if (state.showPropertiesPanel) {
          if (selection.size === 1) {
            const entity = Array.from(selection)[0];
            state.setSelectedEntity({
              type: entity.entityType,
              id: entity.entityId,
              floorId: entity.floorId,
            });

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
        }
      });

      unsubFloorplan = editorCore.on('floorplanLoaded', ({ data }) => {
        const names = new Set<string>();
        for (const floor of data.floors) {
          for (const room of floor.rooms) {
            names.add(room.name);
          }
        }
        state.setExistingRoomNames(names);
      });
    }

    onCleanup(() => {
      unsubFilename();
      unsubTheme();
      unsubAuth();
      unsubEditor();
      unsubParseError?.();
      unsubSelection?.();
      unsubFloorplan?.();
    });

    // Register ⌘K shortcut
    const handleShortcut = (e: KeyboardEvent) => {
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      if (modKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        state.setCommandPaletteOpen((prev) => !prev);
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
      appCore.toggleEditorPanel();
    };

    const handleThemeToggle = () => {
      appCore.handleThemeToggle();
    };

    const handleFileAction = (action: FileOperation, data?: unknown) => {
      state.setDropdownOpen(false);
      appCore.handleFileAction(action, data);
    };

    const handleCommandExecute = (cmd: Command) => {
      cmd.execute?.();
    };

    // Editor-specific handlers
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
        message:
          entity.type === 'wall'
            ? `This will change the wall to "open" (removing the wall). Continue?`
            : `Are you sure you want to delete ${entity.type} "${entity.id}"?`,
        cascadeItems: [],
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

    const handleAddRoom = (room: {
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }) => {
      config.onAddRoom?.(room);
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
          onVisibilityChange={(visible) => appCore.layoutManager.setHeaderVisible(visible)}
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

        {/* Editor-specific components */}
        <Show when={isEditorMode}>
          {/* Properties Panel */}
          <Show when={state.showPropertiesPanel}>
            <PropertiesPanel
              isVisible={state.propertiesPanelVisible()}
              entityType={state.selectedEntity()?.type}
              entityId={state.selectedEntity()?.id}
              properties={state.properties()}
              onPropertyChange={handlePropertyChange}
              onDelete={handleDelete}
              onClose={() => state.setPropertiesPanelVisible(false)}
            />
          </Show>

          {/* Parse Error Banner */}
          <Show when={state.hasParseError()}>
            <div class="alert alert-error fixed top-0 left-0 right-0 z-[300]">
              {state.parseErrorMessage() ?? 'Parse error'}
            </div>
          </Show>

          {/* Add Room Dialog */}
          <Show when={state.showAddRoomButton}>
            <AddRoomDialog
              isOpen={state.addRoomDialogOpen()}
              onClose={() => state.setAddRoomDialogOpen(false)}
              onAdd={handleAddRoom}
              existingNames={state.existingRoomNames()}
            />
          </Show>

          {/* Delete Confirmation Dialog */}
          <Show when={state.showDeleteConfirm}>
            <DeleteConfirmDialog
              isOpen={state.deleteDialogOpen()}
              entityType={state.deleteTarget()?.entityType}
              entityId={state.deleteTarget()?.entityId}
              message={state.deleteTarget()?.message}
              cascadeItems={state.deleteTarget()?.cascadeItems}
              onClose={() => {
                state.setDeleteDialogOpen(false);
                state.setDeleteTarget(null);
              }}
              onConfirm={handleDeleteConfirm}
            />
          </Show>
        </Show>
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
    setExistingRoomNames: (names: Set<string>) => setExistingRoomNames?.(names),

    dispose: () => {
      dispose();
      if (!config.container) {
        container.remove();
      }
    },
  };
}
