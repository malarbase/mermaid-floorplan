/**
 * Command Palette UI Component
 * 
 * A searchable command palette (⌘K) for all app actions:
 * - File operations (Open, Save, Export)
 * - View operations (Camera, Theme, Floors)
 * - Edit operations (when authenticated)
 * 
 * Follows VS Code / Figma command palette patterns.
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
  action: () => void;
}

export interface CommandPaletteConfig {
  /** Available commands */
  commands?: Command[];
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Callback when palette opens/closes */
  onVisibilityChange?: (visible: boolean) => void;
}

export interface CommandPalette {
  /** The palette overlay element */
  element: HTMLElement;
  /** Show the command palette */
  show: () => void;
  /** Hide the command palette */
  hide: () => void;
  /** Toggle visibility */
  toggle: () => void;
  /** Check if palette is visible */
  isVisible: () => boolean;
  /** Update commands list */
  setCommands: (commands: Command[]) => void;
  /** Update authentication state */
  setAuthenticated: (authenticated: boolean) => void;
  /** Register keyboard shortcut (⌘K / Ctrl+K) */
  registerShortcut: () => void;
  /** Unregister keyboard shortcut */
  unregisterShortcut: () => void;
  /** Destroy and cleanup */
  dispose: () => void;
}

// Keyboard shortcuts (platform-aware)
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const modKey = isMac ? '⌘' : 'Ctrl+';

/**
 * Create the command palette UI component.
 */
