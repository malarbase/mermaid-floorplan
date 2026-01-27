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
 */

import { 
  createSignal, 
  createEffect,
  createMemo,
  onMount, 
  onCleanup, 
  Show,
  For,
  type JSX,
  type Accessor,
} from 'solid-js';
import { render } from 'solid-js/web';
import type { FloorplanAppCore } from '../../floorplan-app-core.js';
import type { FileOperation, RecentFile } from './FileDropdown.jsx';
import type { Command } from './CommandPalette.jsx';

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

// ============================================================================
// HeaderBar Component (Pure Solid - no wrapper)
// ============================================================================

interface HeaderBarInternalProps {
  state: UIState;
  autoHide: boolean;
  onFileDropdownClick: (anchor: HTMLElement) => void;
  onEditorToggle: () => void;
  onThemeToggle: () => void;
  onCommandPaletteClick: () => void;
  onVisibilityChange?: (visible: boolean) => void;
}

function HeaderBarInternal(props: HeaderBarInternalProps) {
  const [isHovered, setIsHovered] = createSignal(false);
  const [mouseInHeader, setMouseInHeader] = createSignal(false);
  let hideTimeout: number | undefined;
  
  // Computed visibility: visible if not auto-hide, or if hovered, or if dropdown is open
  const isVisible = () => {
    if (!props.autoHide) return true;
    return isHovered() || props.state.dropdownOpen();
  };
  
  // Update body class and notify when visibility changes
  createEffect(() => {
    const visible = isVisible();
    document.body.classList.toggle('header-visible', visible);
    props.onVisibilityChange?.(visible);
  });
  
  // Watch for dropdown close - trigger auto-hide if mouse is not in header
  createEffect(() => {
    const dropdownOpen = props.state.dropdownOpen();
    if (!dropdownOpen && props.autoHide && !mouseInHeader()) {
      // Dropdown just closed and mouse is not in header - start hide timeout
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => {
        setIsHovered(false);
      }, 500);
    }
  });
  
  const handleMouseEnter = () => {
    setIsHovered(true);
    setMouseInHeader(true);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = undefined;
    }
  };
  
  const handleMouseLeave = () => {
    setMouseInHeader(false);
    if (props.autoHide && !props.state.dropdownOpen()) {
      hideTimeout = window.setTimeout(() => {
        setIsHovered(false);
      }, 500);
    }
  };
  
  onCleanup(() => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
  });
  
  return (
    <>
      {/* Hover zone for auto-hide detection */}
      <Show when={props.autoHide}>
        <div 
          class="fp-header-hover-zone"
          onMouseEnter={handleMouseEnter}
        />
      </Show>
      
      {/* Header bar */}
      <div
        class="fp-header-bar"
        classList={{
          'fp-header-bar--auto-hide': props.autoHide,
          'fp-header-bar--visible': isVisible(),
          'fp-authenticated': props.state.isAuthenticated(),
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Left Section: Logo & Title */}
        <div class="fp-header-left">
          <span class="fp-header-logo">📐</span>
          <span class="fp-header-title">Floorplan</span>
        </div>

        {/* Center Section: File Dropdown */}
        <div class="fp-header-center">
          <button
            class="fp-file-dropdown-trigger"
            aria-haspopup="menu"
            aria-expanded={props.state.dropdownOpen()}
            onClick={(e) => {
              props.onFileDropdownClick(e.currentTarget);
            }}
          >
            <span class="fp-filename">{props.state.filename()}</span>
            <span class="fp-dropdown-arrow">▾</span>
          </button>
        </div>

        {/* Right Section: Controls */}
        <div class="fp-header-right">
          {/* Editor Toggle */}
          <button
            class="fp-editor-toggle"
            classList={{ active: props.state.editorOpen() }}
            title="Toggle Editor Panel"
            onClick={() => props.onEditorToggle()}
          >
            <span class="fp-editor-toggle-icon">
              {props.state.editorOpen() ? '◀' : '▶'}
            </span>
            <span class="fp-editor-toggle-label">Editor</span>
          </button>

          {/* Theme Toggle */}
          <button
            class="fp-theme-toggle"
            title={props.state.theme() === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            onClick={() => props.onThemeToggle()}
          >
            <span class="fp-theme-toggle-icon">
              {props.state.theme() === 'dark' ? '☀️' : '🌙'}
            </span>
          </button>

          {/* Command Palette Trigger */}
          <button
            class="fp-command-palette-trigger"
            title="Command Palette (⌘K)"
            onClick={() => props.onCommandPaletteClick()}
          >
            <span class="fp-kbd-hint">⌘K</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// FileDropdown Component (Pure Solid - no wrapper)
// ============================================================================

interface FileDropdownInternalProps {
  state: UIState;
  onAction: (action: FileOperation, data?: unknown) => void;
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const modKey = isMac ? '⌘' : 'Ctrl+';

function FileDropdownInternal(props: FileDropdownInternalProps) {
  let dropdownRef: HTMLDivElement | undefined;
  const [hoveredSubmenu, setHoveredSubmenu] = createSignal(false);
  
  // Handle action click
  const handleAction = (action: FileOperation, data?: unknown) => {
    props.onAction(action, data);
    props.state.setDropdownOpen(false);
  };
  
  // Handle recent file click
  const handleRecentFile = (path: string) => {
    props.onAction('open-recent', { path });
    props.state.setDropdownOpen(false);
  };
  
  // Click outside handler
  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
      props.state.setDropdownOpen(false);
    }
  };
  
  // Escape key handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.state.setDropdownOpen(false);
    }
  };
  
  // Setup/cleanup event listeners when dropdown opens/closes
  createEffect(() => {
    if (props.state.dropdownOpen()) {
      // Add listeners after a tick (to avoid immediate close from the click that opened it)
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
      }, 0);
    } else {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    }
  });
  
  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  });
  
  return (
    <Show when={props.state.dropdownOpen() && props.state.dropdownAnchor()}>
      <div
        ref={dropdownRef}
        class="fp-file-dropdown"
        role="menu"
        style={{
          position: 'fixed',
          top: `${(props.state.dropdownAnchor()?.bottom ?? 0) + 4}px`,
          left: `${props.state.dropdownAnchor()?.left ?? 0}px`,
        }}
      >
        {/* Open File */}
        <button
          class="fp-dropdown-item"
          role="menuitem"
          onClick={() => handleAction('open-file')}
        >
          <span class="fp-dropdown-item-label">Open File...</span>
          <span class="fp-dropdown-item-shortcut">{modKey}O</span>
        </button>

        {/* Open from URL */}
        <button
          class="fp-dropdown-item"
          role="menuitem"
          onClick={() => handleAction('open-url')}
        >
          <span class="fp-dropdown-item-label">Open from URL...</span>
        </button>

        {/* Recent Files Submenu */}
        <Show
          when={props.state.recentFiles().length > 0}
          fallback={
            <div class="fp-dropdown-item fp-dropdown-item-disabled" role="menuitem">
              <span class="fp-dropdown-item-label">Open Recent</span>
              <span class="fp-dropdown-item-hint">(no recent files)</span>
            </div>
          }
        >
          <div
            class="fp-dropdown-submenu"
            onMouseEnter={() => setHoveredSubmenu(true)}
            onMouseLeave={() => setHoveredSubmenu(false)}
          >
            <button
              class="fp-dropdown-item fp-dropdown-item-submenu"
              role="menuitem"
              aria-haspopup="true"
            >
              <span class="fp-dropdown-item-label">Open Recent</span>
              <span class="fp-dropdown-item-arrow">▸</span>
            </button>
            <Show when={hoveredSubmenu()}>
              <div class="fp-dropdown-submenu-content" role="menu">
                {props.state.recentFiles().slice(0, 5).map((file) => (
                  <button
                    class="fp-recent-file-item"
                    role="menuitem"
                    onClick={() => handleRecentFile(file.path)}
                  >
                    {file.name}
                  </button>
                ))}
              </div>
            </Show>
          </div>
        </Show>

        {/* Divider */}
        <div class="fp-dropdown-divider" />

        {/* Save .floorplan */}
        <button
          class="fp-dropdown-item"
          classList={{ 'fp-dropdown-item-locked': !props.state.isAuthenticated() }}
          role="menuitem"
          onClick={() => handleAction('save-floorplan')}
        >
          <span class="fp-dropdown-item-label">Save .floorplan</span>
          <span class="fp-dropdown-item-right">
            <Show when={!props.state.isAuthenticated()}>
              <span class="fp-lock-icon">🔒</span>
            </Show>
            <span class="fp-dropdown-item-shortcut">{modKey}S</span>
          </span>
        </button>

        {/* Divider */}
        <div class="fp-dropdown-divider" />

        {/* Export JSON */}
        <button
          class="fp-dropdown-item"
          role="menuitem"
          onClick={() => handleAction('export-json')}
        >
          <span class="fp-dropdown-item-label">Export JSON</span>
          <span class="fp-dropdown-item-ext">.json</span>
        </button>

        {/* Export GLB */}
        <button
          class="fp-dropdown-item"
          role="menuitem"
          onClick={() => handleAction('export-glb')}
        >
          <span class="fp-dropdown-item-label">Export GLB</span>
          <span class="fp-dropdown-item-ext">.glb</span>
        </button>

        {/* Export GLTF */}
        <button
          class="fp-dropdown-item"
          role="menuitem"
          onClick={() => handleAction('export-gltf')}
        >
          <span class="fp-dropdown-item-label">Export GLTF</span>
          <span class="fp-dropdown-item-ext">.gltf</span>
        </button>
      </div>
    </Show>
  );
}

