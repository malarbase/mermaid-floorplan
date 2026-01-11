# viewer-core

Shared abstractions and UI components for the floorplan viewer and interactive-editor packages.

## Overview

`viewer-core` provides a unified library of UI components that both `viewer` and `interactive-editor` can use without style duplication. All shared UI styles use the `fp-*` class prefix convention.

## Installation

```bash
npm install viewer-core
```

## Usage

### Injecting Styles

Before using any UI components, inject the shared styles:

```typescript
import { injectStyles } from 'viewer-core';

// Inject once at app startup
injectStyles();
```

Or use the CSS file directly:

```html
<link rel="stylesheet" href="./shared-styles.css">
```

### Creating UI Components

All UI components follow a factory function pattern:

```typescript
import { 
  createControlPanel,
  createCameraControlsUI,
  createDialogUI,
  createPropertiesPanelUI 
} from 'viewer-core';

// Create a control panel with sections
const panel = createControlPanel({ id: 'controls' });

// Create camera controls
const cameraControls = createCameraControlsUI({
  onModeChange: (mode) => console.log('Camera mode:', mode),
  onFovChange: (fov) => console.log('FOV:', fov),
});

// Create a dialog
const dialog = createDialogUI({
  title: 'Add Room',
  fields: [
    { name: 'name', label: 'Room Name', type: 'text' },
    { name: 'width', label: 'Width', type: 'number', value: 4 },
  ],
  onSubmit: (data) => console.log('Submitted:', data),
});

// Create properties panel
const properties = createPropertiesPanelUI({
  onPropertyChange: (prop, value) => console.log(`${prop}: ${value}`),
});
```

## UI Components

### Core Components

| Component | Description | Factory Function |
|-----------|-------------|------------------|
| Control Panel | Collapsible sections container | `createControlPanel()` |
| Slider Control | Range input with value display | `createSliderControl()` |
| Dialog | Modal dialog with form fields | `createDialogUI()` |
| Confirm Dialog | Confirmation modal | `createConfirmDialogUI()` |

### Feature Components

| Component | Description | Factory Function |
|-----------|-------------|------------------|
| Camera Controls | FOV, projection mode | `createCameraControlsUI()` |
| Light Controls | Azimuth, elevation, intensity | `createLightControlsUI()` |
| Floor Controls | Floor visibility toggles | `createFloorControlsUI()` |
| Annotation Controls | Area/dimension labels | `createAnnotationControlsUI()` |
| Selection Info | Selection count display | `createSelectionInfoUI()` |
| Selection Mode Toggle | Selection mode UI | `createSelectionModeToggleUI()` |
| Validation Warnings | Warning panel | `createValidationWarningsUI()` |
| Keyboard Help | Shortcut overlay | `createKeyboardHelpUI()` |
| Properties Panel | Entity properties editor | `createPropertiesPanelUI()` |

### Application Components

| Component | Description | Factory Function |
|-----------|-------------|------------------|
| Header Bar | App header with file menu | `createHeaderBar()` |
| File Dropdown | File operations menu | `createFileDropdown()` |
| Command Palette | Keyboard-driven command UI | `createCommandPalette()` |
| Editor Panel | Code editor container | `createEditorPanel()` |
| Drag Drop | File drag-drop handling | `initializeDragDrop()` |

## CSS Class Convention

All shared styles use the `fp-*` prefix to avoid conflicts:

```css
/* Containers */
.fp-control-panel
.fp-dialog-overlay
.fp-properties-panel

/* Interactive elements */
.fp-btn
.fp-btn-primary
.fp-btn-secondary
.fp-slider
.fp-checkbox-row

/* State classes */
.fp-has-selection
.visible
.collapsed
```

## Theme Support

All components support light and dark themes via the `body.dark-theme` selector:

```css
/* Light theme (default) */
.fp-control-panel {
  background: rgba(255, 255, 255, 0.95);
}

/* Dark theme */
body.dark-theme .fp-control-panel {
  background: rgba(40, 40, 40, 0.95);
}
```

Toggle themes in your app:

```typescript
document.body.classList.toggle('dark-theme', isDark);
```

## Layout Variables

Position panels using CSS custom properties:

```css
:root {
  --layout-editor-width: 0px;      /* Editor panel width when open */
  --layout-header-offset: 0px;      /* Header height offset */
}
```

Update from JavaScript:

```typescript
document.documentElement.style.setProperty('--layout-editor-width', '450px');
```

## TypeScript Support

All components export their configuration types:

```typescript
import type { 
  DialogConfig, 
  DialogField,
  PropertiesPanelUIOptions,
  PropertyDefinition 
} from 'viewer-core';

const config: DialogConfig = {
  title: 'My Dialog',
  fields: [{ name: 'input', label: 'Input', type: 'text' }],
  onSubmit: (data) => {},
};
```

## License

GPL-3.0-or-later
