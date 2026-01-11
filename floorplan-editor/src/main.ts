/**
 * Interactive Floorplan Editor
 * 
 * A full-featured DSL editor with:
 * - Monaco code editor with live DSL editing
 * - 3D visualization with selection
 * - Bidirectional editor ↔ 3D sync
 * - Properties panel for editing
 * - Add room / delete functionality
 * - 2D overlay mini-map
 * - Export to multiple formats
 */

import { 
  createDslEditor, 
  monaco,
  Overlay2DManager,
  createValidationWarningsUI,
  createShortcutInfoUI,
  injectStyles,
} from 'floorplan-viewer-core';
import { EmptyFileSystem, URI, type LangiumDocument } from 'langium';
import { createFloorplansServices, convertFloorplanToJson, type Floorplan } from 'floorplan-language';
import { InteractiveEditor } from './interactive-editor.js';
import { EditorViewerSync } from './editor-viewer-sync.js';
import { PropertiesPanel } from './properties-panel.js';
import { dslPropertyEditor, dslGenerator } from './dsl-generator.js';
import type { JsonExport, JsonRoom, JsonConnection } from 'floorplan-3d-core';

// Inject shared styles
injectStyles();

// Sample DSL content
const sampleDsl = `%%{version: 1.0}%%
floorplan
  config {
    default_height: 2.8,
    wall_thickness: 0.15,
    floor_thickness: 0.1
  }
  
  floor GroundFloor {
    room LivingRoom at (0, 0) size (8 x 6) walls [top: solid, right: solid, bottom: solid, left: solid] 
    room Kitchen size (5 x 6) walls [top: solid, right: solid, bottom: solid, left: solid] right-of LivingRoom
    room DiningRoom size (5 x 6) walls [top: solid, right: open, bottom: solid, left: solid] right-of Kitchen
    room Bedroom at (0, 7) size (6 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Bathroom at (6.5, 7) size (4 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
    room Office at (11, 7) size (5 x 5) walls [top: solid, right: solid, bottom: solid, left: solid]
  }
  
  connect LivingRoom.right to Kitchen.left door at 50%
  connect Kitchen.right to DiningRoom.left door at 50%
`;

// Initialize Langium services
const services = createFloorplansServices(EmptyFileSystem);
const parser = services.Floorplans.parser.LangiumParser;

// Create Langium document for 2D rendering
let documentId = 1;
async function createLangiumDocument(input: string): Promise<LangiumDocument<Floorplan>> {
  const uri = URI.parse(`file:///floorplan-${documentId++}.fp`);
  const document = services.shared.workspace.LangiumDocumentFactory.fromString(input, uri);
  services.shared.workspace.LangiumDocuments.addDocument(document);
  await services.shared.workspace.DocumentBuilder.build([document]);
  return document as LangiumDocument<Floorplan>;
}

// State
let currentJsonData: JsonExport | null = null;
let currentLangiumDoc: LangiumDocument<Floorplan> | null = null;
let editorSync: EditorViewerSync | null = null;
let parseDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

// Create DSL editor
const dslEditor = createDslEditor({
  containerId: 'editor-container',
  initialContent: sampleDsl,
  theme: 'vs-dark',
  fontSize: 13,
  onChange: (content: string) => {
    // Debounce parsing
    if (parseDebounceTimeout) {
      clearTimeout(parseDebounceTimeout);
    }
    parseDebounceTimeout = setTimeout(() => {
      parseAndUpdate(content);
    }, 300);
  },
});

// Create 3D editor
const editor3d = new InteractiveEditor({
  containerId: 'app',
  enableSelection: true,
  selectionDebug: true,  // Enable debug logging for selection
});

// Create 2D overlay manager
const overlay2DManager = new Overlay2DManager({
  getCurrentTheme: () => 'dark', // Editor always uses dark theme
  getFloorplanData: () => currentJsonData,
  getVisibleFloorIds: () => editor3d.floorManager?.getVisibleFloorIds() ?? [],
});
overlay2DManager.setupControls();

// Create validation warnings panel
const validationWarningsUI = createValidationWarningsUI({
  left: '10px',
  top: '10px',
  onWarningClick: (warning) => {
    if (warning.line && dslEditor) {
      if (!editorPanelOpen) {
        editorPanelOpen = true;
        updateEditorPanelPosition();
      }
      dslEditor.goToLine(warning.line, warning.column || 1);
    }
  },
});
document.body.appendChild(validationWarningsUI.element);

// Helper to update properties panel position based on warnings panel height
function updatePropertiesPanelPosition(): void {
  const warningsEl = validationWarningsUI.element;
  const isWarningsVisible = warningsEl.style.display !== 'none';
  
  if (isWarningsVisible) {
    // Get the bottom of the warnings panel and add some margin
    const warningsRect = warningsEl.getBoundingClientRect();
    const newTop = warningsRect.bottom + 10; // 10px gap below warnings
    document.documentElement.style.setProperty('--properties-panel-top', `${newTop}px`);
  } else {
    // Reset to default position when warnings are hidden
    document.documentElement.style.setProperty('--properties-panel-top', '16px');
  }
}

// Watch for warnings panel size changes (collapse/expand)
const warningsObserver = new MutationObserver(() => {
  requestAnimationFrame(updatePropertiesPanelPosition);
});
warningsObserver.observe(validationWarningsUI.element, { 
  attributes: true, 
  attributeFilter: ['class', 'style'],
  childList: true,
  subtree: true
});

// Create shortcut info panel
const shortcutInfoUI = createShortcutInfoUI({
  title: 'Floorplan Editor',
});
document.body.appendChild(shortcutInfoUI.element);

