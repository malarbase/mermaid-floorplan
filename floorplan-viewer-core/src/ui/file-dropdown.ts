/**
 * File Dropdown UI Component (Vanilla)
 * 
 * @deprecated Use FloorplanUI instead for new code:
 *   import { FloorplanAppCore, createFloorplanUI } from 'floorplan-viewer-core';
 *   const appCore = new FloorplanAppCore({ containerId: 'app' });
 *   const ui = createFloorplanUI(appCore, { commands });
 * 
 * This vanilla implementation is kept for backwards compatibility.
 * 
 * A dropdown menu for file operations:
 * - Open File... (⌘O)
 * - Open from URL...
 * - Open Recent (submenu)
 * - Save .floorplan (⌘S) with lock icon if not authenticated
 * - Export JSON
 * - Export GLB
 * - Export GLTF
 */

export type FileOperation = 
  | 'open-file'
  | 'open-url'
  | 'open-recent'
  | 'save-floorplan'
  | 'export-json'
  | 'export-glb'
  | 'export-gltf';

export interface RecentFile {
  name: string;
  path: string;
  timestamp: number;
}

export interface FileDropdownConfig {
  /** Whether the user is authenticated (affects save operation) */
  isAuthenticated?: boolean;
  /** Recent files list */
  recentFiles?: RecentFile[];
  /** Callback when a file operation is selected */
  onAction?: (action: FileOperation, data?: unknown) => void;
  /** Callback when dropdown opens/closes */
  onVisibilityChange?: (visible: boolean) => void;
}

export interface FileDropdown {
  /** The dropdown menu element */
  element: HTMLElement;
  /** Show the dropdown at the specified anchor element */
  show: (anchor: HTMLElement) => void;
  /** Hide the dropdown */
  hide: () => void;
  /** Check if dropdown is visible */
  isVisible: () => boolean;
  /** Update authentication state */
  setAuthenticated: (authenticated: boolean) => void;
  /** Update recent files list */
  setRecentFiles: (files: RecentFile[]) => void;
  /** Destroy and cleanup */
  dispose: () => void;
}

// Keyboard shortcuts (platform-aware)
const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const modKey = isMac ? '⌘' : 'Ctrl+';

/**
 * Create the file dropdown UI component.
 */
export function createFileDropdown(config: FileDropdownConfig = {}): FileDropdown {
  const {
    isAuthenticated = false,
    recentFiles = [],
    onAction,
    onVisibilityChange,
  } = config;

  // State
  let currentAuthenticated = isAuthenticated;
  let currentRecentFiles = [...recentFiles];
  let visible = false;

  // Create dropdown container
  const dropdown = document.createElement('div');
  dropdown.className = 'fp-file-dropdown';
  dropdown.setAttribute('role', 'menu');
  dropdown.style.display = 'none';

  // Build menu items
  function buildMenu() {
    dropdown.innerHTML = `
      <button class="fp-dropdown-item" data-action="open-file" role="menuitem">
        <span class="fp-dropdown-item-label">Open File...</span>
        <span class="fp-dropdown-item-shortcut">${modKey}O</span>
      </button>
      <button class="fp-dropdown-item" data-action="open-url" role="menuitem">
        <span class="fp-dropdown-item-label">Open from URL...</span>
      </button>
      ${buildRecentFilesSubmenu()}
      <div class="fp-dropdown-divider"></div>
      <button class="fp-dropdown-item ${!currentAuthenticated ? 'fp-dropdown-item-locked' : ''}" data-action="save-floorplan" role="menuitem">
        <span class="fp-dropdown-item-label">Save .floorplan</span>
        <span class="fp-dropdown-item-right">
          ${!currentAuthenticated ? '<span class="fp-lock-icon">🔒</span>' : ''}
          <span class="fp-dropdown-item-shortcut">${modKey}S</span>
        </span>
      </button>
      <div class="fp-dropdown-divider"></div>
      <button class="fp-dropdown-item" data-action="export-json" role="menuitem">
        <span class="fp-dropdown-item-label">Export JSON</span>
        <span class="fp-dropdown-item-ext">.json</span>
      </button>
      <button class="fp-dropdown-item" data-action="export-glb" role="menuitem">
        <span class="fp-dropdown-item-label">Export GLB</span>
        <span class="fp-dropdown-item-ext">.glb</span>
      </button>
      <button class="fp-dropdown-item" data-action="export-gltf" role="menuitem">
        <span class="fp-dropdown-item-label">Export GLTF</span>
        <span class="fp-dropdown-item-ext">.gltf</span>
      </button>
    `;

    // Attach click handlers
    dropdown.querySelectorAll('.fp-dropdown-item[data-action]').forEach(item => {
      item.addEventListener('click', handleItemClick);
    });

    // Attach recent file handlers
    dropdown.querySelectorAll('.fp-recent-file-item').forEach(item => {
      item.addEventListener('click', handleRecentFileClick);
    });
  }

  function buildRecentFilesSubmenu(): string {
    if (currentRecentFiles.length === 0) {
      return `
        <div class="fp-dropdown-item fp-dropdown-item-disabled" role="menuitem">
          <span class="fp-dropdown-item-label">Open Recent</span>
          <span class="fp-dropdown-item-hint">(no recent files)</span>
        </div>
      `;
    }

    const recentItems = currentRecentFiles.slice(0, 5).map(file => `
      <button class="fp-recent-file-item" data-path="${escapeHtml(file.path)}" role="menuitem">
        ${escapeHtml(file.name)}
      </button>
    `).join('');

    return `
      <div class="fp-dropdown-submenu">
        <button class="fp-dropdown-item fp-dropdown-item-submenu" role="menuitem" aria-haspopup="true">
          <span class="fp-dropdown-item-label">Open Recent</span>
          <span class="fp-dropdown-item-arrow">▸</span>
        </button>
        <div class="fp-dropdown-submenu-content" role="menu">
          ${recentItems}
        </div>
      </div>
    `;
  }

  function handleItemClick(e: Event) {
    const item = e.currentTarget as HTMLElement;
    const action = item.dataset.action as FileOperation;
    
    if (action) {
      hide();
      onAction?.(action);
    }
  }

  function handleRecentFileClick(e: Event) {
    const item = e.currentTarget as HTMLElement;
    const path = item.dataset.path;
    
    if (path) {
      hide();
      onAction?.('open-recent', { path });
    }
  }

  function show(anchor: HTMLElement) {
    if (visible) return;
    
    // Position dropdown below anchor
    const rect = anchor.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    
    visible = true;
    onVisibilityChange?.(true);

    // Add click-outside listener
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);
  }

  function hide() {
    if (!visible) return;
    
    dropdown.style.display = 'none';
    visible = false;
    onVisibilityChange?.(false);
    
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
  }

  function handleClickOutside(e: MouseEvent) {
    if (!dropdown.contains(e.target as Node)) {
      hide();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      hide();
    }
  }

  // Initial build
  buildMenu();

  return {
    element: dropdown,

    show,
    hide,

    isVisible() {
      return visible;
    },

    setAuthenticated(authenticated: boolean) {
      currentAuthenticated = authenticated;
      buildMenu();
    },

    setRecentFiles(files: RecentFile[]) {
      currentRecentFiles = [...files];
      buildMenu();
    },

    dispose() {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      dropdown.remove();
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
