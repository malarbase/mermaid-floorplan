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

  // Using Tailwind utility classes for theme-aware styling
  // Classes like bg-base-200 have higher specificity than @layer components
  // and work reliably with DaisyUI v5 theme switching

  return (
    <div class="flex flex-col gap-0.5 p-2 min-w-[220px] text-sm bg-base-200 text-base-content rounded-xl shadow-xl">
      {/* Open File */}
      <button class="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer bg-transparent border-none text-base-content text-sm w-full text-left hover:bg-base-300" onClick={() => handleAction('open-file')}>
        <span>Open File...</span>
        <span class="text-xs text-base-content/60 bg-base-300 px-1.5 py-0.5 rounded">{modKey}O</span>
      </button>

      {/* Open from URL */}
      <button class="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer bg-transparent border-none text-base-content text-sm w-full text-left hover:bg-base-300" onClick={() => handleAction('open-url')}>
        Open from URL...
      </button>

      {/* Recent Files */}
      <Show
        when={getRecentFiles().length > 0}
        fallback={
          <div class="flex justify-between items-center px-3 py-2 rounded-lg text-base-content text-sm w-full opacity-50 cursor-default">
            <span>Open Recent</span>
            <span class="text-xs text-base-content/60">(no recent files)</span>
          </div>
        }
      >
        <div
          class="relative"
          onMouseEnter={() => setHoveredSubmenu(true)}
          onMouseLeave={() => setHoveredSubmenu(false)}
        >
          <div class="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer text-base-content text-sm w-full hover:bg-base-300">
            <span>Open Recent</span>
            <span>▸</span>
          </div>
          <Show when={hoveredSubmenu()}>
            <div class="absolute left-full top-0 ml-1 flex flex-col gap-0.5 p-2 min-w-[180px] text-sm bg-base-200 text-base-content rounded-xl shadow-xl">
              <For each={getRecentFiles().slice(0, 5)}>
                {(file) => (
                  <button class="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer bg-transparent border-none text-base-content text-sm w-full text-left hover:bg-base-300" onClick={() => handleRecentFile(file.path)}>
                    {file.name}
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Divider */}
      <div class="h-px bg-base-300 mx-2 my-1" />

      {/* Save .floorplan */}
      <button class="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer bg-transparent border-none text-base-content text-sm w-full text-left hover:bg-base-300" onClick={() => handleAction('save-floorplan')}>
        <span>Save .floorplan</span>
        <span class="flex items-center gap-1">
          <Show when={!getIsAuthenticated()}>
            <span>🔒</span>
          </Show>
          <span class="text-xs text-base-content/60 bg-base-300 px-1.5 py-0.5 rounded">{modKey}S</span>
        </span>
      </button>

      {/* Divider */}
      <div class="h-px bg-base-300 mx-2 my-1" />

      {/* Export JSON */}
      <button class="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer bg-transparent border-none text-base-content text-sm w-full text-left hover:bg-base-300" onClick={() => handleAction('export-json')}>
        <span>Export JSON</span>
        <span class="text-xs text-base-content/60">.json</span>
      </button>

      {/* Export GLB */}
      <button class="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer bg-transparent border-none text-base-content text-sm w-full text-left hover:bg-base-300" onClick={() => handleAction('export-glb')}>
        <span>Export GLB</span>
        <span class="text-xs text-base-content/60">.glb</span>
      </button>

      {/* Export GLTF */}
      <button class="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer bg-transparent border-none text-base-content text-sm w-full text-left hover:bg-base-300" onClick={() => handleAction('export-gltf')}>
        <span>Export GLTF</span>
        <span class="text-xs text-base-content/60">.gltf</span>
      </button>
    </div>
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
        class="z-[600]"
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