// UI elements
const editorStatus = document.getElementById('editor-status');
const errorBanner = document.getElementById('error-banner');
const errorOverlay = document.getElementById('error-overlay');
const selectionInfo = document.getElementById('selection-info');
const containmentCheckbox = document.getElementById('containment-mode') as HTMLInputElement;
const modeIndicator = document.getElementById('mode-indicator');

// Editor panel state
const editorPanel = document.getElementById('editor-panel');
const editorToggle = document.getElementById('editor-panel-toggle');
const editorResizeHandle = document.getElementById('editor-resize-handle');
let editorPanelOpen = true;
let editorPanelWidth = 450;

function updateEditorPanelPosition() {
  if (!editorPanel) return;
  editorPanel.style.width = editorPanelWidth + 'px';
  editorPanel.style.transform = editorPanelOpen 
    ? 'translateX(0)' 
    : `translateX(-${editorPanelWidth}px)`;
  if (editorToggle) {
    editorToggle.textContent = editorPanelOpen ? '◀' : '▶';
  }
  
  // Toggle body class and set CSS variables
  document.body.classList.toggle('editor-open', editorPanelOpen);
  if (editorPanelOpen) {
    document.documentElement.style.setProperty('--editor-width', `${editorPanelWidth}px`);
    document.documentElement.style.setProperty('--layout-editor-width', `${editorPanelWidth}px`);
  } else {
    document.documentElement.style.setProperty('--layout-editor-width', '0px');
  }
  
  // Notify 2D overlay manager
  overlay2DManager.onEditorStateChanged(editorPanelOpen, editorPanelWidth);
}

editorToggle?.addEventListener('click', () => {
  editorPanelOpen = !editorPanelOpen;
  updateEditorPanelPosition();
});

// Editor resize functionality
let isResizing = false;

editorResizeHandle?.addEventListener('mousedown', (e) => {
  isResizing = true;
  editorPanel?.classList.add('resizing');
  editorResizeHandle?.classList.add('active');
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing || !editorPanel) return;
  const newWidth = Math.max(300, Math.min(window.innerWidth * 0.8, e.clientX));
  editorPanelWidth = newWidth;
  editorPanel.style.width = newWidth + 'px';
  editorPanel.style.transform = 'translateX(0)';
  document.documentElement.style.setProperty('--editor-width', `${newWidth}px`);
  document.documentElement.style.setProperty('--layout-editor-width', `${newWidth}px`);
});

