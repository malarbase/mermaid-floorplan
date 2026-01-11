/**
 * 2D overlay mini-map UI component
 */
import { injectStyles } from './styles.js';

export interface Overlay2DUIOptions {
  initialVisible?: boolean;
  onClose?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
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
  
  const { initialVisible = false, onClose, onVisibilityChange } = options;
  
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
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    container.style.left = `${initialLeft + dx}px`;
    container.style.bottom = `${initialBottom - dy}px`;
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      container.classList.remove('dragging');
    }
  });
  
  // Resize functionality
  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let initialWidth = 0;
  let initialHeight = 0;
  
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    initialWidth = container.offsetWidth;
    initialHeight = container.offsetHeight;
    e.preventDefault();
    e.stopPropagation();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const dx = e.clientX - resizeStartX;
    const dy = e.clientY - resizeStartY;
    container.style.width = `${Math.max(200, initialWidth + dx)}px`;
    container.style.height = `${Math.max(150, initialHeight + dy)}px`;
  });
  
  document.addEventListener('mouseup', () => {
    isResizing = false;
  });
  
  return {
    element: container,
    header,
    content,
    closeButton,
    resizeHandle,
    show: () => {
      container.classList.add('visible');
      onVisibilityChange?.(true);
    },
    hide: () => {
      container.classList.remove('visible');
      onVisibilityChange?.(false);
    },
    toggle: () => {
      const isVisible = container.classList.toggle('visible');
      onVisibilityChange?.(isVisible);
    },
    isVisible: () => container.classList.contains('visible'),
    setContent: (svg: SVGElement | null) => {
      content.innerHTML = '';
      if (svg) {
        content.appendChild(svg);
      } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'fp-overlay-2d-empty';
        emptyMsg.textContent = 'Load a floorplan to see 2D view';
        content.appendChild(emptyMsg);
      }
    },
  };
}

