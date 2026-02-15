/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Overlay2DManager } from '../src/overlay-2d-manager';

/**
 * Create mock DOM elements for the 2D overlay
 */
function createMockOverlayDOM() {
  const overlay = document.createElement('div');
  overlay.id = 'overlay-2d';
  overlay.className = 'fp-overlay-2d';
  overlay.style.cssText =
    'position: absolute; bottom: 10px; left: 10px; width: 280px; height: 220px;';

  const header = document.createElement('div');
  header.id = 'overlay-2d-header';
  header.className = 'fp-overlay-2d-header';

  const content = document.createElement('div');
  content.id = 'overlay-2d-content';
  content.className = 'fp-overlay-2d-content';

  const emptyMsg = document.createElement('div');
  emptyMsg.id = 'overlay-2d-empty';
  content.appendChild(emptyMsg);

  const resize = document.createElement('div');
  resize.id = 'overlay-2d-resize';
  resize.className = 'fp-overlay-2d-resize';

  overlay.appendChild(header);
  overlay.appendChild(content);
  overlay.appendChild(resize);
  document.body.appendChild(overlay);

  return { overlay, header, content, resize };
}

/**
 * Create mock controls for the overlay
 */
function createMockControls() {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'show-2d-overlay';

  const opacitySlider = document.createElement('input');
  opacitySlider.type = 'range';
  opacitySlider.id = 'overlay-opacity';

  const opacityValue = document.createElement('span');
  opacityValue.id = 'overlay-opacity-value';

  const closeBtn = document.createElement('button');
  closeBtn.id = 'overlay-2d-close';

  document.body.appendChild(checkbox);
  document.body.appendChild(opacitySlider);
  document.body.appendChild(opacityValue);
  document.body.appendChild(closeBtn);

  return { checkbox, opacitySlider, opacityValue, closeBtn };
}

describe('Overlay2DManager', () => {
  let manager: Overlay2DManager;
  let mockDOM: ReturnType<typeof createMockOverlayDOM>;
  let mockControls: ReturnType<typeof createMockControls>;

  beforeEach(() => {
    // Clear document body
    document.body.innerHTML = '';

    // Create mock DOM
    mockDOM = createMockOverlayDOM();
    mockControls = createMockControls();

    // Create manager with mock callbacks
    manager = new Overlay2DManager({
      getCurrentTheme: () => 'light',
      getFloorplanData: () => null,
      getVisibleFloorIds: () => [],
    });

    manager.setupControls();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('drag state tracking', () => {
    it('should not be marked as dragged initially', () => {
      expect(manager.isDragged()).toBe(false);
    });

    it('should mark as dragged after header mousedown and mouseup', () => {
      // Simulate drag start
      const mousedown = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        bubbles: true,
      });
      mockDOM.header.dispatchEvent(mousedown);

      // Simulate drag end
      document.dispatchEvent(new MouseEvent('mouseup'));

      expect(manager.isDragged()).toBe(true);
    });

    it('should reset dragged state when resetPosition is called', () => {
      // First drag it
      mockDOM.header.dispatchEvent(
        new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
          bubbles: true,
        }),
      );
      document.dispatchEvent(new MouseEvent('mouseup'));

      expect(manager.isDragged()).toBe(true);

      // Reset position
      manager.resetPosition();

      expect(manager.isDragged()).toBe(false);
    });
  });

  describe('resetPosition', () => {
    it('should clear inline position styles', () => {
      // Set some inline styles (simulating drag)
      mockDOM.overlay.style.left = '200px';
      mockDOM.overlay.style.bottom = '100px';
      mockDOM.overlay.style.width = '300px';
      mockDOM.overlay.style.height = '250px';

      manager.resetPosition();

      // Should have cleared all position-related inline styles
      expect(mockDOM.overlay.style.left).toBe('');
      expect(mockDOM.overlay.style.bottom).toBe('');
      expect(mockDOM.overlay.style.right).toBe('');
      expect(mockDOM.overlay.style.top).toBe('');
      expect(mockDOM.overlay.style.width).toBe('');
      expect(mockDOM.overlay.style.height).toBe('');
    });
  });

  describe('onEditorStateChanged', () => {
    it('should not adjust position if overlay has not been dragged', () => {
      mockDOM.overlay.style.left = '50px';

      // Editor opens with width 450
      manager.onEditorStateChanged(true, 450);

      // Position should remain unchanged because hasBeenDragged is false
      expect(mockDOM.overlay.style.left).toBe('50px');
    });

    it('should adjust position when overlay was dragged and would be hidden by editor', () => {
      // Simulate drag to set hasBeenDragged flag
      mockDOM.header.dispatchEvent(
        new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
          bubbles: true,
        }),
      );
      document.dispatchEvent(new MouseEvent('mouseup'));

      // Set overlay position that would be behind editor
      mockDOM.overlay.style.left = '50px';

      // Editor opens with width 450
      manager.onEditorStateChanged(true, 450);

      // Position should be adjusted to be visible (editorWidth + 10)
      expect(parseFloat(mockDOM.overlay.style.left)).toBeGreaterThanOrEqual(460);
    });

    it('should not adjust position when overlay is already visible beyond editor', () => {
      // Simulate drag
      mockDOM.header.dispatchEvent(
        new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
          bubbles: true,
        }),
      );
      document.dispatchEvent(new MouseEvent('mouseup'));

      // Set overlay position that is already visible
      mockDOM.overlay.style.left = '500px';

      // Editor opens with width 450
      manager.onEditorStateChanged(true, 450);

      // Position should remain unchanged
      expect(mockDOM.overlay.style.left).toBe('500px');
    });

    it('should do nothing when editor closes', () => {
      // Simulate drag
      mockDOM.header.dispatchEvent(
        new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
          bubbles: true,
        }),
      );
      document.dispatchEvent(new MouseEvent('mouseup'));

      mockDOM.overlay.style.left = '500px';

      // Editor closes
      manager.onEditorStateChanged(false, 450);

      // Position should remain unchanged
      expect(mockDOM.overlay.style.left).toBe('500px');
    });
  });

  describe('visibility toggle', () => {
    it('should toggle visibility class when checkbox is changed', () => {
      expect(mockDOM.overlay.classList.contains('visible')).toBe(false);

      // Check the checkbox
      mockControls.checkbox.checked = true;
      mockControls.checkbox.dispatchEvent(new Event('change'));

      expect(mockDOM.overlay.classList.contains('visible')).toBe(true);

      // Uncheck
      mockControls.checkbox.checked = false;
      mockControls.checkbox.dispatchEvent(new Event('change'));

      expect(mockDOM.overlay.classList.contains('visible')).toBe(false);
    });

    it('should hide overlay and uncheck checkbox when close button is clicked', () => {
      // First show the overlay
      mockControls.checkbox.checked = true;
      mockControls.checkbox.dispatchEvent(new Event('change'));

      expect(mockDOM.overlay.classList.contains('visible')).toBe(true);

      // Click close button
      mockControls.closeBtn.click();

      expect(mockDOM.overlay.classList.contains('visible')).toBe(false);
      expect(mockControls.checkbox.checked).toBe(false);
    });
  });
});