document.addEventListener('mouseup', () => {
  if (!isResizing) return;
  isResizing = false;
  editorPanel?.classList.remove('resizing');
  editorResizeHandle?.classList.remove('active');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// Initialize position
updateEditorPanelPosition();

/**
 * Parse DSL and update 3D view
 */
async function parseAndUpdate(content: string) {
  try {
    // Parse the DSL
    const parseResult = parser.parse(content);
    
    if (parseResult.lexerErrors.length > 0 || parseResult.parserErrors.length > 0) {
      const errors = [
        ...parseResult.lexerErrors.map((e: { line?: number; column?: number; message: string }) => ({
          line: e.line ?? 1,
          column: e.column ?? 1,
          message: e.message,
        })),
        ...parseResult.parserErrors.map((e: { token?: { startLine?: number; startColumn?: number }; message: string }) => ({
          line: e.token?.startLine ?? 1,
          column: e.token?.startColumn ?? 1,
          message: e.message,
        })),
      ];
      
      showError(errors[0].message);
      dslEditor.setErrorMarkers(errors);
      if (editorStatus) {
        editorStatus.textContent = `${errors.length} error(s)`;
        editorStatus.className = 'fp-editor-status error';
      }
      editor3d.setErrorState(true);
      validationWarningsUI.clear();
      return;
    }
    
    // Convert to JSON - cast to expected type
    const conversionResult = convertFloorplanToJson(parseResult.value as Parameters<typeof convertFloorplanToJson>[0]);
    
    if (conversionResult.errors.length > 0) {
      showError(conversionResult.errors[0].message);
      if (editorStatus) {
        editorStatus.textContent = 'Conversion error';
        editorStatus.className = 'fp-editor-status error';
      }
      editor3d.setErrorState(true);
      validationWarningsUI.clear();
      return;
    }
    
    // Success - update 3D view
    currentJsonData = conversionResult.data as JsonExport;
    editor3d.loadFloorplan(currentJsonData);
    
    // Create Langium document for 2D overlay and validation
    try {
      currentLangiumDoc = await createLangiumDocument(content);
      overlay2DManager.setLangiumDocument(currentLangiumDoc);
      
      // Run validation
      const validationDiagnostics = await services.Floorplans.validation.DocumentValidator.validateDocument(currentLangiumDoc);
      const warnings = validationDiagnostics
        .filter((diag) => (diag.severity ?? 0) === 2)
        .map((diag) => ({
          message: diag.message,
          line: diag.range ? diag.range.start.line + 1 : undefined,
          column: diag.range ? diag.range.start.character + 1 : undefined,
        }));
      
      validationWarningsUI.update(warnings);
      // Update properties panel position after warnings update
      requestAnimationFrame(updatePropertiesPanelPosition);
    } catch (docErr) {
      console.warn('Failed to create Langium document:', docErr);
      currentLangiumDoc = null;
      overlay2DManager.setLangiumDocument(null);
      validationWarningsUI.clear();
      // Update properties panel position after warnings clear
      requestAnimationFrame(updatePropertiesPanelPosition);
    }
    
    // Update entity locations for sync
    if (editorSync) {
      const entityLocations = extractEntityLocations(currentJsonData);
      editorSync.updateEntityLocations(entityLocations);
    }
    
    // Clear errors
    hideError();
    dslEditor.clearErrorMarkers();
    if (editorStatus) {
      editorStatus.textContent = 'Ready';
      editorStatus.className = 'fp-editor-status success';
    }
    
  } catch (err) {
    showError((err as Error).message);
    if (editorStatus) {
      editorStatus.textContent = 'Parse error';
      editorStatus.className = 'fp-editor-status error';
    }
    editor3d.setErrorState(true);
    validationWarningsUI.clear();
  }
}

/**
 * Extract entity locations from JSON for editor sync
 */
function extractEntityLocations(jsonData: JsonExport) {
  const locations: Array<{
    entityType: string;
    entityId: string;
    floorId: string;
    sourceRange: { startLine: number; startColumn: number; endLine: number; endColumn: number };
  }> = [];
  
  for (const floor of jsonData.floors) {
    for (const room of floor.rooms) {
      if ((room as JsonRoom & { _sourceRange?: unknown })._sourceRange) {
        locations.push({
          entityType: 'room',
          entityId: room.name,
          floorId: floor.id,
          sourceRange: (room as JsonRoom & { _sourceRange: { startLine: number; startColumn: number; endLine: number; endColumn: number } })._sourceRange,
        });
      }
      
      for (const wall of room.walls || []) {
        const wallWithSource = wall as typeof wall & { _sourceRange?: { startLine: number; startColumn: number; endLine: number; endColumn: number } };
        if (wallWithSource._sourceRange) {
          locations.push({
            entityType: 'wall',
            entityId: `${room.name}_${wall.direction}`,
            floorId: floor.id,
            sourceRange: wallWithSource._sourceRange,
          });
        }
      }
    }
  }
  
  for (const conn of jsonData.connections) {
    const connWithSource = conn as JsonConnection & { _sourceRange?: { startLine: number; startColumn: number; endLine: number; endColumn: number } };
    if (connWithSource._sourceRange) {
      locations.push({
        entityType: 'connection',
        entityId: `${conn.fromRoom}-${conn.toRoom}`,
        floorId: jsonData.floors[0]?.id ?? 'default',
        sourceRange: connWithSource._sourceRange,
      });
    }
  }
  
  return locations;
}

function showError(message: string) {
  if (errorBanner) {
    errorBanner.textContent = message;
    errorBanner.classList.add('visible');
  }
  errorOverlay?.classList.add('visible');
  // Note: fp-error-banner and fp-error-overlay use 'visible' class from shared-styles.css
}

function hideError() {
  errorBanner?.classList.remove('visible');
  errorOverlay?.classList.remove('visible');
}

function updateSelectionInfo(selection: ReadonlySet<{ entityType: string; entityId: string }>) {
  const count = selection.size;
  
  if (!selectionInfo) return;
  
  if (count === 0) {
    selectionInfo.innerHTML = '<div class="details">No selection</div>';
    selectionInfo.classList.remove('fp-has-selection', 'visible');
  } else {
    const types = new Map<string, number>();
    for (const obj of selection) {
      types.set(obj.entityType, (types.get(obj.entityType) || 0) + 1);
    }
    
    const summary = Array.from(types.entries())
      .map(([type, cnt]) => `${cnt} ${type}${cnt > 1 ? 's' : ''}`)
      .join(', ');
    
    let names = '';
    if (count <= 3) {
      names = Array.from(selection).map(s => s.entityId).join(', ');
    }
    
    selectionInfo.innerHTML = `
      <div class="fp-selection-count">${count}</div>
      <div class="fp-selection-details">${summary}</div>
      ${names ? `<div class="fp-selection-details" style="margin-top: 4px; color: #00ff00;">${names}</div>` : ''}
    `;
    selectionInfo.classList.add('fp-has-selection', 'visible');
  }
}

// Setup selection manager listeners
if (editor3d.selectionManager) {
  editor3d.selectionManager.onSelectionChange((event) => {
    updateSelectionInfo(event.selection);
    updatePropertiesPanel(event.selection);
  });
  
  editor3d.selectionManager.onEnterPressed(() => {
    const propertiesPanelEl = document.getElementById('properties-panel');
    if (propertiesPanelEl && propertiesPanelEl.style.display !== 'none') {
      const firstInput = propertiesPanelEl.querySelector('input, select');
      if (firstInput instanceof HTMLElement) {
        firstInput.focus();
      }
    }
  });
  
  // Setup bidirectional sync
  editorSync = new EditorViewerSync(
    dslEditor.editor,
    editor3d.selectionManager,
    { debug: true }  // Enable debug logging to diagnose selection issues
  );
  
  // Handle editor cursor → 3D selection
  editorSync.onEditorSelect((entityKey, isAdditive) => {
    const parts = entityKey.split(':');
    if (parts.length !== 3) return;
    
    const [floorId, entityType, entityId] = parts;
    const registry = editor3d.meshRegistry;
    const entities = registry.getAllEntities();
    
    for (const entity of entities) {
      if (entity.floorId === floorId && 
          entity.entityType === entityType && 
          entity.entityId === entityId) {
        editor3d.selectionManager?.select(entity, isAdditive);
        break;
      }
    }
  });
  
  // Handle editor text highlight → 3D preview
  editorSync.onEditorHighlight((entityKeys) => {
    editor3d.selectionManager?.clearHighlight();
    
    const registry = editor3d.meshRegistry;
    const entities = registry.getAllEntities();
    
    for (const entityKey of entityKeys) {
      const parts = entityKey.split(':');
      if (parts.length !== 3) continue;
      
      const [floorId, entityType, entityId] = parts;
      
      for (const entity of entities) {
        if (entity.floorId === floorId && 
            entity.entityType === entityType && 
            entity.entityId === entityId) {
          editor3d.selectionManager?.highlight(entity);
          break;
        }
      }
    }
  });
  
  editorSync.onEditorHighlightClear(() => {
    editor3d.selectionManager?.clearHighlight();
  });
}

// Properties Panel
const propertiesPanel = new PropertiesPanel({
  container: 'properties-panel',
  onPropertyChange: (event) => {
    const sourceText = dslEditor.getValue();
    
    if (!event.sourceRange) {
      console.warn('Cannot edit: no source range available');
      return;
    }
    
    let editOp = null;
    
    if (event.entityType === 'room') {
      editOp = dslPropertyEditor.generateRoomPropertyEdit(
        sourceText,
        event.sourceRange,
        event.property,
        event.newValue
      );
    } else if (event.entityType === 'wall') {
      editOp = dslPropertyEditor.generateWallPropertyEdit(
        sourceText,
        event.sourceRange,
        event.property,
        event.newValue
      );
    } else if (event.entityType === 'connection') {
      editOp = dslPropertyEditor.generateConnectionPropertyEdit(
        sourceText,
        event.sourceRange,
        event.property,
        event.newValue
      );
    }
    
    if (editOp) {
      const monacoEditor = dslEditor.editor;
      const model = monacoEditor.getModel();
      
      if (model) {
        model.pushEditOperations(
          [],
          [{
            range: {
              startLineNumber: editOp.range.startLineNumber,
              startColumn: editOp.range.startColumn,
              endLineNumber: editOp.range.endLineNumber,
              endColumn: editOp.range.endColumn,
            },
            text: editOp.text,
          }],
          () => null
        );
      }
    }
  },
  onDelete: (event) => {
    showDeleteConfirmation(event);
  },
});

function updatePropertiesPanel(selection: ReadonlySet<{ entityType: string; entityId: string; floorId: string; sourceRange?: unknown }>) {
  if (selection.size === 1) {
    const entity = Array.from(selection)[0];
    
    let entityData: Record<string, unknown> = {};
    if (currentJsonData) {
      if (entity.entityType === 'room') {
        for (const floor of currentJsonData.floors) {
          const room = floor.rooms.find(r => r.name === entity.entityId);
          if (room) {
            entityData = {
              name: room.name,
              x: room.x,
              y: room.z,
              width: room.width,
              height: room.height,
              roomHeight: room.roomHeight,
              style: room.style,
            };
            break;
          }
        }
      } else if (entity.entityType === 'wall') {
        const match = entity.entityId.match(/^(.+)_(top|bottom|left|right)$/);
        if (match) {
          entityData = {
            room: match[1],
            direction: match[2],
            type: 'solid',
          };
        }
      } else if (entity.entityType === 'connection') {
        const parts = entity.entityId.split('-');
        if (parts.length >= 2) {
          const conn = currentJsonData.connections?.find(
            c => c.fromRoom === parts[0] && c.toRoom === parts.slice(1).join('-')
          );
          entityData = {
            fromRoom: parts[0],
            toRoom: parts.slice(1).join('-'),
            type: conn?.doorType ?? 'door',
            position: conn?.position ?? 50,
          };
        }
      }
    }
    
    propertiesPanel.show(entity as Parameters<typeof propertiesPanel.show>[0], entityData);
  } else {
    propertiesPanel.hide();
  }
}

// Mode toggle
containmentCheckbox?.addEventListener('change', (e) => {
  const mode = (e.target as HTMLInputElement).checked ? 'containment' : 'intersection';
  editor3d.setMarqueeMode(mode);
  if (modeIndicator) {
    modeIndicator.textContent = mode === 'containment' ? 'Containment' : 'Intersection';
    modeIndicator.style.color = mode === 'containment' ? '#ff9500' : '#4a9eff';
  }
});

// Selection mode toggle
const selectionEnabledCheckbox = document.getElementById('selection-enabled') as HTMLInputElement;
const selectionStatus = document.getElementById('selection-status');

function updateSelectionModeUI(enabled: boolean) {
  if (selectionEnabledCheckbox) selectionEnabledCheckbox.checked = enabled;
  if (selectionStatus) {
    if (enabled) {
      selectionStatus.textContent = '✓ Selection Mode Active (press V to toggle)';
      selectionStatus.style.background = 'rgba(0, 255, 0, 0.15)';
      selectionStatus.style.borderColor = 'rgba(0, 255, 0, 0.4)';
      selectionStatus.style.color = '#0f0';
    } else {
      selectionStatus.textContent = '✗ Selection Mode Off (press V to toggle)';
      selectionStatus.style.background = 'rgba(255, 100, 0, 0.15)';
      selectionStatus.style.borderColor = 'rgba(255, 100, 0, 0.4)';
      selectionStatus.style.color = '#f60';
    }
  }
}

selectionEnabledCheckbox?.addEventListener('change', (e) => {
  const enabled = (e.target as HTMLInputElement).checked;
  editor3d.selectionManager?.setEnabled(enabled);
  updateSelectionModeUI(enabled);
});

if (editor3d.selectionManager) {
  editor3d.selectionManager.onModeChange((enabled) => {
    updateSelectionModeUI(enabled);
  });
}

// Initialize mode from saved preference
try {
  const savedMode = localStorage.getItem('floorplan-marquee-mode');
  if (savedMode === 'containment' && containmentCheckbox) {
    containmentCheckbox.checked = true;
    editor3d.setMarqueeMode('containment');
    if (modeIndicator) {
      modeIndicator.textContent = 'Containment';
      modeIndicator.style.color = '#ff9500';
    }
  }
} catch {
  // Ignore localStorage errors
}

// ========================================
// Control Panel Wiring
// ========================================

// Section collapse/expand
document.querySelectorAll('.fp-section-header').forEach(header => {
  header.addEventListener('click', () => {
    header.parentElement?.classList.toggle('collapsed');
  });
});

// Camera controls
const cameraModeBtn = document.getElementById('camera-mode-btn');
const isometricBtn = document.getElementById('isometric-btn');
const fovSlider = document.getElementById('fov-slider') as HTMLInputElement;
const fovValue = document.getElementById('fov-value');
const fovGroup = document.getElementById('fov-group');

cameraModeBtn?.addEventListener('click', () => {
  editor3d.cameraManager.toggleCameraMode();
  const mode = editor3d.cameraManager.getMode();
  cameraModeBtn.textContent = mode === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective';
  if (fovGroup) fovGroup.style.display = mode === 'perspective' ? '' : 'none';
});

isometricBtn?.addEventListener('click', () => {
  editor3d.cameraManager.setIsometricView();
});

fovSlider?.addEventListener('input', () => {
  const fov = parseInt(fovSlider.value);
  if (fovValue) fovValue.textContent = `${fov}°`;
  if (editor3d.perspectiveCamera) {
    editor3d.perspectiveCamera.fov = fov;
    editor3d.perspectiveCamera.updateProjectionMatrix();
  }
});

// Lighting controls
const lightAzimuth = document.getElementById('light-azimuth') as HTMLInputElement;
const lightAzimuthValue = document.getElementById('light-azimuth-value');
const lightElevation = document.getElementById('light-elevation') as HTMLInputElement;
const lightElevationValue = document.getElementById('light-elevation-value');
const lightIntensity = document.getElementById('light-intensity') as HTMLInputElement;
const lightIntensityValue = document.getElementById('light-intensity-value');

function updateLightPosition() {
  const azimuth = parseFloat(lightAzimuth?.value || '45') * Math.PI / 180;
  const elevation = parseFloat(lightElevation?.value || '60') * Math.PI / 180;
  const distance = 20;
  
  const x = distance * Math.cos(elevation) * Math.sin(azimuth);
  const y = distance * Math.sin(elevation);
  const z = distance * Math.cos(elevation) * Math.cos(azimuth);
  
  if (editor3d.light) {
    editor3d.light.position.set(x, y, z);
  }
}

lightAzimuth?.addEventListener('input', () => {
  if (lightAzimuthValue) lightAzimuthValue.textContent = `${lightAzimuth.value}°`;
  updateLightPosition();
});

lightElevation?.addEventListener('input', () => {
  if (lightElevationValue) lightElevationValue.textContent = `${lightElevation.value}°`;
  updateLightPosition();
});

lightIntensity?.addEventListener('input', () => {
  const intensity = parseFloat(lightIntensity.value);
  if (lightIntensityValue) lightIntensityValue.textContent = intensity.toFixed(1);
  if (editor3d.light) {
    editor3d.light.intensity = intensity;
  }
});

// Theme toggle
const themeToggleBtn = document.getElementById('theme-toggle-btn');
let currentTheme = 'dark';

themeToggleBtn?.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.body.classList.toggle('dark-theme', currentTheme === 'dark');
  editor3d.setTheme(currentTheme as 'dark' | 'light');
  monaco.editor.setTheme(currentTheme === 'dark' ? 'vs-dark' : 'vs');
  themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
  overlay2DManager.render();
});

