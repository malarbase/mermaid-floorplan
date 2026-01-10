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
  /** Callback when file dropdown is clicked */
  onFileDropdownClick?: () => void;
  /** Callback when editor toggle is clicked */
  onEditorToggle?: () => void;
  /** Callback when command palette trigger is clicked */
  onCommandPaletteClick?: () => void;
}

export interface HeaderBar {
  /** The root header element */
  element: HTMLElement;
  /** Update the displayed filename */
  setFilename: (filename: string) => void;
  /** Update the editor toggle state */
  setEditorOpen: (open: boolean) => void;
  /** Update authentication state (shows lock icon on save) */
  setAuthenticated: (authenticated: boolean) => void;
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
    onFileDropdownClick,
    onEditorToggle,
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
      <button class="fp-command-palette-trigger" title="Command Palette (⌘K)">
        <span class="fp-kbd-hint">⌘K</span>
      </button>
    </div>
  `;

  // Get references to interactive elements
  const fileDropdownTrigger = header.querySelector('.fp-file-dropdown-trigger') as HTMLButtonElement;
  const filenameSpan = header.querySelector('.fp-filename') as HTMLSpanElement;
  const editorToggleBtn = header.querySelector('.fp-editor-toggle') as HTMLButtonElement;
  const editorToggleIcon = header.querySelector('.fp-editor-toggle-icon') as HTMLSpanElement;
  const commandPaletteTrigger = header.querySelector('.fp-command-palette-trigger') as HTMLButtonElement;

  // State
  let currentEditorOpen = editorOpen;
  let currentAuthenticated = isAuthenticated;

  // Event handlers
  const handleFileDropdownClick = () => {
    onFileDropdownClick?.();
  };

  const handleEditorToggle = () => {
    onEditorToggle?.();
  };

  const handleCommandPaletteClick = () => {
    onCommandPaletteClick?.();
  };

  // Attach event listeners
  fileDropdownTrigger.addEventListener('click', handleFileDropdownClick);
  editorToggleBtn.addEventListener('click', handleEditorToggle);
  commandPaletteTrigger.addEventListener('click', handleCommandPaletteClick);

  return {
    element: header,

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

    setVisible(visible: boolean) {
      header.style.display = visible ? '' : 'none';
    },

    dispose() {
      fileDropdownTrigger.removeEventListener('click', handleFileDropdownClick);
      editorToggleBtn.removeEventListener('click', handleEditorToggle);
      commandPaletteTrigger.removeEventListener('click', handleCommandPaletteClick);
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