// ============================================================================
// CommandPalette Component (Pure Solid - no wrapper)
// ============================================================================

interface CommandPaletteInternalProps {
  state: UIState;
  onExecute: (command: Command) => void;
}

function CommandPaletteInternal(props: CommandPaletteInternalProps) {
  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLDivElement | undefined;
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  
  // Filter commands based on search query (keep auth-required but show as locked)
  const filteredCommands = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return props.state.commands();
    
    return props.state.commands().filter(cmd => {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const descMatch = cmd.description?.toLowerCase().includes(query);
      const categoryMatch = cmd.category?.toLowerCase().includes(query);
      return labelMatch || descMatch || categoryMatch;
    });
  });
  
  // Group commands by category
  const groupedCommands = createMemo(() => {
    const filtered = filteredCommands();
    const groups = new Map<string, Command[]>();
    
    for (const cmd of filtered) {
      const category = cmd.category ?? 'General';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    }
    
    return Array.from(groups.entries()).map(([category, commands]) => ({
      category,
      commands,
    }));
  });
  
  // Flatten for keyboard navigation
  const flatCommands = createMemo(() => {
    return groupedCommands().flatMap(g => g.commands);
  });
  
  // Reset selection when search changes
  createEffect(() => {
    searchQuery();
    setSelectedIndex(0);
  });
  
  // Focus input when palette opens
  createEffect(() => {
    if (props.state.commandPaletteOpen()) {
      setTimeout(() => inputRef?.focus(), 50);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  });
  
  const scrollToSelected = () => {
    if (listRef) {
      const selectedEl = listRef.querySelector('[data-selected="true"]');
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const commands = flatCommands();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, commands.length - 1));
        scrollToSelected();
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        scrollToSelected();
        break;
      case 'Enter':
        e.preventDefault();
        if (commands[selectedIndex()]) {
          executeCommand(commands[selectedIndex()]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        props.state.setCommandPaletteOpen(false);
        break;
    }
  };
  
  const executeCommand = (cmd: Command) => {
    // Check auth requirement
    if (cmd.requiresAuth && !props.state.isAuthenticated()) {
      return; // Don't execute if auth required but not authenticated
    }
    props.state.setCommandPaletteOpen(false);
    props.onExecute(cmd);
  };
  
  return (
    <Show when={props.state.commandPaletteOpen()}>
      <div 
        class="fp-command-palette-backdrop"
        onClick={() => props.state.setCommandPaletteOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div 
          class="fp-command-palette"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search input */}
          <div class="fp-command-palette-search">
            <input
              ref={inputRef}
              type="text"
              class="fp-command-palette-input"
              placeholder="Type a command or search..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search commands"
              aria-autocomplete="list"
              aria-controls="command-list"
            />
          </div>
          
          {/* Command list grouped by category */}
          <div 
            ref={listRef}
            id="command-list"
            class="fp-command-palette-list"
            role="listbox"
          >
            <Show
              when={flatCommands().length > 0}
              fallback={
                <div class="fp-command-palette-empty">
                  No commands found
                </div>
              }
            >
              <For each={groupedCommands()}>
                {(group) => (
                  <div class="fp-command-palette-group">
                    <div class="fp-command-palette-group-header">
                      {group.category}
                    </div>
                    <For each={group.commands}>
                      {(cmd) => {
                        const index = () => flatCommands().indexOf(cmd);
                        const isSelected = () => selectedIndex() === index();
                        const isDisabled = () => cmd.requiresAuth && !props.state.isAuthenticated();
                        
                        return (
                          <div
                            class="fp-command-palette-item"
                            classList={{
                              'selected': isSelected(),
                              'disabled': isDisabled(),
                            }}
                            data-selected={isSelected()}
                            role="option"
                            aria-selected={isSelected()}
                            aria-disabled={isDisabled()}
                            onClick={() => !isDisabled() && executeCommand(cmd)}
                            onMouseEnter={() => setSelectedIndex(index())}
                          >
                            {/* Icon */}
                            <Show when={cmd.icon}>
                              <span class="fp-command-palette-icon">{cmd.icon}</span>
                            </Show>
                            
                            {/* Label and Description */}
                            <div class="fp-command-palette-content">
                              <span class="fp-command-palette-label">{cmd.label}</span>
                              <Show when={cmd.description}>
                                <span class="fp-command-palette-description">{cmd.description}</span>
                              </Show>
                            </div>
                            
                            {/* Right side: shortcut or lock icon */}
                            <div class="fp-command-palette-right">
                              <Show when={cmd.requiresAuth && !props.state.isAuthenticated()}>
                                <span class="fp-command-palette-lock" title="Requires authentication">🔒</span>
                              </Show>
                              <Show when={cmd.shortcut}>
                                <span class="fp-command-palette-shortcut">{cmd.shortcut}</span>
                              </Show>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                )}
              </For>
            </Show>
          </div>
          
          {/* Footer with keyboard hints */}
          <div class="fp-command-palette-footer">
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>Esc</kbd> Close</span>
          </div>
        </div>
      </div>
    </Show>
  );
}

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
    props.appCore.handleFileAction(action, data);
  };
  
  const handleCommandExecute = (cmd: Command) => {
    cmd.execute();
  };
  
  return (
    <>
      <HeaderBarInternal
        state={state}
        autoHide={props.headerAutoHide ?? false}
        onFileDropdownClick={handleFileDropdownClick}
        onEditorToggle={handleEditorToggle}
        onThemeToggle={handleThemeToggle}
        onCommandPaletteClick={() => state.setCommandPaletteOpen(true)}
        onVisibilityChange={(visible) => props.appCore.layoutManager.setHeaderVisible(visible)}
      />
      
      <FileDropdownInternal
        state={state}
        onAction={handleFileAction}
      />
      
      <CommandPaletteInternal
        state={state}
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
      appCore.handleFileAction(action, data);
    };
    
    const handleCommandExecute = (cmd: Command) => {
      cmd.execute();
    };
    
    return (
      <>
        <HeaderBarInternal
          state={state}
          autoHide={config.headerAutoHide ?? false}
          onFileDropdownClick={handleFileDropdownClick}
          onEditorToggle={handleEditorToggle}
          onThemeToggle={handleThemeToggle}
          onCommandPaletteClick={() => state.setCommandPaletteOpen(true)}
          onVisibilityChange={(visible) => appCore.layoutManager.setHeaderVisible(visible)}
        />
        
        <FileDropdownInternal
          state={state}
          onAction={handleFileAction}
        />
        
        <CommandPaletteInternal
          state={state}
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
