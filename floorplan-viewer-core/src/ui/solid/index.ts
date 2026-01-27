/**
 * Solid.js UI Components
 *
 * This module exports Solid.js components and utilities for use
 * in the floorplan viewer and editor applications.
 *
 * These components follow a hybrid integration pattern where
 * Solid handles reactive UI while Three.js handles 3D rendering.
 */

// ============================================================================
// FloorplanUI - Root UI Component (Pure Solid)
// ============================================================================

export {
  FloorplanUI,
  createFloorplanUI,
  createUIState,
  type FloorplanUIProps,
  type FloorplanUIConfig,
  type FloorplanUIAPI,
  type UIState,
  type Theme as UITheme,
} from './FloorplanUI.jsx';

// ============================================================================
// Command Palette
// ============================================================================

export { CommandPalette, type Command, type CommandPaletteProps } from './CommandPalette.jsx';

// ============================================================================
// File Dropdown
// ============================================================================

export {
  FileDropdown,
  FileDropdownContent,
  type FileDropdownProps,
  type FileDropdownContentProps,
  type FileOperation,
  type RecentFile,
} from './FileDropdown.jsx';

// ============================================================================
// Header Bar
// ============================================================================

export {
  HeaderBar,
  type HeaderBarProps,
  type Theme,
} from './HeaderBar.jsx';

// ============================================================================
// Theme Toggle
// ============================================================================

export {
  ThemeToggle,
  createSolidThemeToggle,
  type ThemeToggleProps,
  type ThemeToggleConfig,
  type ThemeToggleAPI,
} from './ThemeToggle.jsx';

// ============================================================================
// Properties Panel
// ============================================================================

export {
  PropertiesPanel,
  type PropertiesPanelProps,
  type PropertyDefinition,
  type PropertyType,
  type PropertyOption,
} from './PropertiesPanel.jsx';

export {
  createSolidPropertiesPanel,
  type PropertiesPanelConfig,
  type PropertiesPanelAPI,
} from './PropertiesPanelWrapper.jsx';

// ============================================================================
// Control Panels (Camera, Light, Annotations)
// ============================================================================

export {
  ControlPanelSection,
  Slider,
  Checkbox,
  Select,
  CameraControls,
  LightControls,
  AnnotationControls,
  type ControlPanelSectionProps,
  type SliderProps,
  type CheckboxProps,
  type SelectProps,
  type SelectOption,
  type CameraControlsProps,
  type CameraMode,
  type LightControlsProps,
  type AnnotationControlsProps,
  type AreaUnit,
  type LengthUnit,
} from './ControlPanels.jsx';

export {
  createSolidCameraControls,
  createSolidLightControls,
  createSolidAnnotationControls,
  type CameraControlsConfig,
  type CameraControlsAPI,
  type LightControlsConfig,
  type LightControlsAPI,
  type AnnotationControlsConfig,
  type AnnotationControlsAPI,
} from './ControlPanelsWrapper.jsx';

// ============================================================================
// Integration utilities
// ============================================================================

export {
  renderSolidComponent,
  unmountSolidComponent,
  hasSolidComponent,
  createSolidContainer,
  type CleanupFunction,
} from './render-solid.js';
