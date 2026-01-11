/**
 * Header Bar UI Component
 * 
 * A minimal header bar with:
 * - File name dropdown for file operations
 * - Editor toggle button
 * - Command palette trigger (⌘K)
 * 
 * Follows Figma/VS Code design patterns.
 */

export interface HeaderBarConfig {
  /** Current filename to display (default: "Untitled.floorplan") */
  filename?: string;
  /** Whether the editor panel is currently open */
  editorOpen?: boolean;
  /** Whether the user is authenticated for editing */
  isAuthenticated?: boolean;
  /** Current theme ('light' or 'dark') */
  theme?: 'light' | 'dark';
  /** Enable auto-hide mode (header hides when not interacting) */
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

export interface HeaderBar {
  /** The root header element */
  element: HTMLElement;
  /** Hover zone element (for auto-hide detection) */
  hoverZone: HTMLElement | null;
  /** Update the displayed filename */
  setFilename: (filename: string) => void;
  /** Update the editor toggle state */
  setEditorOpen: (open: boolean) => void;
  /** Update authentication state (shows lock icon on save) */
  setAuthenticated: (authenticated: boolean) => void;
  /** Update the theme toggle icon */
  setTheme: (theme: 'light' | 'dark') => void;
  /** Enable/disable auto-hide mode */
  setAutoHide: (enabled: boolean) => void;
  /** Temporarily show the header (for auto-hide mode) */
  showTemporarily: (duration?: number) => void;
  /** Show/hide the header */
  setVisible: (visible: boolean) => void;
  /** Destroy and cleanup */
  dispose: () => void;
}

/**
 * Create the header bar UI component.
 */
export function createHeaderBar(config: HeaderBarConfig = {}): HeaderBar {
  const {
    filename = 'Untitled.floorplan',
    editorOpen = false,
    isAuthenticated = false,
    theme = 'light',
    autoHide = false,
    onFileDropdownClick,
    onEditorToggle,
    onThemeToggle,
    onCommandPaletteClick,
  } = config;

  // Create header container
  const header = document.createElement('div');
  header.className = 'fp-header-bar';
  header.innerHTML = `
    <div class="fp-header-left">
      <span class="fp-header-logo">📐</span>
      <span class="fp-header-title">Floorplan</span>
    </div>
    <div class="fp-header-center">
      <button class="fp-file-dropdown-trigger" aria-haspopup="menu" aria-expanded="false">
        <span class="fp-filename">${escapeHtml(filename)}</span>
        <span class="fp-dropdown-arrow">▾</span>
      </button>
    </div>
    <div class="fp-header-right">
      <button class="fp-editor-toggle" title="Toggle Editor Panel">
        <span class="fp-editor-toggle-icon">${editorOpen ? '◀' : '▶'}</span>
        <span class="fp-editor-toggle-label">Editor</span>
      </button>
      <button class="fp-theme-toggle" title="Toggle Theme">
        <span class="fp-theme-toggle-icon">${theme === 'dark' ? '☀️' : '🌙'}</span>
      </button>
      <button class="fp-command-palette-trigger" title="Command Palette (⌘K)">
        <span class="fp-kbd-hint">⌘K</span>
      </button>
    </div>
  `;

  // Create hover zone for auto-hide (detects mouse at top of screen)
  let hoverZone: HTMLElement | null = null;
  if (autoHide) {
    hoverZone = document.createElement('div');
    hoverZone.className = 'fp-header-hover-zone';
    header.classList.add('fp-header-bar--auto-hide');
  }

  // Get references to interactive elements
  const fileDropdownTrigger = header.querySelector('.fp-file-dropdown-trigger') as HTMLButtonElement;
  const filenameSpan = header.querySelector('.fp-filename') as HTMLSpanElement;
  const editorToggleBtn = header.querySelector('.fp-editor-toggle') as HTMLButtonElement;
  const editorToggleIcon = header.querySelector('.fp-editor-toggle-icon') as HTMLSpanElement;
  const themeToggleBtn = header.querySelector('.fp-theme-toggle') as HTMLButtonElement;
  const themeToggleIcon = header.querySelector('.fp-theme-toggle-icon') as HTMLSpanElement;
  const commandPaletteTrigger = header.querySelector('.fp-command-palette-trigger') as HTMLButtonElement;

  // State
  let currentEditorOpen = editorOpen;
  let currentAuthenticated = isAuthenticated;
  let currentTheme = theme;
  let isAutoHide = autoHide;
  let autoHideTimeout: number | undefined;

  // Event handlers
  const handleFileDropdownClick = () => {
    onFileDropdownClick?.();
  };

  const handleEditorToggle = () => {
    onEditorToggle?.();
  };

  const handleThemeToggle = () => {
    onThemeToggle?.();
  };

  const handleCommandPaletteClick = () => {
    onCommandPaletteClick?.();
  };

  // Auto-hide: show on hover zone
  const handleHoverZoneEnter = () => {
    header.classList.add('fp-header-bar--visible');
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
      autoHideTimeout = undefined;
    }
  };

