/**
 * FloorplanUI - Solid.js UI Root Component
 * 
 * This component owns all 2D UI state and renders the complete UI layer:
 * - HeaderBar with file dropdown trigger
 * - FileDropdown with file operations
 * - CommandPalette with keyboard shortcut (⌘K)
 * 
 * Key architecture principles:
 * - All UI state lives in Solid signals (no imperative APIs)
 * - Components coordinate via shared signals (not callbacks)
 * - FloorplanAppCore handles 3D rendering separately
 * - Communication with 3D is via event subscription and method calls
 * 
 * This module imports standalone components and provides state coordination.
 */

import { 
  createSignal, 
  onMount, 
  onCleanup, 
} from 'solid-js';
import { render } from 'solid-js/web';
import type { FloorplanAppCore } from '../../floorplan-app-core.js';
import { HeaderBar } from './HeaderBar.jsx';
import { FileDropdown, type FileOperation, type RecentFile } from './FileDropdown.jsx';
import { CommandPalette, type Command } from './CommandPalette.jsx';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark';

export interface FloorplanUIProps {
  /** Reference to the 3D app core */
  appCore: FloorplanAppCore;
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
    
    // Dropdown positioning
    dropdownAnchor, setDropdownAnchor,
    
    // Commands and files
    commands, setCommands,
    recentFiles, setRecentFiles,
  };
}

export type UIState = ReturnType<typeof createUIState>;

// Platform detection for keyboard shortcuts
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

// ============================================================================
// FloorplanUI Root Component
// ============================================================================

export function FloorplanUI(props: FloorplanUIProps) {
  const state = createUIState(props);
  
  // Subscribe to appCore events
  onMount(() => {
    const unsubFilename = props.appCore.on('filenameChange', ({ filename }) => {
      state.setFilename(filename);
    });
    
    const unsubTheme = props.appCore.on('themeChange', ({ theme }) => {
      state.setTheme(theme as Theme);
    });
    
    const unsubAuth = props.appCore.on('authChange', ({ isAuthenticated }) => {
      state.setIsAuthenticated(isAuthenticated);
    });
    
    const unsubEditor = props.appCore.on('editorToggle', ({ isOpen }) => {
      state.setEditorOpen(isOpen);
    });
    
    onCleanup(() => {
      unsubFilename();
      unsubTheme();
      unsubAuth();
      unsubEditor();
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
  
  return (
    <>
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
    </>
  );
}

// ============================================================================
// Vanilla-Compatible Factory
// ============================================================================

/**
 * Create FloorplanUI with vanilla-compatible API.
 * 
 * This factory mounts the Solid root component and returns an API
 * for external code to interact with the UI imperatively.
 */
export function createFloorplanUI(
  appCore: FloorplanAppCore,
  config: FloorplanUIConfig = {}
): FloorplanUIAPI {
  const container = config.container ?? document.createElement('div');
  container.id = 'floorplan-ui-root';
  
  // If no container provided, we need to add ours to the DOM
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
  
  // Render the Solid component
  const dispose = render(() => {
    const state = createUIState({
      appCore,
      initialFilename: config.initialFilename,
      initialEditorOpen: config.initialEditorOpen,
      initialAuthenticated: config.initialAuthenticated,
      initialTheme: config.initialTheme,
      headerAutoHide: config.headerAutoHide,
      commands: config.commands,
      recentFiles: config.recentFiles,
    });
    
    // Bind setters for external API
    setFilename = state.setFilename;
    setEditorOpen = state.setEditorOpen;
    setAuthenticated = state.setIsAuthenticated;
    setTheme = state.setTheme;
    setCommands = state.setCommands;
    setRecentFiles = state.setRecentFiles;
    setCommandPaletteOpen = state.setCommandPaletteOpen;
    
    // Subscribe to appCore events
    const unsubFilename = appCore.on('filenameChange', ({ filename }) => {
      state.setFilename(filename);
    });
    
    const unsubTheme = appCore.on('themeChange', ({ theme }) => {
      state.setTheme(theme as Theme);
    });
    
    const unsubAuth = appCore.on('authChange', ({ isAuthenticated }) => {
      state.setIsAuthenticated(isAuthenticated);
    });
    
    const unsubEditor = appCore.on('editorToggle', ({ isOpen }) => {
      state.setEditorOpen(isOpen);
    });
    
    onCleanup(() => {
      unsubFilename();
      unsubTheme();
      unsubAuth();
      unsubEditor();
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
    
    dispose: () => {
      dispose();
      if (!config.container) {
        container.remove();
      }
    },
  };
}
