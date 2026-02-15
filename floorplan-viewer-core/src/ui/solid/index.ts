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
  type AppCore,
  createFloorplanUI,
  createUIState,
  FloorplanUI,
  type FloorplanUIAPI,
  type FloorplanUIConfig,
  type FloorplanUIProps,
  type Theme as UITheme,
  type UIMode,
  type UIState,
} from './FloorplanUI.jsx';

// ============================================================================
// EditorUI - Editor-specific Root UI Component (Pure Solid)
// ============================================================================

export {
  createEditorUI,
  createEditorUIState,
  EditorUI,
  type EditorUIAPI,
  type EditorUIConfig,
  type EditorUIProps,
  type EditorUIState,
} from './EditorUI.jsx';

// ============================================================================
// Command Palette
// ============================================================================

export { type Command, CommandPalette, type CommandPaletteProps } from './CommandPalette.jsx';

// ============================================================================
// File Dropdown
// ============================================================================

export {
  FileDropdown,
  FileDropdownContent,
  type FileDropdownContentProps,
  type FileDropdownProps,
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
  createSolidThemeToggle,
  ThemeToggle,
  type ThemeToggleAPI,
  type ThemeToggleConfig,
  type ThemeToggleProps,
} from './ThemeToggle.jsx';

// ============================================================================
// Properties Panel
// ============================================================================

export {
  PropertiesPanel,
  type PropertiesPanelProps,
  type PropertyDefinition,
  type PropertyOption,
  type PropertyType,
} from './PropertiesPanel.jsx';

// ============================================================================
// Control Panels (Camera, Light, Annotations)
// ============================================================================

export {
  AnnotationControls,
  type AnnotationControlsProps,
  type AreaUnit,
  CameraControls,
  type CameraControlsProps,
  type CameraMode,
  Checkbox,
  type CheckboxProps,
  ControlPanelSection,
  type ControlPanelSectionProps,
  type LengthUnit,
  LightControls,
  type LightControlsProps,
  Select,
  type SelectOption,
  type SelectProps,
  Slider,
  type SliderProps,
} from './ControlPanels.jsx';

// ============================================================================
// Integration utilities
// ============================================================================

export {
  type CleanupFunction,
  createSolidContainer,
  hasSolidComponent,
  renderSolidComponent,
  unmountSolidComponent,
} from './render-solid.js';