export function createCommandPalette(config: CommandPaletteConfig = {}): CommandPalette {
  const {
    commands = [],
    isAuthenticated = false,
    placeholder = 'Type a command or search...',
    onVisibilityChange,
  } = config;

  // State
  let currentCommands = [...commands];
  let currentAuthenticated = isAuthenticated;
  let visible = false;
  let selectedIndex = 0;
  let filteredCommands: Command[] = [];

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'fp-command-palette-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="fp-command-palette">
      <div class="fp-command-palette-header">
        <input type="text" class="fp-command-palette-input" placeholder="${escapeHtml(placeholder)}" autocomplete="off" />
      </div>
      <div class="fp-command-palette-results"></div>
      <div class="fp-command-palette-footer">
        <span class="fp-command-palette-hint">
          <kbd>↑↓</kbd> Navigate
          <kbd>Enter</kbd> Select
          <kbd>Esc</kbd> Close
        </span>
      </div>
    </div>
  `;

  const paletteDialog = overlay.querySelector('.fp-command-palette') as HTMLElement;
  const input = overlay.querySelector('.fp-command-palette-input') as HTMLInputElement;
  const results = overlay.querySelector('.fp-command-palette-results') as HTMLElement;

  // Build results list
  function buildResults() {
    // Filter commands based on search query
    const query = input.value.toLowerCase().trim();
    
    filteredCommands = currentCommands.filter(cmd => {
      // Filter out auth-required commands for unauthenticated users (show but mark as locked)
      const matchesQuery = query === '' ||
        cmd.label.toLowerCase().includes(query) ||
        (cmd.description?.toLowerCase().includes(query)) ||
        (cmd.category?.toLowerCase().includes(query));
      
      return matchesQuery;
    });

    // Group by category
    const grouped = new Map<string, Command[]>();
    filteredCommands.forEach(cmd => {
      const cat = cmd.category || 'General';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(cmd);
    });

    // Build HTML
    let html = '';
    let globalIndex = 0;

    grouped.forEach((cmds, category) => {
      html += `<div class="fp-command-palette-group">`;
      html += `<div class="fp-command-palette-group-title">${escapeHtml(category)}</div>`;
      
      cmds.forEach(cmd => {
        const isLocked = cmd.requiresAuth && !currentAuthenticated;
        const isDisabled = cmd.disabled;
        const isSelected = globalIndex === selectedIndex;
        
        html += `
          <button 
            class="fp-command-palette-item ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''} ${isDisabled ? 'disabled' : ''}"
            data-index="${globalIndex}"
            ${isDisabled ? 'disabled' : ''}
          >
            <span class="fp-command-item-left">
              ${cmd.icon ? `<span class="fp-command-item-icon">${cmd.icon}</span>` : ''}
              <span class="fp-command-item-label">${escapeHtml(cmd.label)}</span>
              ${cmd.description ? `<span class="fp-command-item-desc">${escapeHtml(cmd.description)}</span>` : ''}
            </span>
            <span class="fp-command-item-right">
              ${isLocked ? '<span class="fp-lock-icon">🔒</span>' : ''}
              ${cmd.shortcut ? `<span class="fp-command-item-shortcut">${escapeHtml(cmd.shortcut)}</span>` : ''}
            </span>
          </button>
        `;
        globalIndex++;
      });
      
      html += `</div>`;
    });

    if (filteredCommands.length === 0) {
      html = `<div class="fp-command-palette-empty">No matching commands</div>`;
    }

    results.innerHTML = html;

    // Attach click handlers
    results.querySelectorAll('.fp-command-palette-item').forEach(item => {
      item.addEventListener('click', handleItemClick);
    });
  }

  function handleItemClick(e: Event) {
    const item = e.currentTarget as HTMLElement;
    const index = parseInt(item.dataset.index || '0', 10);
    executeCommand(index);
  }

  function executeCommand(index: number) {
    const cmd = filteredCommands[index];
    if (!cmd || cmd.disabled) return;
    
    // Check auth requirement
    if (cmd.requiresAuth && !currentAuthenticated) {
      // Still execute - the command handler should trigger auth flow
    }
    
    hide();
    cmd.action();
  }

  function updateSelection() {
    // Clamp selection
    selectedIndex = Math.max(0, Math.min(selectedIndex, filteredCommands.length - 1));
    
    // Update visual selection
    results.querySelectorAll('.fp-command-palette-item').forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIndex);
    });

    // Scroll into view
    const selectedItem = results.querySelector('.fp-command-palette-item.selected');
    selectedItem?.scrollIntoView({ block: 'nearest' });
  }

  function handleInputChange() {
    selectedIndex = 0;
    buildResults();
  }

  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
        updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelection();
        break;
      case 'Enter':
        e.preventDefault();
        executeCommand(selectedIndex);
        break;
      case 'Escape':
        e.preventDefault();
        hide();
        break;
    }
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === overlay) {
      hide();
    }
  }

  function handleGlobalKeyDown(e: KeyboardEvent) {
    // ⌘K / Ctrl+K to open
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggle();
    }
  }

  function show() {
    if (visible) return;
    
    visible = true;
    overlay.style.display = 'flex';
    input.value = '';
    selectedIndex = 0;
    buildResults();
    
    // Focus input
    setTimeout(() => input.focus(), 0);
    
    // Add event listeners
    input.addEventListener('input', handleInputChange);
    paletteDialog.addEventListener('keydown', handleKeyDown);
    overlay.addEventListener('click', handleOverlayClick);
    
    onVisibilityChange?.(true);
  }

  function hide() {
    if (!visible) return;
    
    visible = false;
    overlay.style.display = 'none';
    
    // Remove event listeners
    input.removeEventListener('input', handleInputChange);
    paletteDialog.removeEventListener('keydown', handleKeyDown);
    overlay.removeEventListener('click', handleOverlayClick);
    
    onVisibilityChange?.(false);
  }

  function toggle() {
    if (visible) {
      hide();
    } else {
      show();
    }
  }

  return {
    element: overlay,

    show,
    hide,
    toggle,

    isVisible() {
      return visible;
    },

    setCommands(commands: Command[]) {
      currentCommands = [...commands];
      if (visible) {
        buildResults();
      }
    },

    setAuthenticated(authenticated: boolean) {
      currentAuthenticated = authenticated;
      if (visible) {
        buildResults();
      }
    },

    registerShortcut() {
      document.addEventListener('keydown', handleGlobalKeyDown);
    },

    unregisterShortcut() {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    },

    dispose() {
      hide();
      document.removeEventListener('keydown', handleGlobalKeyDown);
      overlay.remove();
    },
  };
}

/**
 * Escape HTML to prevent XSS.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
}): Command[] {
  return [
    {
      id: 'file.open',
      label: 'Open File...',
      category: 'File',
      shortcut: `${modKey}O`,
      icon: '📂',
      action: () => handlers.onOpenFile?.(),
    },
    {
      id: 'file.open-url',
      label: 'Open from URL...',
      category: 'File',
      icon: '🔗',
      action: () => handlers.onOpenUrl?.(),
    },
    {
      id: 'file.save',
      label: 'Save .floorplan',
      category: 'File',
      shortcut: `${modKey}S`,
      icon: '💾',
      requiresAuth: true,
      action: () => handlers.onSave?.(),
    },
    {
      id: 'file.export-json',
      label: 'Export JSON',
      description: 'Export as JSON data file',
      category: 'File',
      icon: '📄',
      action: () => handlers.onExportJson?.(),
    },
    {
      id: 'file.export-glb',
      label: 'Export GLB',
      description: '3D model (binary)',
      category: 'File',
      icon: '🎮',
      action: () => handlers.onExportGlb?.(),
    },
    {
      id: 'file.export-gltf',
      label: 'Export GLTF',
      description: '3D model (text)',
      category: 'File',
      icon: '🎮',
      action: () => handlers.onExportGltf?.(),
    },
  ];
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
      action: () => handlers.onToggleTheme?.(),
    },
    {
      id: 'view.toggle-ortho',
      label: 'Toggle Camera Mode',
      description: 'Switch perspective/orthographic',
      category: 'View',
      shortcut: '5',
      icon: '📷',
      action: () => handlers.onToggleOrtho?.(),
    },
    {
      id: 'view.isometric',
      label: 'Isometric View',
      category: 'View',
      icon: '📐',
      action: () => handlers.onIsometricView?.(),
    },
    {
      id: 'view.reset-camera',
      label: 'Reset Camera',
      category: 'View',
      shortcut: 'Home',
      icon: '🏠',
      action: () => handlers.onResetCamera?.(),
    },
    {
      id: 'view.frame-all',
      label: 'Frame All',
      description: 'Fit all geometry in view',
      category: 'View',
      shortcut: 'F',
      icon: '🔲',
      action: () => handlers.onFrameAll?.(),
    },
  ];
}