// Exploded view
const explodedView = document.getElementById('exploded-view') as HTMLInputElement;
const explodedValue = document.getElementById('exploded-value');

explodedView?.addEventListener('input', () => {
  const value = parseInt(explodedView.value);
  if (explodedValue) explodedValue.textContent = `${value}%`;
  editor3d.setExplodedView(value / 100);
});

// Floor visibility
const floorList = document.getElementById('floor-list');
const showAllFloorsBtn = document.getElementById('show-all-floors');
const hideAllFloorsBtn = document.getElementById('hide-all-floors');

function updateFloorListUI() {
  const floors = editor3d.floors;
  const floorManager = editor3d.floorManager;
  
  if (!floorList || !floors || floors.length === 0) {
    if (floorList) floorList.innerHTML = '<div class="no-floors-message">Floors will appear here</div>';
    return;
  }
  
  floorList.innerHTML = '';
  floors.forEach((floor, index) => {
    const floorId = floor.name || `floor-${index}`;
    const visible = floorManager ? floorManager.getFloorVisibility(floorId) : true;
    
    const item = document.createElement('div');
    item.className = 'fp-floor-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `floor-toggle-${index}`;
    checkbox.checked = visible;
    checkbox.addEventListener('change', () => {
      if (floorManager) {
        floorManager.setFloorVisible(floorId, checkbox.checked);
        overlay2DManager.render();
      }
    });
    
    const label = document.createElement('label');
    label.htmlFor = `floor-toggle-${index}`;
    label.textContent = floorId;
    
    item.appendChild(checkbox);
    item.appendChild(label);
    floorList.appendChild(item);
  });
}

