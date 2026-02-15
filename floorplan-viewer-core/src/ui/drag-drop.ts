/**
 * Drag and Drop Handler
 *
 * Enables drag-and-drop file loading on the 3D canvas:
 * - Visual overlay on drag-over
 * - Supports .floorplan and .json files
 * - Error toast for unsupported file types
 */

export interface DragDropConfig {
  /** Target element for drag-drop (usually the canvas container) */
  target: HTMLElement;
  /** Callback when a valid file is dropped */
  onFileDrop?: (file: File, content: string) => void;
  /** Callback for unsupported file type */
  onInvalidFile?: (file: File, reason: string) => void;
  /** Callback for drag state changes */
  onDragStateChange?: (isDragging: boolean) => void;
  /** Accepted file extensions (default: ['.floorplan', '.json']) */
  acceptedExtensions?: string[];
}

export interface DragDropHandler {
  /** Enable drag-drop handling */
  enable: () => void;
  /** Disable drag-drop handling */
  disable: () => void;
  /** Check if drag-drop is enabled */
  isEnabled: () => boolean;
  /** Destroy and cleanup */
  dispose: () => void;
}

/**
 * Initialize drag-and-drop handler on an element.
 */
export function initializeDragDrop(config: DragDropConfig): DragDropHandler {
  const {
    target,
    onFileDrop,
    onInvalidFile,
    onDragStateChange,
    acceptedExtensions = ['.floorplan', '.json'],
  } = config;

  // State
  let enabled = false;
  let dragCounter = 0; // Track nested drag events

  // Create overlay element
  const overlay = document.createElement('div');
  overlay.className = 'fp-drag-drop-overlay';
  overlay.innerHTML = `
    <div class="fp-drag-drop-content">
      <div class="fp-drag-drop-icon">📂</div>
      <div class="fp-drag-drop-text">Drop to open floorplan</div>
      <div class="fp-drag-drop-hint">Supports .floorplan and .json files</div>
    </div>
  `;
  overlay.style.display = 'none';

  // Event handlers
  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    dragCounter++;

    if (dragCounter === 1) {
      showOverlay();
      onDragStateChange?.(true);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Set drop effect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    dragCounter--;

    if (dragCounter === 0) {
      hideOverlay();
      onDragStateChange?.(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    dragCounter = 0;
    hideOverlay();
    onDragStateChange?.(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    processFile(file);
  }

  function processFile(file: File) {
    const ext = getFileExtension(file.name).toLowerCase();

    // Check if file type is supported
    if (!acceptedExtensions.includes(ext)) {
      onInvalidFile?.(
        file,
        `Unsupported file type: ${ext || 'unknown'}. Expected: ${acceptedExtensions.join(', ')}`,
      );
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onFileDrop?.(file, content);
    };
    reader.onerror = () => {
      onInvalidFile?.(file, 'Failed to read file');
    };
    reader.readAsText(file);
  }

  function showOverlay() {
    // Add overlay to target if not already added
    if (!target.contains(overlay)) {
      target.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    target.classList.add('fp-drag-active');
  }

  function hideOverlay() {
    overlay.style.display = 'none';
    target.classList.remove('fp-drag-active');
  }

  function enable() {
    if (enabled) return;
    enabled = true;

    target.addEventListener('dragenter', handleDragEnter);
    target.addEventListener('dragover', handleDragOver);
    target.addEventListener('dragleave', handleDragLeave);
    target.addEventListener('drop', handleDrop);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;

    target.removeEventListener('dragenter', handleDragEnter);
    target.removeEventListener('dragover', handleDragOver);
    target.removeEventListener('dragleave', handleDragLeave);
    target.removeEventListener('drop', handleDrop);

    hideOverlay();
    dragCounter = 0;
  }

  return {
    enable,
    disable,

    isEnabled() {
      return enabled;
    },

    dispose() {
      disable();
      overlay.remove();
    },
  };
}

/**
 * Get file extension including the dot.
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot);
}

/**
 * Check if a filename has a floorplan extension.
 */
export function isFloorplanFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.floorplan');
}

/**
 * Check if a filename has a JSON extension.
 */
export function isJsonFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.json');
}
