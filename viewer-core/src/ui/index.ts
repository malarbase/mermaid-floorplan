/**
 * Shared UI components for floorplan viewer
 * These components can be used by both the viewer and interactive-editor packages.
 */

// Styles
export { SHARED_STYLES, injectStyles, areStylesInjected } from './styles.js';

// Base components
export {
  createControlPanel,
  createControlPanelSection,
  getSectionContent,
  type ControlPanelSectionOptions,
} from './control-panel-section.js';

export {
  createSliderControl,
  type SliderControl,
  type SliderControlOptions,
} from './slider-control.js';

// Feature-specific UI components
export {
  createCameraControlsUI,
  type CameraControlsUI,
  type CameraControlsUIOptions,
} from './camera-controls-ui.js';

export {
  createLightControlsUI,
  type LightControlsUI,
  type LightControlsUIOptions,
} from './light-controls-ui.js';

export {
  createFloorControlsUI,
  type FloorControlsUI,
  type FloorControlsUIOptions,
} from './floor-controls-ui.js';

export {
  createAnnotationControlsUI,
  type AnnotationControlsUI,
  type AnnotationControlsUIOptions,
  type AreaUnit,
  type LengthUnit,
} from './annotation-controls-ui.js';

export {
  createOverlay2DUI,
  type Overlay2DUI,
  type Overlay2DUIOptions,
} from './overlay-2d-ui.js';

export {
  createKeyboardHelpUI,
  type KeyboardHelpUI,
  type KeyboardHelpUIOptions,
  type KeyboardHelpSection,
  type KeyboardShortcut,
} from './keyboard-help-ui.js';

export {
  createSelectionInfoUI,
  type SelectionInfoUI,
  type SelectionInfoUIOptions,
} from './selection-info-ui.js';

export {
  createSelectionModeToggleUI,
  type SelectionModeToggleUI,
  type SelectionModeToggleUIOptions,
} from './selection-mode-toggle-ui.js';