showAllFloorsBtn?.addEventListener('click', () => {
  editor3d.floorManager?.setAllFloorsVisible(true);
  updateFloorListUI();
  overlay2DManager.render();
});

hideAllFloorsBtn?.addEventListener('click', () => {
  editor3d.floorManager?.setAllFloorsVisible(false);
  updateFloorListUI();
  overlay2DManager.render();
});

// 2D Overlay controls
const show2dOverlay = document.getElementById('show-2d-overlay') as HTMLInputElement;
const overlayOpacity = document.getElementById('overlay-opacity') as HTMLInputElement;
const overlayOpacityValue = document.getElementById('overlay-opacity-value');
const overlay2d = document.getElementById('overlay-2d');
const overlay2dClose = document.getElementById('overlay-2d-close');

show2dOverlay?.addEventListener('change', () => {
  overlay2d?.classList.toggle('visible', show2dOverlay.checked);
  if (show2dOverlay.checked) {
    overlay2DManager.render();
  }
});

overlayOpacity?.addEventListener('input', () => {
  const opacity = parseInt(overlayOpacity.value);
  if (overlayOpacityValue) overlayOpacityValue.textContent = `${opacity}%`;
  if (overlay2d) overlay2d.style.opacity = String(opacity / 100);
});

overlay2dClose?.addEventListener('click', () => {
  overlay2d?.classList.remove('visible');
  if (show2dOverlay) show2dOverlay.checked = false;
});

