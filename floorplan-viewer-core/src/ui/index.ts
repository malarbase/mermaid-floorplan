/**
 * Shared UI components for floorplan viewer
 * These components can be used by both the viewer and interactive-editor packages.
 */

// Styles
export { SHARED_STYLES, injectStyles, areStylesInjected } from './styles.js';

// DaisyUI/Tailwind class names (centralized for maintainability)
export { cls, type ClassNames } from './class-names.js';

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

export {
  createValidationWarningsUI,
  type ValidationWarningsUI,
  type ValidationWarningsUIOptions,
  type ValidationWarning,
} from './validation-warnings-ui.js';

export {
  createShortcutInfoUI,
  type ShortcutInfoUI,
  type ShortcutInfoUIOptions,
  type ShortcutItem,
} from './shortcut-info-ui.js';

// Command utilities (extracted from deprecated command-palette.ts)

export {
  createFileCommands,
  createViewCommands,
  createEditorCommands,
  type Command,
  type FileOperation,
} from './command-utils.js';

export {
  initializeDragDrop,
  isFloorplanFile,
  isJsonFile,
  type DragDropConfig,
  type DragDropHandler,
} from './drag-drop.js';

export {
  createEditorPanel,
  type EditorPanel,
  type EditorPanelConfig,
} from './editor-panel.js';

// Dialog components
export {
  createDialogUI,
  createConfirmDialogUI,
  type DialogUI,
  type DialogConfig,
  type DialogField,
  type ConfirmDialogUI,
  type ConfirmDialogConfig,
} from './dialog-ui.js';

// Properties Panel - Use Solid.js PropertiesPanel from './solid/PropertiesPanel.jsx' instead

// Solid.js Components are exported from './solid/index.js' directly
// to avoid loading browser-specific code in Node.js environments.
// Import Solid components with: import { ... } from 'floorplan-viewer-core/ui/solid'
