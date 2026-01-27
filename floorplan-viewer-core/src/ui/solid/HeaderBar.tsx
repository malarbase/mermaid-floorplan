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
 * - Reactive state with createSignal()
 * - Auto-hide mode with hover detection
 * - Theme-aware icons
 */

import { createSignal, createEffect, Show, onMount, onCleanup } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark';

export interface HeaderBarProps {
  /** Current filename to display */
  filename?: string;
  /** Whether the editor panel is currently open */
  editorOpen?: boolean;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
  /** Current theme */
  theme?: Theme;
  /** Enable auto-hide mode */
  autoHide?: boolean;
  /** Callback when file dropdown is clicked */
  onFileDropdownClick?: () => void;
  /** Callback when editor toggle is clicked */
  onEditorToggle?: () => void;
  /** Callback when theme toggle is clicked */
  onThemeToggle?: () => void;
  /** Callback when command palette trigger is clicked */
  onCommandPaletteClick?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function HeaderBar(props: HeaderBarProps) {
  const [isHovered, setIsHovered] = createSignal(false);
  const [isTemporarilyVisible, setIsTemporarilyVisible] = createSignal(false);
  let hideTimeout: number | undefined;

  // Computed visibility
  const isVisible = () => {
    if (!props.autoHide) return true;
    return isHovered() || isTemporarilyVisible();
  };

  // Handle mouse enter
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = undefined;
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    if (props.autoHide) {
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
    <div
      class="fp-header-bar"
      classList={{
        'fp-header-bar--auto-hide': props.autoHide,
        'fp-header-bar--visible': isVisible(),
        'fp-authenticated': props.isAuthenticated,
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
          aria-expanded="false"
          onClick={() => props.onFileDropdownClick?.()}
        >
          <span class="fp-filename">{props.filename ?? 'Untitled.floorplan'}</span>
          <span class="fp-dropdown-arrow">▾</span>
        </button>
      </div>

      {/* Right Section: Controls */}
      <div class="fp-header-right">
        {/* Editor Toggle */}
        <button
          class="fp-editor-toggle"
          classList={{ active: props.editorOpen }}
          title="Toggle Editor Panel"
          onClick={() => props.onEditorToggle?.()}
        >
          <span class="fp-editor-toggle-icon">
            {props.editorOpen ? '◀' : '▶'}
          </span>
          <span class="fp-editor-toggle-label">Editor</span>
        </button>

        {/* Theme Toggle */}
        <button
          class="fp-theme-toggle"
          title={props.theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          onClick={() => props.onThemeToggle?.()}
        >
          <span class="fp-theme-toggle-icon">
            {props.theme === 'dark' ? '☀️' : '🌙'}
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
  );
}

export default HeaderBar;