// Annotation controls
const showArea = document.getElementById('show-area') as HTMLInputElement;
const showDimensions = document.getElementById('show-dimensions') as HTMLInputElement;
const showFloorSummary = document.getElementById('show-floor-summary') as HTMLInputElement;
const areaUnit = document.getElementById('area-unit') as HTMLSelectElement;
const lengthUnit = document.getElementById('length-unit') as HTMLSelectElement;
const floorSummary = document.getElementById('floor-summary');

function updateAnnotations() {
  if (editor3d.annotationManager) {
    editor3d.annotationManager.state.showArea = showArea?.checked || false;
    editor3d.annotationManager.state.showDimensions = showDimensions?.checked || false;
    editor3d.annotationManager.state.showFloorSummary = showFloorSummary?.checked || false;
    editor3d.annotationManager.state.areaUnit = (areaUnit?.value as 'sqft' | 'sqm') || 'sqft';
    editor3d.annotationManager.state.lengthUnit = (lengthUnit?.value as 'ft' | 'm' | 'cm' | 'in' | 'mm') || 'ft';
    editor3d.annotationManager.updateAll();
  }
}

showArea?.addEventListener('change', updateAnnotations);
showDimensions?.addEventListener('change', updateAnnotations);
showFloorSummary?.addEventListener('change', () => {
  floorSummary?.classList.toggle('visible', showFloorSummary.checked);
  updateAnnotations();
});
areaUnit?.addEventListener('change', updateAnnotations);
lengthUnit?.addEventListener('change', updateAnnotations);

// Update floor list when floorplan is loaded
const originalLoadFloorplan = editor3d.loadFloorplan.bind(editor3d);
editor3d.loadFloorplan = function(data: JsonExport) {
  originalLoadFloorplan(data);
  setTimeout(updateFloorListUI, 100);
};

// ========================================
// Export functionality
// ========================================

const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
let currentFilename = 'floorplan';

exportBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = exportMenu?.classList.toggle('visible');
  exportBtn.setAttribute('aria-expanded', String(isOpen));
});

document.addEventListener('click', () => {
  exportMenu?.classList.remove('visible');
  exportBtn?.setAttribute('aria-expanded', 'false');
});

exportMenu?.addEventListener('click', async (e) => {
  const item = (e.target as HTMLElement).closest('.fp-export-menu-item');
  if (!item) return;
  
  const format = (item as HTMLElement).dataset.format;
  exportMenu.classList.remove('visible');
  
  try {
    switch (format) {
      case 'dsl': exportDsl(); break;
      case 'json': exportJson(); break;
      case 'glb': await exportGlb(); break;
      case 'gltf': await exportGltf(); break;
    }
  } catch (err) {
    alert(`Export failed: ${(err as Error).message}`);
  }
});

function exportDsl() {
  const content = dslEditor.getValue();
  downloadFile(`${currentFilename}.floorplan`, content, 'text/plain');
}

function exportJson() {
  if (!currentJsonData) {
    alert('No valid floorplan data to export.');
    return;
  }
  
  const cleanData = JSON.parse(JSON.stringify(currentJsonData));
  removeSourceRanges(cleanData);
  
  const content = JSON.stringify(cleanData, null, 2);
  downloadFile(`${currentFilename}.json`, content, 'application/json');
}

function removeSourceRanges(obj: unknown) {
  if (Array.isArray(obj)) {
    obj.forEach(removeSourceRanges);
  } else if (obj && typeof obj === 'object') {
    delete (obj as Record<string, unknown>)._sourceRange;
    Object.values(obj).forEach(removeSourceRanges);
  }
}

async function exportGlb() {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();
  
  const scene = editor3d.scene;
  if (!scene) {
    alert('No 3D scene to export');
    return;
  }
  
  exporter.parse(
    scene,
    (result) => {
      const blob = new Blob([result as ArrayBuffer], { type: 'application/octet-stream' });
      downloadBlob(`${currentFilename}.glb`, blob);
    },
    (error) => { throw error; },
    { binary: true }
  );
}

async function exportGltf() {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();
  
  const scene = editor3d.scene;
  if (!scene) {
    alert('No 3D scene to export');
    return;
  }
  
  exporter.parse(
    scene,
    (result) => {
      const content = JSON.stringify(result, null, 2);
      downloadFile(`${currentFilename}.gltf`, content, 'model/gltf+json');
    },
    (error) => { throw error; },
    { binary: false }
  );
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========================================
// Add Room functionality
// ========================================

const addRoomBtn = document.getElementById('add-room-btn');
const addRoomDialog = document.getElementById('add-room-dialog');
const addRoomCancel = document.getElementById('add-room-cancel');
const addRoomConfirm = document.getElementById('add-room-confirm');
const addRoomError = document.getElementById('add-room-error');
const roomNameInput = document.getElementById('room-name') as HTMLInputElement;
const roomXInput = document.getElementById('room-x') as HTMLInputElement;
const roomYInput = document.getElementById('room-y') as HTMLInputElement;
const roomWidthInput = document.getElementById('room-width') as HTMLInputElement;
const roomHeightInput = document.getElementById('room-height') as HTMLInputElement;

addRoomBtn?.addEventListener('click', () => {
  if (roomNameInput) roomNameInput.value = '';
  if (roomXInput) roomXInput.value = '0';
  if (roomYInput) roomYInput.value = '0';
  if (roomWidthInput) roomWidthInput.value = '4';
  if (roomHeightInput) roomHeightInput.value = '4';
  addRoomError?.classList.remove('fp-visible');
  if (addRoomError) addRoomError.textContent = '';
  
  addRoomDialog?.classList.add('visible');
  roomNameInput?.focus();
});

addRoomCancel?.addEventListener('click', () => {
  addRoomDialog?.classList.remove('visible');
});

addRoomDialog?.addEventListener('click', (e) => {
  if (e.target === addRoomDialog) {
    addRoomDialog.classList.remove('visible');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && addRoomDialog?.classList.contains('visible')) {
    addRoomDialog.classList.remove('visible');
  }
});

addRoomConfirm?.addEventListener('click', addRoom);

roomNameInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addRoom();
});

