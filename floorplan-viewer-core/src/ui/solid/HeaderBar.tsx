/**
 * HeaderBar - Solid.js Header Bar Component
 *
 * A minimal header bar with:
 * - File name dropdown for file operations
 * - Editor toggle button
 * - Theme toggle button
 * - Command palette trigger (⌘K)
 *
 * Features:
 * - Reactive state with createSignal() or direct accessors
 * - Auto-hide mode with hover detection
 * - Dropdown coordination (stays visible when dropdown is open)
 * - Theme-aware icons
 */

import { createSignal, createEffect, Show, onCleanup, type Accessor } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark';

/** Helper to unwrap a value that may be an accessor or plain value */
function unwrap<T>(value: T | Accessor<T> | undefined, defaultValue: T): T {
  if (value === undefined) return defaultValue;
  if (typeof value === 'function') return (value as Accessor<T>)();
  return value;
}

export interface HeaderBarProps {
  /** Current filename to display (string or accessor) */
  filename?: string | Accessor<string>;
  /** Whether the editor panel is currently open (boolean or accessor) */
  editorOpen?: boolean | Accessor<boolean>;
  /** Whether the user is authenticated (boolean or accessor) */
  isAuthenticated?: boolean | Accessor<boolean>;
  /** Current theme (Theme or accessor) */
  theme?: Theme | Accessor<Theme>;
  /** Enable auto-hide mode */
  autoHide?: boolean;
  /** Whether dropdown is currently open (for visibility coordination) */
  dropdownOpen?: boolean | Accessor<boolean>;
  /** Callback when file dropdown is clicked (receives anchor element) */
  onFileDropdownClick?: (anchor: HTMLElement) => void;
  /** Callback when editor toggle is clicked */
  onEditorToggle?: () => void;
  /** Callback when theme toggle is clicked */
  onThemeToggle?: () => void;
  /** Callback when command palette trigger is clicked */
  onCommandPaletteClick?: () => void;
  /** Callback when header visibility changes (for layout coordination) */
  onVisibilityChange?: (visible: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

export function HeaderBar(props: HeaderBarProps) {
  const [isHovered, setIsHovered] = createSignal(false);
  const [mouseInHeader, setMouseInHeader] = createSignal(false);
  let hideTimeout: number | undefined;

  // Unwrap props (handle both accessor and plain values)
  const getFilename = () => unwrap(props.filename, 'Untitled.floorplan');
  const getEditorOpen = () => unwrap(props.editorOpen, false);
  const getIsAuthenticated = () => unwrap(props.isAuthenticated, false);
  const getTheme = () => unwrap(props.theme, 'dark');
  const getDropdownOpen = () => unwrap(props.dropdownOpen, false);

  // Computed visibility: visible if not auto-hide, or if hovered, or if dropdown is open
  const isVisible = () => {
    if (!props.autoHide) return true;
    return isHovered() || getDropdownOpen();
  };

  // Update body class and notify when visibility changes
  createEffect(() => {
    const visible = isVisible();
    document.body.classList.toggle('header-visible', visible);
    props.onVisibilityChange?.(visible);
  });

  // Watch for dropdown close - trigger auto-hide if mouse is not in header
  createEffect(() => {
    const dropdownOpen = getDropdownOpen();
    if (!dropdownOpen && props.autoHide && !mouseInHeader()) {
      // Dropdown just closed and mouse is not in header - start hide timeout
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => {
        setIsHovered(false);
      }, 500);
    }
  });

  // Handle mouse enter
  const handleMouseEnter = () => {
    setIsHovered(true);
    setMouseInHeader(true);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = undefined;
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setMouseInHeader(false);
    if (props.autoHide && !getDropdownOpen()) {
      hideTimeout = window.setTimeout(() => {
        setIsHovered(false);
      }, 500);
    }
  };

  // Clean up timeout on unmount
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
          'fp-authenticated': getIsAuthenticated(),
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
            aria-expanded={getDropdownOpen()}
            onClick={(e) => props.onFileDropdownClick?.(e.currentTarget)}
          >
            <span class="fp-filename">{getFilename()}</span>
            <span class="fp-dropdown-arrow">▾</span>
          </button>
        </div>

        {/* Right Section: Controls */}
        <div class="fp-header-right">
          {/* Editor Toggle */}
          <button
            class="fp-editor-toggle"
            classList={{ active: getEditorOpen() }}
            title="Toggle Editor Panel"
            onClick={() => props.onEditorToggle?.()}
          >
            <span class="fp-editor-toggle-icon">
              {getEditorOpen() ? '◀' : '▶'}
            </span>
            <span class="fp-editor-toggle-label">Editor</span>
          </button>

          {/* Theme Toggle */}
          <button
            class="fp-theme-toggle"
            title={getTheme() === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            onClick={() => props.onThemeToggle?.()}
          >
            <span class="fp-theme-toggle-icon">
              {getTheme() === 'dark' ? '☀️' : '🌙'}
            </span>
          </button>

          {/* Command Palette Trigger */}
          <button
            class="fp-command-palette-trigger"
            title="Command Palette (⌘K)"
            onClick={() => props.onCommandPaletteClick?.()}
          >
            <span class="fp-kbd-hint">⌘K</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default HeaderBar;
