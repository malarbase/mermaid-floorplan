/**
 * Camera controls UI component (Vanilla)
 *
 * @deprecated Use Solid.js version instead: `CameraControls` from './solid/ControlPanels'
 */

import { cls } from './class-names.js';
import { createControlPanelSection, getSectionContent } from './control-panel-section.js';
import { createSliderControl, type SliderControl } from './slider-control.js';
import { injectStyles } from './styles.js';

export interface CameraControlsUIOptions {
  initialMode?: 'perspective' | 'orthographic';
  initialFov?: number;
  onModeChange?: (mode: 'perspective' | 'orthographic') => void;
  onFovChange?: (fov: number) => void;
  onIsometric?: () => void;
}

export interface CameraControlsUI {
  element: HTMLElement;
  modeButton: HTMLButtonElement;
  fovSlider: SliderControl;
  isometricButton: HTMLButtonElement;
  setMode: (mode: 'perspective' | 'orthographic') => void;
  setFov: (fov: number) => void;
}

/**
 * Create camera controls UI section
 */
export function createCameraControlsUI(options: CameraControlsUIOptions = {}): CameraControlsUI {
  injectStyles();

  const {
    initialMode = 'perspective',
    initialFov = 75,
    onModeChange,
    onFovChange,
    onIsometric,
  } = options;

  let currentMode = initialMode;

  const section = createControlPanelSection({
    title: 'Camera',
    id: 'camera-section',
  });

  const content = getSectionContent(section)!;

  // Camera mode toggle button
  const modeButton = document.createElement('button');
  modeButton.className = cls.btn.full;
  modeButton.id = 'camera-mode-btn';
  modeButton.textContent =
    currentMode === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective';

  modeButton.addEventListener('click', () => {
    currentMode = currentMode === 'perspective' ? 'orthographic' : 'perspective';
    modeButton.textContent =
      currentMode === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective';

    // Show/hide FOV slider
    fovSlider.element.style.display = currentMode === 'perspective' ? '' : 'none';

    onModeChange?.(currentMode);
  });

  content.appendChild(modeButton);

  // FOV slider
  const fovSlider = createSliderControl({
    id: 'fov-slider',
    label: 'FOV',
    min: 30,
    max: 120,
    value: initialFov,
    step: 1,
    formatValue: (v) => `${Math.round(v)}°`,
    onChange: onFovChange,
  });
  fovSlider.element.id = 'fov-group';
  content.appendChild(fovSlider.element);

  // Isometric button
  const isometricButton = document.createElement('button');
  isometricButton.className = cls.btn.ghostFull;
  isometricButton.id = 'isometric-btn';
  isometricButton.textContent = 'Isometric View';
  isometricButton.addEventListener('click', () => onIsometric?.());
  content.appendChild(isometricButton);

  return {
    element: section,
    modeButton,
    fovSlider,
    isometricButton,
    setMode: (mode: 'perspective' | 'orthographic') => {
      currentMode = mode;
      modeButton.textContent =
        mode === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective';
      fovSlider.element.style.display = mode === 'perspective' ? '' : 'none';
    },
    setFov: (fov: number) => {
      fovSlider.setValue(fov);
    },
  };
}