function addRoom() {
  const name = roomNameInput?.value.trim();
  if (!name) {
    showAddRoomError('Room name is required');
    roomNameInput?.focus();
    return;
  }
  
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
    showAddRoomError('Room name must start with a letter and contain only letters, numbers, and underscores');
    roomNameInput?.focus();
    return;
  }
  
  if (currentJsonData) {
    const existingNames = new Set<string>();
    for (const floor of currentJsonData.floors) {
      for (const room of floor.rooms) {
        existingNames.add(room.name);
      }
    }
    if (existingNames.has(name)) {
      showAddRoomError(`Room '${name}' already exists`);
      roomNameInput?.focus();
      return;
    }
  }
  
  const x = parseFloat(roomXInput?.value || '0') || 0;
  const y = parseFloat(roomYInput?.value || '0') || 0;
  const width = parseFloat(roomWidthInput?.value || '4') || 4;
  const height = parseFloat(roomHeightInput?.value || '4') || 4;
  
  if (width < 0.5 || height < 0.5) {
    showAddRoomError('Width and height must be at least 0.5');
    return;
  }
  
  const roomDsl = dslGenerator.generateRoom({ name, x, y, width, height });
  
  const insertPoint = findRoomInsertionPoint();
  if (!insertPoint) {
    showAddRoomError('Could not find floor block to add room');
    return;
  }
  
  const model = dslEditor.editor.getModel();
  if (model) {
    model.pushEditOperations(
      [],
      [{
        range: {
          startLineNumber: insertPoint.line,
          startColumn: insertPoint.column,
          endLineNumber: insertPoint.line,
          endColumn: insertPoint.column,
        },
        text: '\n' + roomDsl,
      }],
      () => null
    );
  }
  
  addRoomDialog?.classList.remove('visible');
}

function findRoomInsertionPoint(): { line: number; column: number } | null {
  const content = dslEditor.getValue();
  const lines = content.split('\n');
  
  let lastRoomLine = -1;
  let floorStarted = false;
  let floorIndent = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (/^\s*floor\s+\S+/.test(line)) {
      floorStarted = true;
      const match = line.match(/^(\s*)/);
      floorIndent = match ? match[1].length : 0;
    }
    
    if (floorStarted && /^\s*room\s+\S+/.test(line)) {
      lastRoomLine = i;
    }
    
    if (floorStarted && line.trim() === '}') {
      const match = line.match(/^(\s*)/);
      const braceIndent = match ? match[1].length : 0;
      if (braceIndent === floorIndent) {
        break;
      }
    }
  }
  
  if (lastRoomLine === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*floor\s+\S+.*\{/.test(lines[i])) {
        return { line: i + 2, column: 1 };
      }
    }
    return null;
  }
  
  return { line: lastRoomLine + 2, column: 1 };
}

function showAddRoomError(message: string) {
  if (addRoomError) {
    addRoomError.textContent = message;
    addRoomError.classList.add('fp-visible');
  }
}

// ========================================
// Delete functionality
// ========================================

const deleteConfirmDialog = document.getElementById('delete-confirm-dialog');
const deleteEntityName = document.getElementById('delete-entity-name');
const deleteMessage = document.getElementById('delete-message');
const deleteWarning = document.getElementById('delete-warning');
const deleteCascadeList = document.getElementById('delete-cascade-list');
const deleteCancel = document.getElementById('delete-cancel');
const deleteConfirmBtn = document.getElementById('delete-confirm');

let pendingDeleteEvent: { entityType: string; entityId: string; sourceRange?: unknown } | null = null;
let pendingCascadeConnections: JsonConnection[] = [];

function showDeleteConfirmation(event: { entityType: string; entityId: string; sourceRange?: unknown }) {
  pendingDeleteEvent = event;
  pendingCascadeConnections = [];
  
  if (deleteEntityName) {
    deleteEntityName.textContent = `${event.entityType}: ${event.entityId}`;
  }
  
  if (event.entityType === 'room') {
    if (deleteMessage) {
      deleteMessage.textContent = `Are you sure you want to delete the room "${event.entityId}"?`;
    }
    
    if (currentJsonData?.connections) {
      const affectedConnections = currentJsonData.connections.filter(
        conn => conn.fromRoom === event.entityId || conn.toRoom === event.entityId
      );
      
      if (affectedConnections.length > 0) {
        pendingCascadeConnections = affectedConnections;
        if (deleteCascadeList) {
          deleteCascadeList.innerHTML = affectedConnections.map(
            conn => `<li>${conn.fromRoom} → ${conn.toRoom} (${conn.doorType})</li>`
          ).join('');
        }
        if (deleteWarning) deleteWarning.style.display = 'block';
      } else {
        if (deleteWarning) deleteWarning.style.display = 'none';
      }
    } else {
      if (deleteWarning) deleteWarning.style.display = 'none';
    }
  } else if (event.entityType === 'wall') {
    const match = event.entityId.match(/^(.+)_(top|bottom|left|right)$/);
    const direction = match ? match[2] : 'wall';
    if (deleteMessage) {
      deleteMessage.textContent = `This will change the ${direction} wall to "open" (removing the wall). Continue?`;
    }
    if (deleteWarning) deleteWarning.style.display = 'none';
  } else if (event.entityType === 'connection') {
    if (deleteMessage) {
      deleteMessage.textContent = `Are you sure you want to delete this connection?`;
    }
    if (deleteWarning) deleteWarning.style.display = 'none';
  } else {
    if (deleteMessage) {
      deleteMessage.textContent = `Are you sure you want to delete "${event.entityId}"?`;
    }
    if (deleteWarning) deleteWarning.style.display = 'none';
  }
  
  deleteConfirmDialog?.classList.add('visible');
}

