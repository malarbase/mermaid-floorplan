/**
 * Editor Panel UI Component
 * 
 * A collapsible side panel containing the DSL editor with:
 * - Read-only mode for unauthenticated viewers
 * - Editable mode for authenticated users
 * - "Login to Edit" button when read-only
 * - Collapse/expand functionality
 * - Cursor-to-3D sync in both modes
 */

export interface EditorPanelConfig {
  /** Whether the panel should start open */
  initiallyOpen?: boolean;
  /** Whether editing is allowed (default: false = read-only) */
  editable?: boolean;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
  /** Initial DSL content */
  initialContent?: string;
  /** Editor width in pixels (default: 400) */
  width?: number;
  /** Minimum width when resizing (default: 300) */
  minWidth?: number;
  /** Maximum width when resizing (default: 80% of viewport) */
  maxWidth?: number;
  /** Callback when "Login to Edit" is clicked */
  onLoginClick?: () => void;
  /** Callback when collapse/expand state changes */
  onToggle?: (isOpen: boolean) => void;
  /** Callback when panel is resized */
  onResize?: (width: number) => void;
  /** Callback when content changes (only in editable mode) */
  onChange?: (content: string) => void;
  /** Callback when cursor position changes (for 3D sync) */
  onCursorChange?: (line: number, column: number) => void;
}

export interface EditorPanel {
  /** The root panel element */
  element: HTMLElement;
  /** The editor container element (for Monaco integration) */
  editorContainer: HTMLElement;
  /** Get current open/closed state */
  isOpen: () => boolean;
  /** Get current panel width */
  getWidth: () => number;
  /** Set panel width */
  setWidth: (width: number) => void;
  /** Toggle panel open/closed */
  toggle: () => void;
  /** Open the panel */
  open: () => void;
  /** Close the panel */
  close: () => void;
  /** Update authentication state */
  setAuthenticated: (authenticated: boolean) => void;
  /** Update editable state */
  setEditable: (editable: boolean) => void;
  /** Update the status text */
  setStatus: (text: string) => void;
  /** Show an error in the status bar */
  showError: (message: string) => void;
  /** Clear error status */
  clearError: () => void;
  /** Destroy the panel and clean up */
  destroy: () => void;
}

/**
 * Create the editor panel component.
 */
