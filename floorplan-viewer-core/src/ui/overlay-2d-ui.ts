/**
 * 2D overlay mini-map UI component
 */
import { injectStyles } from './styles.js';

export interface Overlay2DUIOptions {
  initialVisible?: boolean;
  onClose?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
  /** Called when the overlay is resized (manually or after content change) */
  onResize?: (width: number, height: number) => void;
  /** AbortSignal for cleaning up document-level listeners on dispose */
  signal?: AbortSignal;
}

export interface Overlay2DUI {
  element: HTMLElement;
  header: HTMLElement;
  content: HTMLElement;
  closeButton: HTMLButtonElement;
  resizeHandle: HTMLElement;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  isVisible: () => boolean;
  setContent: (svg: SVGElement | null) => void;
}

/**
 * Create 2D overlay mini-map UI
 */
export function createOverlay2DUI(options: Overlay2DUIOptions = {}): Overlay2DUI {
  injectStyles();

  const { initialVisible = false, onClose, onVisibilityChange, onResize, signal } = options;

  const container = document.createElement('div');
  container.className = 'fp-overlay-2d';
  container.id = 'overlay-2d';
  if (initialVisible) container.classList.add('visible');

  // Header with title and close button
  const header = document.createElement('div');
  header.className = 'fp-overlay-2d-header';
  header.id = 'overlay-2d-header';

  const title = document.createElement('span');
  title.textContent = '2D View';

  const closeButton = document.createElement('button');
  closeButton.className = 'fp-overlay-2d-close';
  closeButton.id = 'overlay-2d-close';
  closeButton.textContent = '×';
  closeButton.title = 'Close';
  closeButton.addEventListener('click', () => {
    container.classList.remove('visible');
    onClose?.();
    onVisibilityChange?.(false);
  });

  header.appendChild(title);
  header.appendChild(closeButton);

  // Content area
  const content = document.createElement('div');
  content.className = 'fp-overlay-2d-content';
  content.id = 'overlay-2d-content';

  const emptyMsg = document.createElement('div');
  emptyMsg.className = 'fp-overlay-2d-empty';
  emptyMsg.id = 'overlay-2d-empty';
  emptyMsg.textContent = 'Load a floorplan to see 2D view';
  content.appendChild(emptyMsg);

  // Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'fp-overlay-2d-resize';
  resizeHandle.id = 'overlay-2d-resize';

  container.appendChild(header);
  container.appendChild(content);
  container.appendChild(resizeHandle);

  // Drag functionality
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialBottom = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target === closeButton) return;
    isDragging = true;
    container.classList.add('dragging');
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = container.getBoundingClientRect();
    initialLeft = rect.left;
    initialBottom = window.innerHeight - rect.bottom;
    e.preventDefault();
  });

  // Document-level listeners use AbortSignal for automatic cleanup
  document.addEventListener(
    'mousemove',
    (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      container.style.left = `${initialLeft + dx}px`;
      container.style.bottom = `${initialBottom - dy}px`;
    },
    { signal },
  );

  document.addEventListener(
    'mouseup',
    () => {
      if (isDragging) {
        isDragging = false;
        container.classList.remove('dragging');
      }
    },
    { signal },
  );

  // Track whether the user has manually resized — if so, skip auto-sizing
  let userResized = false;

  // Auto-size the container height based on the SVG viewBox aspect ratio.
  // Only works when the overlay is visible (offsetWidth > 0).
  const autoSizeFromViewBox = () => {
    if (userResized) return;
    const svg = content.querySelector('svg');
    if (!svg) return;
    const w = container.offsetWidth;
    if (w === 0) return; // Still hidden, can't measure
    const viewBox = svg.getAttribute('viewBox');
    if (!viewBox) return;
    const parts = viewBox.split(/[\s,]+/).map(Number);
    if (parts.length !== 4 || parts[2] <= 0 || parts[3] <= 0) return;
    const aspect = parts[3] / parts[2]; // height / width
    const headerH = header.offsetHeight;
    const autoHeight = Math.round(w * aspect) + headerH;
    const clampedHeight = Math.max(150, Math.min(autoHeight, window.innerHeight * 0.6));
    container.style.height = `${clampedHeight}px`;
    onResize?.(container.offsetWidth, container.offsetHeight);
  };

  // Resize functionality — temporarily switches from bottom-anchor to top-anchor
  // so the panel grows naturally downward/rightward following the resize handle.
  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let initialWidth = 0;
  let initialHeight = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    userResized = true; // Mark as manually resized — skip future auto-sizing
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    initialWidth = container.offsetWidth;
    initialHeight = container.offsetHeight;
    // Switch to top-anchor so height increase grows downward naturally
    const rect = container.getBoundingClientRect();
    const parentTop = container.offsetParent?.getBoundingClientRect().top ?? 0;
    container.style.top = `${rect.top - parentTop}px`;
    container.style.bottom = 'auto';
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener(
    'mousemove',
    (e) => {
      if (!isResizing) return;
      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;
      container.style.width = `${Math.max(200, initialWidth + dx)}px`;
      container.style.height = `${Math.max(150, initialHeight + dy)}px`;
    },
    { signal },
  );

  document.addEventListener(
    'mouseup',
    () => {
      if (isResizing) {
        isResizing = false;
        // Convert back to bottom-based positioning for layout consistency
        const rect = container.getBoundingClientRect();
        const parentRect = container.offsetParent?.getBoundingClientRect();
        const parentHeight = parentRect?.height ?? window.innerHeight;
        const parentTop = parentRect?.top ?? 0;
        container.style.bottom = `${Math.max(10, parentHeight - (rect.bottom - parentTop))}px`;
        container.style.top = 'auto';
        // Notify of the new size
        onResize?.(container.offsetWidth, container.offsetHeight);
      }
    },
    { signal },
  );

  return {
    element: container,
    header,
    content,
    closeButton,
    resizeHandle,
    show: () => {
      container.classList.add('visible');
      onVisibilityChange?.(true);
      // Defer auto-size to next frame so the browser has computed layout
      requestAnimationFrame(() => autoSizeFromViewBox());
    },
    hide: () => {
      container.classList.remove('visible');
      onVisibilityChange?.(false);
    },
    toggle: () => {
      const isVisible = container.classList.toggle('visible');
      onVisibilityChange?.(isVisible);
      if (isVisible) {
        requestAnimationFrame(() => autoSizeFromViewBox());
      }
    },
    isVisible: () => container.classList.contains('visible'),
    setContent: (svg: SVGElement | null) => {
      content.innerHTML = '';
      if (svg) {
        content.appendChild(svg);
        // Auto-size if visible now; if hidden, show() will trigger it later
        if (container.classList.contains('visible')) {
          autoSizeFromViewBox();
        }
      } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'fp-overlay-2d-empty';
        emptyMsg.textContent = 'Load a floorplan to see 2D view';
        content.appendChild(emptyMsg);
      }
    },
  };
}