deleteCancel?.addEventListener('click', () => {
  deleteConfirmDialog?.classList.remove('visible');
  pendingDeleteEvent = null;
  pendingCascadeConnections = [];
});

deleteConfirmDialog?.addEventListener('click', (e) => {
  if (e.target === deleteConfirmDialog) {
    deleteConfirmDialog.classList.remove('visible');
    pendingDeleteEvent = null;
    pendingCascadeConnections = [];
  }
});

deleteConfirmBtn?.addEventListener('click', () => {
  if (pendingDeleteEvent) {
    executeDelete(pendingDeleteEvent, pendingCascadeConnections);
  }
  deleteConfirmDialog?.classList.remove('visible');
  pendingDeleteEvent = null;
  pendingCascadeConnections = [];
});

function executeDelete(event: { entityType: string; entityId: string; sourceRange?: unknown }, cascadeConnections: JsonConnection[]) {
  const model = dslEditor.editor.getModel();
  if (!model) return;
  
  if (event.entityType === 'wall') {
    executeWallToOpen(event);
    return;
  }
  
  const rangesToDelete: Array<{
    range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    description: string;
  }> = [];
  
  if (event.sourceRange) {
    rangesToDelete.push({
      range: event.sourceRange as { startLine: number; startColumn: number; endLine: number; endColumn: number },
      description: `${event.entityType}: ${event.entityId}`,
    });
  }
  
  for (const conn of cascadeConnections) {
    const connWithSource = conn as JsonConnection & { _sourceRange?: { startLine: number; startColumn: number; endLine: number; endColumn: number } };
    if (connWithSource._sourceRange) {
      rangesToDelete.push({
        range: connWithSource._sourceRange,
        description: `connection: ${conn.fromRoom} → ${conn.toRoom}`,
      });
    }
  }
  
  if (rangesToDelete.length === 0) {
    console.warn('No source ranges available for deletion');
    return;
  }
  
  rangesToDelete.sort((a, b) => {
    if (a.range.endLine !== b.range.endLine) {
      return b.range.endLine - a.range.endLine;
    }
    return b.range.endColumn - a.range.endColumn;
  });
  
  const edits = rangesToDelete.map(({ range }) => ({
    range: {
      startLineNumber: range.startLine + 1,
      startColumn: range.startColumn + 1,
      endLineNumber: range.endLine + 1,
      endColumn: range.endColumn + 2,
    },
    text: '',
  }));
  
  model.pushEditOperations([], edits, () => null);
  
  editor3d.selectionManager?.deselect();
  propertiesPanel.hide();
}

function executeWallToOpen(event: { sourceRange?: unknown }) {
  if (!event.sourceRange) {
    console.warn('No source range for wall');
    return;
  }
  
  const model = dslEditor.editor.getModel();
  if (!model) return;
  
  const sourceText = dslEditor.getValue();
  const editOp = dslPropertyEditor.generateWallPropertyEdit(
    sourceText,
    event.sourceRange as { startLine: number; startColumn: number; endLine: number; endColumn: number },
    'type',
    'open'
  );
  
  if (!editOp) {
    console.warn('Could not generate wall type edit');
    return;
  }
  
  model.pushEditOperations([], [{
    range: {
      startLineNumber: editOp.range.startLineNumber,
      startColumn: editOp.range.startColumn,
      endLineNumber: editOp.range.endLineNumber,
      endColumn: editOp.range.endColumn,
    },
    text: editOp.text,
  }], () => null);
  
  editor3d.selectionManager?.deselect();
  propertiesPanel.hide();
}

// Keyboard help overlay
const keyboardHelpOverlay = document.getElementById('keyboard-help-overlay');
const keyboardHelpClose = keyboardHelpOverlay?.querySelector('.keyboard-help-close');

keyboardHelpClose?.addEventListener('click', () => {
  if (keyboardHelpOverlay) keyboardHelpOverlay.style.display = 'none';
});

keyboardHelpOverlay?.addEventListener('click', (e) => {
  if (e.target === keyboardHelpOverlay) {
    keyboardHelpOverlay.style.display = 'none';
  }
});

// ========================================
// Initial parse
// ========================================

parseAndUpdate(sampleDsl);

// Expose for debugging
(window as unknown as { editor3d: InteractiveEditor; dslEditor: typeof dslEditor; editorSync: EditorViewerSync | null }).editor3d = editor3d;
(window as unknown as { editor3d: InteractiveEditor; dslEditor: typeof dslEditor; editorSync: EditorViewerSync | null }).dslEditor = dslEditor;
(window as unknown as { editor3d: InteractiveEditor; dslEditor: typeof dslEditor; editorSync: EditorViewerSync | null }).editorSync = editorSync;

console.log('Interactive Editor initialized');
console.log('Press H or ? for keyboard shortcuts');
