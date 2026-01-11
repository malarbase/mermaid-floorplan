/**
 * Floorplan 3D Viewer
 * 
 * A read-only viewer for .floorplan DSL files with:
 * - Full 3D visualization
 * - Drag-and-drop file loading
 * - File dropdown with import/export options
 * - Command palette (⌘K)
 * - Control panel for camera, lighting, floors, annotations
 * - 2D overlay mini-map
 * - Keyboard navigation
 * - Collapsible read-only DSL editor panel
 * 
 * This uses the unified FloorplanApp class from viewer-core with
 * viewer-only feature flags (no editing, no auth required).
 */

import { 
  FloorplanApp, 
  injectStyles,
  createControlPanel,
  createCameraControlsUI,
  createLightControlsUI,
  createFloorControlsUI,
  createAnnotationControlsUI,
  createOverlay2DUI,
  createKeyboardHelpUI,
  createShortcutInfoUI,
  createValidationWarningsUI,
  createControlPanelSection,
  getSectionContent,
  createSliderControl,
  createDslEditor,
  createEditorPanel,
} from 'viewer-core';

// Inject shared styles
injectStyles();

// Default floorplan content for initial display
const defaultFloorplan = `%%{version: 1.0}%%
floorplan
  # Style definitions
  style Modern {
    floor_color: "#E8E8E8",
    wall_color: "#505050",
    roughness: 0.4,
    metalness: 0.1
  }
  
  style WarmWood {
    floor_color: "#8B4513",
    wall_color: "#D2B48C",
    roughness: 0.7,
    metalness: 0.0
  }
  
  # Configuration
  config { default_style: Modern, wall_thickness: 0.25 }
  
  floor MainFloor {
    room LivingRoom at (0,0) size (12 x 10) walls [top: solid, right: solid, bottom: solid, left: window] label "Living Area" style WarmWood
    room Kitchen size (8 x 8) walls [top: solid, right: window, bottom: solid, left: open] right-of LivingRoom
    room Hallway size (4 x 10) walls [top: solid, right: solid, bottom: solid, left: solid] below LivingRoom gap 0.5
    room MasterBedroom size (10 x 10) walls [top: solid, right: window, bottom: solid, left: solid] right-of Hallway
  }
  
  connect LivingRoom.right to Kitchen.left door at 50%
  connect LivingRoom.bottom to Hallway.top door at 50%
  connect Hallway.right to MasterBedroom.left door at 50%
`;

// ========================================
// Create UI Components BEFORE FloorplanApp
// (FloorplanApp.setupHelpOverlay needs these elements)
// ========================================

// Create keyboard help overlay (accessible via H or ? keys)
const keyboardHelp = createKeyboardHelpUI({
  onClose: () => keyboardHelp.hide(),
});
document.body.appendChild(keyboardHelp.element);

// Create shortcut info panel (bottom-left corner hint)
const shortcutInfo = createShortcutInfoUI({
  title: 'Floorplan 3D Viewer',
});
document.body.appendChild(shortcutInfo.element);

// Create validation warnings panel (shows DSL parsing warnings)
const validationWarnings = createValidationWarningsUI({});
document.body.appendChild(validationWarnings.element);

// Create floor summary container
const floorSummary = document.createElement('div');
floorSummary.id = 'floor-summary';
floorSummary.className = 'fp-floor-summary';
floorSummary.innerHTML = `
  <div class="floor-summary-title">Floor Summary</div>
  <div id="floor-summary-content"></div>
`;
document.body.appendChild(floorSummary);

// ========================================
// Read-Only Editor Panel (using viewer-core component)
// ========================================

// Track editor state (used by editorPanel callbacks)

// Create read-only editor panel using viewer-core's component
const editorPanel = createEditorPanel({
  initiallyOpen: false,  // Start collapsed in viewer
  editable: false,       // Read-only mode
  isAuthenticated: false,
  width: 450,
  onToggle: (isOpen: boolean) => {
    // Trigger Monaco editor resize if needed
    setTimeout(() => dslEditor?.editor.layout(), 250);
    
    // Sync body class for CSS alignment of shortcut info, minimap, etc.
    document.body.classList.toggle('editor-open', isOpen);
    if (isOpen) {
      document.documentElement.style.setProperty('--editor-width', '450px');
    }
    
    // Sync header bar state (viewer ref will be set after creation)
    if (viewerRef) {
      viewerRef.headerBar?.setEditorOpen(isOpen);
    }
  },
});

// Store viewer reference for use in onToggle callback
let viewerRef: FloorplanApp | null = null;

// Set the ID so FloorplanApp can find it (for consistency)
editorPanel.element.id = 'editor-panel';
document.body.appendChild(editorPanel.element);

// Create Monaco editor inside the panel's container
let dslEditor: ReturnType<typeof createDslEditor> | null = null;

