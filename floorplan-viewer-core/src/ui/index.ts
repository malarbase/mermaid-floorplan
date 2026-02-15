/**
 * Shared UI components for floorplan viewer
 * These components can be used by both the viewer and interactive-editor packages.
 */

export {
  type AnnotationControlsUI,
  type AnnotationControlsUIOptions,
  type AreaUnit,
  createAnnotationControlsUI,
  type LengthUnit,
} from './annotation-controls-ui.js';
// Feature-specific UI components
export {
  type CameraControlsUI,
  type CameraControlsUIOptions,
  createCameraControlsUI,
} from './camera-controls-ui.js';
// DaisyUI/Tailwind class names (centralized for maintainability)
export { type ClassNames, cls } from './class-names.js';
// Base components
export {
  type ControlPanelSectionOptions,
  createControlPanel,
  createControlPanelSection,
  getSectionContent,
} from './control-panel-section.js';
export {
  createFloorControlsUI,
  type FloorControlsUI,
  type FloorControlsUIOptions,
} from './floor-controls-ui.js';
export {
  createKeyboardHelpUI,
  type KeyboardHelpSection,
  type KeyboardHelpUI,
  type KeyboardHelpUIOptions,
  type KeyboardShortcut,
} from './keyboard-help-ui.js';
export {
  createLightControlsUI,
  type LightControlsUI,
  type LightControlsUIOptions,
} from './light-controls-ui.js';
export {
  createOverlay2DUI,
  type Overlay2DUI,
  type Overlay2DUIOptions,
} from './overlay-2d-ui.js';
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
export {
  createShortcutInfoUI,
  type ShortcutInfoUI,
  type ShortcutInfoUIOptions,
  type ShortcutItem,
} from './shortcut-info-ui.js';
export {
  createSliderControl,
  type SliderControl,
  type SliderControlOptions,
} from './slider-control.js';
// Styles
export { areStylesInjected, injectStyles, SHARED_STYLES } from './styles.js';
export {
  createValidationWarningsUI,
  type ValidationWarning,
  type ValidationWarningsUI,
  type ValidationWarningsUIOptions,
} from './validation-warnings-ui.js';

// Command utilities (extracted from deprecated command-palette.ts)

export {
  type Command,
  createEditorCommands,
  createFileCommands,
  createViewCommands,
  type FileOperation,
} from './command-utils.js';
// Dialog components
export {
  type ConfirmDialogConfig,
  type ConfirmDialogUI,
  createConfirmDialogUI,
  createDialogUI,
  type DialogConfig,
  type DialogField,
  type DialogUI,
} from './dialog-ui.js';
export {
  type DragDropConfig,
  type DragDropHandler,
  initializeDragDrop,
  isFloorplanFile,
  isJsonFile,
} from './drag-drop.js';
export {
  createEditorPanel,
  type EditorPanel,
  type EditorPanelConfig,
} from './editor-panel.js';

// Properties Panel - Use Solid.js PropertiesPanel from './solid/PropertiesPanel.jsx' instead

// Solid.js Components are exported from './solid/index.js' directly
// to avoid loading browser-specific code in Node.js environments.
// Import Solid components with: import { ... } from 'floorplan-viewer-core/ui/solid'