  const handleHeaderLeave = () => {
    if (isAutoHide) {
      autoHideTimeout = window.setTimeout(() => {
        header.classList.remove('fp-header-bar--visible');
      }, 500);
    }
  };

  // Attach event listeners
  fileDropdownTrigger.addEventListener('click', handleFileDropdownClick);
  editorToggleBtn.addEventListener('click', handleEditorToggle);
  themeToggleBtn.addEventListener('click', handleThemeToggle);
  commandPaletteTrigger.addEventListener('click', handleCommandPaletteClick);
  
  if (hoverZone) {
    hoverZone.addEventListener('mouseenter', handleHoverZoneEnter);
  }
  header.addEventListener('mouseenter', handleHoverZoneEnter);
  header.addEventListener('mouseleave', handleHeaderLeave);

  return {
    element: header,
    hoverZone,

    setFilename(newFilename: string) {
      filenameSpan.textContent = newFilename;
    },

    setEditorOpen(open: boolean) {
      currentEditorOpen = open;
      editorToggleIcon.textContent = open ? '◀' : '▶';
      editorToggleBtn.classList.toggle('active', open);
    },

    setAuthenticated(authenticated: boolean) {
      currentAuthenticated = authenticated;
      // This can be used to update UI to show auth state
      header.classList.toggle('fp-authenticated', authenticated);
    },

    setTheme(newTheme: 'light' | 'dark') {
      currentTheme = newTheme;
      // Show sun icon in dark mode (to switch to light), moon icon in light mode (to switch to dark)
      themeToggleIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      themeToggleBtn.title = newTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
    },

    setAutoHide(enabled: boolean) {
      isAutoHide = enabled;
      header.classList.toggle('fp-header-bar--auto-hide', enabled);
      if (!enabled) {
        header.classList.remove('fp-header-bar--visible');
      }
    },

    showTemporarily(duration = 3000) {
      if (isAutoHide) {
        header.classList.add('fp-header-bar--visible');
        if (autoHideTimeout) {
          clearTimeout(autoHideTimeout);
        }
        autoHideTimeout = window.setTimeout(() => {
          header.classList.remove('fp-header-bar--visible');
        }, duration);
      }
    },

    setVisible(visible: boolean) {
      header.style.display = visible ? '' : 'none';
    },

    dispose() {
      if (autoHideTimeout) {
        clearTimeout(autoHideTimeout);
      }
      fileDropdownTrigger.removeEventListener('click', handleFileDropdownClick);
      editorToggleBtn.removeEventListener('click', handleEditorToggle);
      themeToggleBtn.removeEventListener('click', handleThemeToggle);
      commandPaletteTrigger.removeEventListener('click', handleCommandPaletteClick);
      if (hoverZone) {
        hoverZone.removeEventListener('mouseenter', handleHoverZoneEnter);
        hoverZone.remove();
      }
      header.removeEventListener('mouseenter', handleHoverZoneEnter);
      header.removeEventListener('mouseleave', handleHeaderLeave);
      header.remove();
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