// Function to update Monaco editor theme
function updateEditorTheme(theme: 'light' | 'dark'): void {
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  dslEditor?.editor.updateOptions({ theme: monacoTheme });
}

// Wait for next frame to ensure DOM is ready, then create editor
requestAnimationFrame(() => {
  // Use light theme initially (matching app's initialTheme)
  dslEditor = createDslEditor({
    containerId: editorPanel.editorContainer.id,
    initialContent: defaultFloorplan,
    theme: 'vs',  // Light theme to match initialTheme: 'light'
    fontSize: 13,
  });
  
  // Set editor to read-only mode
  dslEditor.editor.updateOptions({ readOnly: true });
});

// ========================================
// Create FloorplanApp
// ========================================

const viewer = new FloorplanApp({
  containerId: 'app',
  initialTheme: 'light',
  initialDsl: defaultFloorplan,
  
  // Viewer-only feature flags
  enableEditing: false,        // Read-only mode
  enableSelection: false,      // Selection off by default in viewer
  allowSelectionToggle: true,  // User can press V to enable selection
  enableChat: false,           // No AI chat in viewer
  showHeaderBar: true,         // File dropdown + command palette
  enableDragDrop: true,        // Drag-drop file loading
  editorPanelDefaultOpen: false,  // Editor panel starts collapsed
  headerAutoHide: true,          // Header bar auto-hides when not interacting
  
  // No auth required for viewer
  isAuthenticated: false,
  onAuthRequired: undefined,
  
  // File load callback - update editor and log
  onFileLoad: (filename, content) => {
    console.log(`Loaded: ${filename}`);
    // Update editor content when a file is loaded
    if (dslEditor) {
      dslEditor.setValue(content);
    }
  },
  
  // Theme change callback - sync Monaco editor theme and control panel button
  onThemeChange: (theme: 'light' | 'dark') => {
    updateEditorTheme(theme);
    // Sync the control panel theme button
    if (themeBtnInControlPanel) {
      themeBtnInControlPanel.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    }
  },
  
  // Editor toggle callback - sync with our editorPanel
  onEditorToggle: (isOpen: boolean) => {
    if (isOpen) {
      editorPanel.open();
    } else {
      editorPanel.close();
    }
    // Resize Monaco editor after transition
    setTimeout(() => dslEditor?.editor.layout(), 250);
  },
});

// Set viewer reference for use in editorPanel.onToggle callback
viewerRef = viewer;

// ========================================
// Control Panel UI
// ========================================

// Create control panel UI
const controlPanel = createControlPanel();
document.body.appendChild(controlPanel);

// Add camera controls to panel
const cameraControls = createCameraControlsUI({
  initialMode: 'perspective',
  initialFov: 75,
  onModeChange: () => {
    viewer.cameraManager.toggleCameraMode();
  },
  onFovChange: (fov) => {
    if (viewer.perspectiveCamera) {
      viewer.perspectiveCamera.fov = fov;
      viewer.perspectiveCamera.updateProjectionMatrix();
    }
  },
  onIsometric: () => {
    viewer.cameraManager.setIsometricView();
  },
});
controlPanel.appendChild(cameraControls.element);

// Track light control values
let currentAzimuth = 45;
let currentElevation = 60;

// Helper to update light position from azimuth/elevation
function updateLightPosition(azimuth: number, elevation: number): void {
  const azRad = azimuth * Math.PI / 180;
  const elRad = elevation * Math.PI / 180;
  const distance = 20;
  
  const x = distance * Math.cos(elRad) * Math.sin(azRad);
  const y = distance * Math.sin(elRad);
  const z = distance * Math.cos(elRad) * Math.cos(azRad);
  
  if (viewer.light) {
    viewer.light.position.set(x, y, z);
  }
}

// Add light controls to panel
const lightControls = createLightControlsUI({
  initialAzimuth: currentAzimuth,
  initialElevation: currentElevation,
  initialIntensity: 1.0,
  onAzimuthChange: (azimuth) => {
    currentAzimuth = azimuth;
    updateLightPosition(currentAzimuth, currentElevation);
  },
  onElevationChange: (elevation) => {
    currentElevation = elevation;
    updateLightPosition(currentAzimuth, currentElevation);
  },
  onIntensityChange: (intensity) => {
    if (viewer.light) {
      viewer.light.intensity = intensity;
    }
  },
});
controlPanel.appendChild(lightControls.element);

// Add view controls (theme, exploded view) as a custom section
const viewSection = createControlPanelSection({
  title: 'View',
  id: 'view-section',
  collapsed: true,
});
const viewContent = getSectionContent(viewSection);

// Track theme button for sync
let themeBtnInControlPanel: HTMLButtonElement | null = null;

