/**
 * FileDropdown - Solid.js File Dropdown Component
 *
 * A dropdown menu for file operations with:
 * - Open File... (⌘O)
 * - Open from URL...
 * - Open Recent (submenu)
 * - Save .floorplan (⌘S) with lock icon if not authenticated
 * - Export JSON/GLB/GLTF
 *
 * Features:
 * - Reactive state with createSignal() or direct accessors
 * - Auth-aware save operation (lock icon)
 * - Recent files submenu
 * - Keyboard navigation (Escape to close)
 * - Click outside to close
 */

import { createSignal, createEffect, For, Show, onCleanup, type Accessor } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

export type FileOperation =
  | 'open-file'
  | 'open-url'
  | 'open-recent'
  | 'save-floorplan'
  | 'export-json'
  | 'export-glb'
  | 'export-gltf'
  | 'export-dxf';

export interface RecentFile {
  name: string;
  path: string;
  timestamp: number;
}

/** Helper to unwrap a value that may be an accessor or plain value */
function unwrap<T>(value: T | Accessor<T> | undefined, defaultValue: T): T {
  if (value === undefined) return defaultValue;
  if (typeof value === 'function') return (value as Accessor<T>)();
  return value;
}

export interface FileDropdownProps {
  /** Whether the dropdown is open (boolean or accessor) */
  isOpen: boolean | Accessor<boolean>;
  /** Position to display the dropdown (object or accessor) */
  position?: { top: number; left: number } | Accessor<{ top: number; left: number } | null>;
  /** Anchor rect for positioning (alternative to position, accessor) */
  anchorRect?: DOMRect | Accessor<DOMRect | null>;
  /** Whether the user is authenticated (boolean or accessor) */
  isAuthenticated?: boolean | Accessor<boolean>;
  /** Recent files list (array or accessor) */
  recentFiles?: RecentFile[] | Accessor<RecentFile[]>;
  /** Callback when a file operation is selected */
  onAction?: (action: FileOperation, data?: unknown) => void;
  /** Callback when dropdown should close */
  onClose: () => void;
}

/**
 * Props for FileDropdownContent (used by wrapper for vanilla-style visibility control)
 */
export interface FileDropdownContentProps {
  /** Whether the user is authenticated */
  isAuthenticated?: boolean | Accessor<boolean>;
  /** Recent files list */
  recentFiles?: RecentFile[] | Accessor<RecentFile[]>;
  /** Callback when a file operation is selected */
  onAction?: (action: FileOperation, data?: unknown) => void;
  /** Callback when dropdown should close */
  onClose: () => void;
}

// ============================================================================
// Keyboard shortcuts
// ============================================================================

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
const modKey = isMac ? '⌘' : 'Ctrl+';

// ============================================================================
// FileDropdownContent - Inner content component (no container/positioning)
// Used by FileDropdownWrapper which handles visibility via display:none/block
// ============================================================================

export function FileDropdownContent(props: FileDropdownContentProps) {
  const [hoveredSubmenu, setHoveredSubmenu] = createSignal(false);

  // Unwrap props
  const getIsAuthenticated = () => unwrap(props.isAuthenticated, false);
  const getRecentFiles = () => unwrap(props.recentFiles, []);

  // Handle action click
  const handleAction = (action: FileOperation, data?: unknown) => {
    props.onAction?.(action, data);
    props.onClose();
  };

  // Handle recent file click
  const handleRecentFile = (path: string) => {
    props.onAction?.('open-recent', { path });
    props.onClose();
  };

  return (
    <>
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
        when={getRecentFiles().length > 0}
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
              <For each={getRecentFiles().slice(0, 5)}>
                {(file) => (
                  <button
                    class="fp-recent-file-item"
                    role="menuitem"
                    onClick={() => handleRecentFile(file.path)}
                  >
                    {file.name}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Divider */}
      <div class="fp-dropdown-divider" />

      {/* Save .floorplan */}
      <button
        class="fp-dropdown-item"
        classList={{ 'fp-dropdown-item-locked': !getIsAuthenticated() }}
        role="menuitem"
        onClick={() => handleAction('save-floorplan')}
      >
        <span class="fp-dropdown-item-label">Save .floorplan</span>
        <span class="fp-dropdown-item-right">
          <Show when={!getIsAuthenticated()}>
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
    </>
  );
}

// ============================================================================
// FileDropdown - Full component with container (for standalone use)
// ============================================================================

export function FileDropdown(props: FileDropdownProps) {
  let dropdownRef: HTMLDivElement | undefined;

  // Unwrap props
  const getIsOpen = () => unwrap(props.isOpen, false);
  const getPosition = () => {
    // Try anchorRect first (for FloorplanUI integration)
    if (props.anchorRect !== undefined) {
      const rect = unwrap(props.anchorRect, null);
      if (rect) return { top: rect.bottom + 4, left: rect.left };
    }
    // Fall back to position prop
    if (props.position !== undefined) {
      const pos = unwrap(props.position, null);
      if (pos) return pos;
    }
    return { top: 0, left: 0 };
  };

  // Click outside handler
  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
      props.onClose();
    }
  };

  // Escape key handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      props.onClose();
    }
  };

  // Setup/cleanup event listeners when dropdown opens/closes
  createEffect(() => {
    if (getIsOpen()) {
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
    <Show when={getIsOpen()}>
      <div
        ref={dropdownRef}
        class="fp-file-dropdown"
        role="menu"
        style={{
          position: 'fixed',
          top: `${getPosition().top}px`,
          left: `${getPosition().left}px`,
        }}
      >
        <FileDropdownContent
          isAuthenticated={props.isAuthenticated}
          recentFiles={props.recentFiles}
          onAction={props.onAction}
          onClose={props.onClose}
        />
      </div>
    </Show>
  );
}

export default FileDropdown;