export function createEditorPanel(config: EditorPanelConfig = {}): EditorPanel {
  const {
    initiallyOpen = true,
    editable = false,
    isAuthenticated = false,
    width = 400,
    minWidth = 300,
    maxWidth = window.innerWidth * 0.8,
    onLoginClick,
    onToggle,
    onResize,
  } = config;

  let isOpen = initiallyOpen;
  let currentEditable = editable;
  let currentAuthenticated = isAuthenticated;
  let currentWidth = width;
  let isResizing = false;

  // Create root panel element
  const panel = document.createElement('div');
  panel.className = 'fp-editor-panel';
  panel.style.width = `${width}px`;
  // Set CSS variable for collapsed state positioning
  panel.style.setProperty('--fp-editor-width', `${width}px`);
  if (!isOpen) {
    panel.classList.add('fp-editor-panel--collapsed');
  }

  // Create header
  const header = document.createElement('div');
  header.className = 'fp-editor-panel__header';

  // Title section
  const titleSection = document.createElement('div');
  titleSection.className = 'fp-editor-panel__title-section';

  const title = document.createElement('span');
  title.className = 'fp-editor-panel__title';
  title.textContent = 'DSL Editor';
  titleSection.appendChild(title);

  // Mode badge
  const modeBadge = document.createElement('span');
  modeBadge.className = 'fp-editor-panel__mode-badge';
  updateModeBadge();
  titleSection.appendChild(modeBadge);

  header.appendChild(titleSection);

  // Header actions
  const headerActions = document.createElement('div');
  headerActions.className = 'fp-editor-panel__actions';

  // Login to Edit button (shown when not authenticated and not editable)
  const loginButton = document.createElement('button');
  loginButton.className = 'fp-editor-panel__login-btn';
  loginButton.innerHTML = '🔓 Login to Edit';
  loginButton.title = 'Login to enable editing';
  loginButton.addEventListener('click', (e) => {
    e.stopPropagation();
    onLoginClick?.();
  });
  updateLoginButton();
  headerActions.appendChild(loginButton);

  header.appendChild(headerActions);
  panel.appendChild(header);

  // Collapse/expand button - positioned absolutely on the panel edge
  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'fp-editor-panel__collapse-btn';
  collapseBtn.innerHTML = isOpen ? '◀' : '▶';
  collapseBtn.title = isOpen ? 'Collapse panel' : 'Expand panel';
  collapseBtn.addEventListener('click', () => togglePanel());
  panel.appendChild(collapseBtn);

  // Resize handle - positioned on the right edge of the panel
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'fp-editor-panel__resize-handle';
  resizeHandle.title = 'Drag to resize';
  panel.appendChild(resizeHandle);

  // Resize functionality
  const handleMouseDown = (e: MouseEvent): void => {
    if (!isOpen) return; // Don't allow resize when collapsed
    isResizing = true;
    panel.classList.add('fp-editor-panel--resizing');
    resizeHandle.classList.add('active');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent): void => {
    if (!isResizing) return;
    const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));
    currentWidth = newWidth;
    panel.style.width = `${newWidth}px`;
    panel.style.setProperty('--fp-editor-width', `${newWidth}px`);
    onResize?.(newWidth);
  };

  const handleMouseUp = (): void => {
    if (!isResizing) return;
    isResizing = false;
    panel.classList.remove('fp-editor-panel--resizing');
    resizeHandle.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  resizeHandle.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);

  // Create editor container
  const editorContainer = document.createElement('div');
  editorContainer.className = 'fp-editor-panel__editor';
  editorContainer.id = `fp-editor-${Date.now()}`;
  panel.appendChild(editorContainer);

  // Create status bar
  const statusBar = document.createElement('div');
  statusBar.className = 'fp-editor-panel__status';

  const statusText = document.createElement('span');
  statusText.className = 'fp-editor-panel__status-text';
  statusText.textContent = 'Ready';
  statusBar.appendChild(statusText);

  panel.appendChild(statusBar);

  // Helper functions
  function updateModeBadge(): void {
    if (currentEditable && currentAuthenticated) {
      modeBadge.textContent = 'Editing';
      modeBadge.className = 'fp-editor-panel__mode-badge fp-editor-panel__mode-badge--editable';
    } else {
      modeBadge.textContent = 'Read-only';
      modeBadge.className = 'fp-editor-panel__mode-badge fp-editor-panel__mode-badge--readonly';
    }
  }

  function updateLoginButton(): void {
    // Show login button only when not authenticated and editing is possible
    loginButton.style.display = currentAuthenticated ? 'none' : 'block';
  }

  function togglePanel(): void {
    isOpen = !isOpen;
    panel.classList.toggle('fp-editor-panel--collapsed', !isOpen);
    collapseBtn.innerHTML = isOpen ? '◀' : '▶';
    collapseBtn.title = isOpen ? 'Collapse panel' : 'Expand panel';
    onToggle?.(isOpen);
  }

  return {
    element: panel,
    editorContainer,

    isOpen: () => isOpen,

    getWidth: () => currentWidth,

    setWidth(newWidth: number): void {
      currentWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      panel.style.width = `${currentWidth}px`;
      panel.style.setProperty('--fp-editor-width', `${currentWidth}px`);
      onResize?.(currentWidth);
    },

    toggle: togglePanel,

    open(): void {
      if (!isOpen) {
        isOpen = true;
        panel.classList.remove('fp-editor-panel--collapsed');
        collapseBtn.innerHTML = '◀';
        collapseBtn.title = 'Collapse panel';
        onToggle?.(true);
      }
    },

    close(): void {
      if (isOpen) {
        isOpen = false;
        panel.classList.add('fp-editor-panel--collapsed');
        collapseBtn.innerHTML = '▶';
        collapseBtn.title = 'Expand panel';
        onToggle?.(false);
      }
    },

    setAuthenticated(authenticated: boolean): void {
      currentAuthenticated = authenticated;
      updateModeBadge();
      updateLoginButton();
    },

    setEditable(editable: boolean): void {
      currentEditable = editable;
      updateModeBadge();
    },

    setStatus(text: string): void {
      statusText.textContent = text;
      statusText.className = 'fp-editor-panel__status-text';
    },

    showError(message: string): void {
      statusText.textContent = `⚠️ ${message}`;
      statusText.className = 'fp-editor-panel__status-text fp-editor-panel__status-text--error';
    },

    clearError(): void {
      statusText.textContent = 'Ready';
      statusText.className = 'fp-editor-panel__status-text';
    },

    destroy(): void {
      // Clean up event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      panel.remove();
    },
  };
}