if (viewContent) {
  // Theme toggle button
  const themeRow = document.createElement('div');
  themeRow.className = 'fp-control-group';
  themeRow.innerHTML = `
    <div class="fp-control-row">
      <label class="fp-label">Theme</label>
    </div>
  `;
  
  themeBtnInControlPanel = document.createElement('button');
  themeBtnInControlPanel.className = 'fp-btn fp-btn-secondary';
  themeBtnInControlPanel.id = 'theme-toggle-btn';
  themeBtnInControlPanel.style.cssText = 'padding: 4px 12px; font-size: 11px; margin-top: 4px;';
  themeBtnInControlPanel.textContent = '🌙 Dark';
  themeBtnInControlPanel.addEventListener('click', () => {
    viewer.toggleTheme();
    const theme = viewer.theme;
    themeBtnInControlPanel!.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
    // Also sync Monaco editor
    updateEditorTheme(theme as 'light' | 'dark');
  });
  themeRow.appendChild(themeBtnInControlPanel);
  viewContent.appendChild(themeRow);
  
  // Exploded view slider
  const explodedSlider = createSliderControl({
    id: 'exploded-view',
    label: 'Exploded View',
    min: 0,
    max: 100,
    value: 0,
    step: 1,
    formatValue: (v) => `${Math.round(v)}%`,
    onChange: (value) => {
      viewer.setExplodedView(value / 100);
    },
  });
  viewContent.appendChild(explodedSlider.element);
}
controlPanel.appendChild(viewSection);

// Add floor controls to panel
const floorControls = createFloorControlsUI({
  onShowAll: () => viewer.floorManager.setAllFloorsVisible(true),
  onHideAll: () => viewer.floorManager.setAllFloorsVisible(false),
  onFloorToggle: (floorId, visible) => {
    viewer.floorManager.setFloorVisible(floorId, visible);
  },
});
controlPanel.appendChild(floorControls.element);

// Add 2D overlay control section
const overlay2DSection = createControlPanelSection({
  title: '2D Overlay',
  id: 'overlay-2d-section',
  collapsed: true,
});
const overlay2DContent = getSectionContent(overlay2DSection);

// Create 2D overlay UI element
const overlay2D = createOverlay2DUI({
  initialVisible: false,
  onClose: () => {
    if (overlay2DCheckbox) {
      overlay2DCheckbox.checked = false;
    }
  },
});
document.body.appendChild(overlay2D.element);

// Create checkbox control for overlay visibility
let overlay2DCheckbox: HTMLInputElement | null = null;
if (overlay2DContent) {
  const checkboxRow = document.createElement('div');
  checkboxRow.className = 'fp-checkbox-row';
  
  overlay2DCheckbox = document.createElement('input');
  overlay2DCheckbox.type = 'checkbox';
  overlay2DCheckbox.id = 'show-2d-overlay';
  overlay2DCheckbox.addEventListener('change', () => {
    if (overlay2DCheckbox?.checked) {
      overlay2D.show();
    } else {
      overlay2D.hide();
    }
  });
  
  const label = document.createElement('label');
  label.htmlFor = 'show-2d-overlay';
  label.textContent = 'Show 2D Mini-map';
  
  checkboxRow.appendChild(overlay2DCheckbox);
  checkboxRow.appendChild(label);
  overlay2DContent.appendChild(checkboxRow);
  
  // Opacity slider
  const opacitySlider = createSliderControl({
    id: 'overlay-opacity',
    label: 'Opacity',
    min: 20,
    max: 100,
    value: 60,
    step: 5,
    formatValue: (v) => `${Math.round(v)}%`,
    onChange: (value) => {
      overlay2D.element.style.opacity = String(value / 100);
    },
  });
  overlay2DContent.appendChild(opacitySlider.element);
}
controlPanel.appendChild(overlay2DSection);

// Add annotation controls
const annotationControls = createAnnotationControlsUI({
  onShowAreaChange: (show) => {
    viewer.annotationManager.state.showArea = show;
    viewer.annotationManager.updateAll();
  },
  onShowDimensionsChange: (show) => {
    viewer.annotationManager.state.showDimensions = show;
    viewer.annotationManager.updateAll();
  },
  onShowFloorSummaryChange: (show) => {
    viewer.annotationManager.state.showFloorSummary = show;
    viewer.annotationManager.updateAll();
    const summaryEl = document.getElementById('floor-summary');
    if (summaryEl) {
      summaryEl.classList.toggle('visible', show);
    }
  },
  onAreaUnitChange: (unit) => {
    viewer.annotationManager.state.areaUnit = unit;
    viewer.annotationManager.updateAll();
  },
  onLengthUnitChange: (unit) => {
    viewer.annotationManager.state.lengthUnit = unit;
    viewer.annotationManager.updateAll();
  },
});
controlPanel.appendChild(annotationControls.element);

// Expose for debugging
(window as unknown as { viewer: FloorplanApp }).viewer = viewer;

console.log('Floorplan 3D Viewer initialized');
console.log('Press ? or H for keyboard shortcuts');
console.log('Press ⌘K for command palette');
console.log('Press V to toggle selection mode');
