/**
 * Interactive Floorplan Editor (Refactored)
 *
 * Uses InteractiveEditorCore + createEditorUI for cleaner architecture.
 *
 * Features:
 * - Monaco code editor with live DSL editing
 * - 3D visualization with selection
 * - Bidirectional editor ↔ 3D sync
 * - Properties panel for editing
 * - Add room / delete functionality
 * - 2D overlay mini-map
 * - Export to multiple formats
 */

// Import Tailwind CSS (processed by @tailwindcss/vite plugin)
import '../../floorplan-viewer-core/src/ui/tailwind-styles.css';

import {
  getUIThemeMode,
  type JsonConnection,
  type JsonExport,
  type JsonRoom,
} from 'floorplan-3d-core';
import {
  convertFloorplanToJson,
  createFloorplansServices,
  type Floorplan,
} from 'floorplan-language';
import {
  cls,
  createDebugLogger,
  createDslEditor,
  createFileCommands,
  createShortcutInfoUI,
  createValidationWarningsUI,
  createViewCommands,
  EditorViewerSync,
  type EntityLocation,
  getLayoutManager,
  InteractiveEditorCore,
  injectStyles,
  Overlay2DManager,
} from 'floorplan-viewer-core';
import { createFloorplanUI, type FloorplanUIAPI } from 'floorplan-viewer-core/ui/solid';
import { EmptyFileSystem, type LangiumDocument, URI } from 'langium';
import { dslPropertyEditor } from './dsl-generator.js';

const log = createDebugLogger('[Editor]');

// Inject legacy styles for components not yet migrated to Tailwind
injectStyles();

// Initialize layout manager for coordinating panel positions
const layoutManager = getLayoutManager();

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

// ============================================================================
// Langium Services & Parser
// ============================================================================

const services = createFloorplansServices(EmptyFileSystem);
const parser = services.Floorplans.parser.LangiumParser;

let documentId = 1;
async function createLangiumDocument(input: string): Promise<LangiumDocument<Floorplan>> {
  const uri = URI.parse(`file:///floorplan-${documentId++}.fp`);
  const document = services.shared.workspace.LangiumDocumentFactory.fromString(input, uri);
  services.shared.workspace.LangiumDocuments.addDocument(document);
  await services.shared.workspace.DocumentBuilder.build([document]);
  return document as LangiumDocument<Floorplan>;
}

// ============================================================================
// State
// ============================================================================

let currentJsonData: JsonExport | null = null;
let currentLangiumDoc: LangiumDocument<Floorplan> | null = null;
let editorSync: EditorViewerSync | null = null;
let parseDebounceTimeout: ReturnType<typeof setTimeout> | null = null;

// ============================================================================
// DSL Editor (Monaco)
// ============================================================================

const dslEditor = createDslEditor({
  containerId: 'editor-container',
  initialContent: sampleDsl,
  theme: 'vs-dark',
  fontSize: 13,
  onChange: (content: string) => {
    if (parseDebounceTimeout) {
      clearTimeout(parseDebounceTimeout);
    }
    parseDebounceTimeout = setTimeout(() => {
      parseAndUpdate(content);
    }, 300);
  },
});

// ============================================================================
// 3D Editor Core
// ============================================================================

// Check if we're in dev mode (Vite injects this at build time)
const isDev = (() => {
  try {
    const meta = import.meta as { env?: { DEV?: boolean } };
    return meta.env?.DEV ?? false;
  } catch {
    return false;
  }
})();

log('Creating InteractiveEditorCore...');
const editorCore = new InteractiveEditorCore({
  containerId: 'app',
  initialTheme: 'dark',
  selectionDebug: isDev, // Only enable debug logs in dev mode
});
log('InteractiveEditorCore created');

// ============================================================================
// 2D Overlay Manager
// ============================================================================

const overlay2DManager = new Overlay2DManager({
  getCurrentTheme: () => editorCore.theme,
  getFloorplanData: () => currentJsonData,
  getVisibleFloorIds: () => editorCore.floorManager?.getVisibleFloorIds() ?? [],
});
overlay2DManager.setupControls();

// ============================================================================
// Validation Warnings Panel
// ============================================================================

const validationWarningsUI = createValidationWarningsUI({
  left: '10px',
  top: '10px',
  onWarningClick: (warning) => {
    if (warning.line && dslEditor) {
      // Open editor panel if closed
      if (!editorCore.isEditorPanelOpen) {
        editorCore.toggleEditorPanel();
      }
      dslEditor.goToLine(warning.line, warning.column || 1);
    }
  },
});
document.body.appendChild(validationWarningsUI.element);

// ============================================================================
// Shortcut Info Panel
// ============================================================================

const shortcutInfoUI = createShortcutInfoUI({
  title: 'Floorplan Editor',
});
document.body.appendChild(shortcutInfoUI.element);

// ============================================================================
// Editor UI (Solid.js)
// ============================================================================

let editorUI: FloorplanUIAPI;

function initEditorUI() {
  // Build commands using shared utilities (with icons, descriptions, execute callbacks)
  const fileCommands = createFileCommands({
    onOpenFile: () => editorCore.handleFileAction('open-file'),
    onSave: () => editorCore.handleFileAction('save-floorplan'),
    onExportJson: () => editorCore.handleFileAction('export-json'),
    onExportGlb: () => editorCore.handleFileAction('export-glb'),
  });

  const viewCommands = createViewCommands({
    onToggleTheme: () => editorCore.handleThemeToggle(),
  });

  // Editor-specific commands
  const editorSpecificCommands = [
    {
      id: 'view.toggle-editor',
      label: 'Toggle Editor Panel',
      description: 'Show/hide code editor',
      category: 'View',
      shortcut: 'E',
      icon: '📝',
      execute: () => {
        editorCore.toggleEditorPanel();
        updateEditorPanelPosition();
      },
    },
    {
      id: 'view.toggle-2d-overlay',
      label: 'Toggle 2D Overlay',
      description: 'Show/hide mini-map',
      category: 'View',
      shortcut: 'M',
      icon: '🗺️',
      execute: () => {
        const overlay2d = document.getElementById('overlay-2d');
        const show2dOverlay = document.getElementById('show-2d-overlay') as HTMLInputElement;
        if (overlay2d && show2dOverlay) {
          show2dOverlay.checked = !show2dOverlay.checked;
          const isVisible = show2dOverlay.checked;
          overlay2d.classList.toggle('visible', isVisible);
          layoutManager.setOverlay2DVisible(isVisible);
          if (isVisible) overlay2DManager.render();
        }
      },
    },
    {
      id: 'help.shortcuts',
      label: 'Show Keyboard Shortcuts',
      category: 'Help',
      shortcut: 'H',
      icon: '⌨️',
      execute: () => {
        const keyboardHelpOverlay = document.getElementById('keyboard-help-overlay');
        if (keyboardHelpOverlay) keyboardHelpOverlay.style.display = 'flex';
      },
    },
  ];

  // Combine all commands
  const commands = [...fileCommands, ...viewCommands, ...editorSpecificCommands];

  // Use unified createFloorplanUI with mode: 'editor'
  editorUI = createFloorplanUI(editorCore, {
    mode: 'editor',
    initialFilename: 'Untitled.floorplan',
    initialEditorOpen: true, // Editor panel is open by default
    initialTheme: 'dark',
    headerAutoHide: true, // Enable auto-hide like viewer
    commands,

    // Property change callback
    onPropertyChange: (entityType, _entityId, property, value) => {
      const sourceText = dslEditor.getValue();
      const entity = findSelectedEntity();

      if (!entity?.sourceRange) {
        console.warn('Cannot edit: no source range available');
        return;
      }

      let editOp = null;

      if (entityType === 'room') {
        editOp = dslPropertyEditor.generateRoomPropertyEdit(
          sourceText,
          entity.sourceRange,
          property,
          value,
        );
      } else if (entityType === 'wall') {
        editOp = dslPropertyEditor.generateWallPropertyEdit(
          sourceText,
          entity.sourceRange,
          property,
          value,
        );
      } else if (entityType === 'connection') {
        editOp = dslPropertyEditor.generateConnectionPropertyEdit(
          sourceText,
          entity.sourceRange,
          property,
          value,
        );
      }

      if (editOp) {
        applyEdit(editOp);
      }
    },

    // Delete callback
    onDelete: (entityType, entityId) => {
      executeDelete(entityType, entityId);
    },

    // Get entity data for properties panel
    getEntityData: (entityType, entityId) => {
      if (!currentJsonData) return {};

      if (entityType === 'room') {
        for (const floor of currentJsonData.floors) {
          const room = floor.rooms.find((r) => r.name === entityId);
          if (room) {
            return {
              name: room.name,
              x: room.x,
              y: room.z,
              width: room.width,
              height: room.height,
              roomHeight: room.roomHeight,
              style: room.style,
            };
          }
        }
      } else if (entityType === 'wall') {
        const match = entityId.match(/^(.+)_(top|bottom|left|right)$/);
        if (match) {
          return {
            room: match[1],
            direction: match[2],
            type: 'solid',
          };
        }
      } else if (entityType === 'connection') {
        const parts = entityId.split('-');
        if (parts.length >= 2) {
          const conn = currentJsonData.connections?.find(
            (c) => c.fromRoom === parts[0] && c.toRoom === parts.slice(1).join('-'),
          );
          return {
            fromRoom: parts[0],
            toRoom: parts.slice(1).join('-'),
            type: conn?.doorType ?? 'door',
            position: conn?.position ?? 50,
          };
        }
      }

      return {};
    },

    // Add room callback - inserts room DSL into the editor
    onAddRoom: (room) => {
      const currentContent = dslEditor.getValue();

      // Find the first floor block to add the room to
      const floorMatch = currentContent.match(/floor\s+(\w+)\s*\{/);
      if (!floorMatch) {
        console.warn('No floor found in DSL');
        return;
      }

      // Find the position to insert (before the closing brace of the floor)
      const floorStartIndex = currentContent.indexOf(floorMatch[0]);

      // Find matching closing brace
      let braceCount = 0;
      let insertIndex = -1;
      for (let i = floorStartIndex + floorMatch[0].length; i < currentContent.length; i++) {
        if (currentContent[i] === '{') braceCount++;
        if (currentContent[i] === '}') {
          if (braceCount === 0) {
            insertIndex = i;
            break;
          }
          braceCount--;
        }
      }

      if (insertIndex === -1) {
        console.warn('Could not find insertion point');
        return;
      }

      // Generate room DSL
      const roomDsl = `    room ${room.name} at (${room.x}, ${room.y}) size (${room.width} x ${room.height}) walls [top: solid, right: solid, bottom: solid, left: solid]\n  `;

      // Insert the room
      const newContent =
        currentContent.slice(0, insertIndex) + roomDsl + currentContent.slice(insertIndex);
      dslEditor.setValue(newContent);
    },
  });
}

// ============================================================================
// Editor-Viewer Sync
// ============================================================================

function initEditorViewerSync() {
  const selectionManager = editorCore.getSelectionManager();
  if (!selectionManager) return;

  editorSync = new EditorViewerSync(dslEditor.editor, selectionManager, { debug: true });

  // Handle editor cursor → 3D selection (simple mode)
  editorSync.onEditorSelect((entityKey, isAdditive) => {
    const parts = entityKey.split(':');
    if (parts.length !== 3) return;

    const [floorId, entityType, entityId] = parts;
    const registry = editorCore.meshRegistry;
    const entities = registry.getAllEntities();

    for (const entity of entities) {
      if (
        entity.floorId === floorId &&
        entity.entityType === entityType &&
        entity.entityId === entityId
      ) {
        selectionManager.select(entity, isAdditive);
        break;
      }
    }
  });

  // Handle editor cursor → 3D hierarchical selection
  editorSync.onEditorHierarchicalSelect((result, isAdditive) => {
    const registry = editorCore.meshRegistry;
    const allEntities = registry.getAllEntities();

    // Resolve all primary entities from primaryKeys
    const primaryEntities = result.primaryKeys
      .map((pKey) => {
        const parts = pKey.split(':');
        if (parts.length !== 3) return null;
        const [floorId, entityType, entityId] = parts;
        return allEntities.find(
          (e) => e.floorId === floorId && e.entityType === entityType && e.entityId === entityId,
        );
      })
      .filter((e): e is NonNullable<typeof e> => e != null);

    // Collect all entities to select
    const entitiesToSelect = [];
    for (const entityKey of result.allKeys) {
      const parts = entityKey.split(':');
      if (parts.length !== 3) continue;

      const [floorId, entityType, entityId] = parts;
      const entity = allEntities.find(
        (e) => e.floorId === floorId && e.entityType === entityType && e.entityId === entityId,
      );
      if (entity) {
        entitiesToSelect.push(entity);
      }
    }

    if (entitiesToSelect.length > 0) {
      selectionManager.selectMultiple(entitiesToSelect, isAdditive, {
        primaryEntities,
        isHierarchical: true,
      });
    }
  });

  // Handle editor text highlight → 3D preview
  editorSync.onEditorHighlight((entityKeys) => {
    selectionManager.clearHighlight();

    const registry = editorCore.meshRegistry;
    const entities = registry.getAllEntities();

    for (const entityKey of entityKeys) {
      const parts = entityKey.split(':');
      if (parts.length !== 3) continue;

      const [floorId, entityType, entityId] = parts;

      for (const entity of entities) {
        if (
          entity.floorId === floorId &&
          entity.entityType === entityType &&
          entity.entityId === entityId
        ) {
          selectionManager.highlight(entity);
          break;
        }
      }
    }
  });

  editorSync.onEditorHighlightClear(() => {
    selectionManager.clearHighlight();
  });
}

// ============================================================================
// Parse & Update
// ============================================================================

async function parseAndUpdate(content: string) {
  log('parseAndUpdate called, content length:', content.length);
  try {
    const parseResult = parser.parse(content);
    log('Parse result:', {
      lexerErrors: parseResult.lexerErrors.length,
      parserErrors: parseResult.parserErrors.length,
    });

    if (parseResult.lexerErrors.length > 0 || parseResult.parserErrors.length > 0) {
      const errors = [
        ...parseResult.lexerErrors.map(
          (e: { line?: number; column?: number; message: string }) => ({
            line: e.line ?? 1,
            column: e.column ?? 1,
            message: e.message,
          }),
        ),
        ...parseResult.parserErrors.map(
          (e: { token?: { startLine?: number; startColumn?: number }; message: string }) => ({
            line: e.token?.startLine ?? 1,
            column: e.token?.startColumn ?? 1,
            message: e.message,
          }),
        ),
      ];

      dslEditor.setErrorMarkers(errors);
      editorCore.setErrorState(true, errors[0].message);
      validationWarningsUI.clear();
      return;
    }

    const conversionResult = convertFloorplanToJson(
      parseResult.value as Parameters<typeof convertFloorplanToJson>[0],
    );

    if (conversionResult.errors.length > 0) {
      editorCore.setErrorState(true, conversionResult.errors[0].message);
      validationWarningsUI.clear();
      return;
    }

    // Success - update 3D view
    currentJsonData = conversionResult.data as JsonExport;
    log('Loading floorplan:', {
      floors: currentJsonData.floors.length,
      connections: currentJsonData.connections?.length ?? 0,
      rooms: currentJsonData.floors.reduce((sum, f) => sum + f.rooms.length, 0),
    });
    editorCore.loadFloorplan(currentJsonData);
    log('Floorplan loaded');

    // Create Langium document for 2D overlay and validation
    try {
      currentLangiumDoc = await createLangiumDocument(content);
      overlay2DManager.setLangiumDocument(currentLangiumDoc);

      // Run validation
      const validationDiagnostics =
        await services.Floorplans.validation.DocumentValidator.validateDocument(currentLangiumDoc);
      const warnings = validationDiagnostics
        .filter((diag) => (diag.severity ?? 0) === 2)
        .map((diag) => ({
          message: diag.message,
          line: diag.range ? diag.range.start.line + 1 : undefined,
          column: diag.range ? diag.range.start.character + 1 : undefined,
        }));

      validationWarningsUI.update(warnings);
    } catch (docErr) {
      console.warn('Failed to create Langium document:', docErr);
      currentLangiumDoc = null;
      overlay2DManager.setLangiumDocument(null);
      validationWarningsUI.clear();
    }

    // Update entity locations for sync
    if (editorSync) {
      const entityLocations = extractEntityLocations(currentJsonData);
      editorSync.updateEntityLocations(entityLocations);
    }

    // Clear errors
    dslEditor.clearErrorMarkers();
    editorCore.clearErrorState();
  } catch (err) {
    editorCore.setErrorState(true, (err as Error).message);
    validationWarningsUI.clear();
  }
}

// ============================================================================
// Helpers
// ============================================================================

function extractEntityLocations(jsonData: JsonExport): EntityLocation[] {
  const locations: EntityLocation[] = [];

  for (const floor of jsonData.floors) {
    const floorWithSource = floor as typeof floor & {
      _sourceRange?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    };

    if (floorWithSource._sourceRange) {
      locations.push({
        type: 'floor',
        name: floor.id,
        floorId: floor.id,
        sourceRange: floorWithSource._sourceRange,
      });
    }

    for (const room of floor.rooms) {
      const roomWithSource = room as JsonRoom & {
        _sourceRange?: {
          startLine: number;
          startColumn: number;
          endLine: number;
          endColumn: number;
        };
      };

      if (roomWithSource._sourceRange) {
        locations.push({
          type: 'room',
          name: room.name,
          floorId: floor.id,
          sourceRange: roomWithSource._sourceRange,
        });
      }

      for (const wall of room.walls || []) {
        const wallWithSource = wall as typeof wall & {
          _sourceRange?: {
            startLine: number;
            startColumn: number;
            endLine: number;
            endColumn: number;
          };
        };
        if (wallWithSource._sourceRange) {
          locations.push({
            type: 'wall',
            name: `${room.name}_${wall.direction}`,
            floorId: floor.id,
            sourceRange: wallWithSource._sourceRange,
          });
        }
      }
    }
  }

  for (const conn of jsonData.connections) {
    const connWithSource = conn as JsonConnection & {
      _sourceRange?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    };
    if (connWithSource._sourceRange) {
      locations.push({
        type: 'connection',
        name: `${conn.fromRoom}-${conn.toRoom}`,
        floorId: jsonData.floors[0]?.id ?? 'default',
        sourceRange: connWithSource._sourceRange,
      });
    }
  }

  return locations;
}

function findSelectedEntity() {
  const selection = editorCore.getSelection();
  if (selection.size !== 1) return null;
  return Array.from(selection)[0];
}

function applyEdit(editOp: {
  range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
  text: string;
}) {
  const model = dslEditor.editor.getModel();
  if (!model) return;

  model.pushEditOperations(
    [],
    [
      {
        range: {
          startLineNumber: editOp.range.startLineNumber,
          startColumn: editOp.range.startColumn,
          endLineNumber: editOp.range.endLineNumber,
          endColumn: editOp.range.endColumn,
        },
        text: editOp.text,
      },
    ],
    () => null,
  );
}

function executeDelete(entityType: string, entityId: string) {
  const entity = findSelectedEntity();
  if (!entity?.sourceRange) return;

  if (entityType === 'wall') {
    // Change wall to open instead of deleting
    const editOp = dslPropertyEditor.generateWallPropertyEdit(
      dslEditor.getValue(),
      entity.sourceRange,
      'type',
      'open',
    );
    if (editOp) {
      applyEdit(editOp);
    }
  } else {
    // Delete entity (and cascade connections for rooms)
    const model = dslEditor.editor.getModel();
    if (!model) return;

    const rangesToDelete: Array<{
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    }> = [entity.sourceRange];

    // Find cascade connections if deleting a room
    if (entityType === 'room' && currentJsonData?.connections) {
      for (const conn of currentJsonData.connections) {
        if (conn.fromRoom === entityId || conn.toRoom === entityId) {
          const connWithSource = conn as JsonConnection & {
            _sourceRange?: typeof entity.sourceRange;
          };
          if (connWithSource._sourceRange) {
            rangesToDelete.push(connWithSource._sourceRange);
          }
        }
      }
    }

    // Sort by end position (descending) to delete from bottom up
    rangesToDelete.sort((a, b) => {
      if (a.endLine !== b.endLine) return b.endLine - a.endLine;
      return b.endColumn - a.endColumn;
    });

    // Apply deletions
    const edits = rangesToDelete.map((range) => ({
      range: {
        startLineNumber: range.startLine + 1,
        startColumn: range.startColumn + 1,
        endLineNumber: range.endLine + 1,
        endColumn: range.endColumn + 2,
      },
      text: '',
    }));

    model.pushEditOperations([], edits, () => null);
  }

  // Clear selection
  editorCore.getSelectionManager()?.deselect();
  editorUI?.hidePropertiesPanel();
}

// ============================================================================
// Editor Panel Toggle & Resize
// ============================================================================

const editorPanel = document.getElementById('editor-panel');
const editorToggle = document.getElementById('editor-panel-toggle');
const editorResizeHandle = document.getElementById('editor-resize-handle');
let editorPanelOpen = true;
let editorPanelWidth = 450;

function updateEditorPanelPosition() {
  if (!editorPanel) return;
  editorPanel.style.width = `${editorPanelWidth}px`;

  // Set transform for panel visibility
  if (editorPanelOpen) {
    editorPanel.classList.add('open');
    editorPanel.style.transform = 'translateX(0)';
  } else {
    editorPanel.classList.remove('open');
    editorPanel.style.transform = `translateX(-100%)`;
  }

  // Update toggle button text/title (button is positioned by CSS)
  if (editorToggle) {
    editorToggle.textContent = editorPanelOpen ? '◀' : '▶';
    editorToggle.title = editorPanelOpen ? 'Collapse panel' : 'Expand panel';
  }

  // Toggle body class and set CSS variables
  document.body.classList.toggle('editor-open', editorPanelOpen);
  if (editorPanelOpen) {
    document.documentElement.style.setProperty('--editor-width', `${editorPanelWidth}px`);
  }

  // Update layout manager - this repositions all panels (warnings, 2D overlay, floor summary)
  layoutManager.setEditorOpen(editorPanelOpen);
  layoutManager.setEditorWidth(editorPanelWidth);

  // Notify 2D overlay manager (for internal rendering updates)
  overlay2DManager.onEditorStateChanged(editorPanelOpen, editorPanelWidth);
}

editorToggle?.addEventListener('click', () => {
  // Use editorCore.toggleEditorPanel() to ensure all listeners are notified
  // (including HeaderBar which needs to sync its icon state)
  editorCore.toggleEditorPanel();
});

// Listen for editor toggle from ALL sources (arrow, header bar, command palette)
// This ensures the local state and UI stay in sync
editorCore.on('editorToggle', ({ isOpen }) => {
  editorPanelOpen = isOpen;
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
  editorPanel.style.width = `${newWidth}px`;
  // Keep toggle button at panel edge during resize (using transform)
  if (editorToggle) {
    editorToggle.style.transform = `translateX(${newWidth}px) translateY(-50%)`;
  }
  document.documentElement.style.setProperty('--editor-width', `${newWidth}px`);
  // Update layout manager to reposition all panels during resize
  layoutManager.setEditorWidth(newWidth);
});

document.addEventListener('mouseup', () => {
  if (!isResizing) return;
  isResizing = false;
  editorPanel?.classList.remove('resizing');
  editorResizeHandle?.classList.remove('active');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});

// ============================================================================
// Control Panel Wiring
// ============================================================================

// Section collapse/expand
document.querySelectorAll('.fp-section-header').forEach((header) => {
  header.addEventListener('click', () => {
    header.parentElement?.classList.toggle('collapsed');
  });
});

// Camera controls - CameraManager.setupControls() already handles these buttons
// We only need to handle elements that CameraManager doesn't know about
// (CameraManager is called via editorCore -> FloorplanAppCore -> BaseViewer)

// Lighting controls
const lightAzimuth = document.getElementById('light-azimuth') as HTMLInputElement;
const lightAzimuthValue = document.getElementById('light-azimuth-value');
const lightElevation = document.getElementById('light-elevation') as HTMLInputElement;
const lightElevationValue = document.getElementById('light-elevation-value');
const lightIntensity = document.getElementById('light-intensity') as HTMLInputElement;
const lightIntensityValue = document.getElementById('light-intensity-value');

function updateLightPosition() {
  const azimuth = (parseFloat(lightAzimuth?.value || '45') * Math.PI) / 180;
  const elevation = (parseFloat(lightElevation?.value || '60') * Math.PI) / 180;
  const distance = 20;

  const x = distance * Math.cos(elevation) * Math.sin(azimuth);
  const y = distance * Math.sin(elevation);
  const z = distance * Math.cos(elevation) * Math.cos(azimuth);

  if (editorCore.light) {
    editorCore.light.position.set(x, y, z);
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
  if (editorCore.light) {
    editorCore.light.intensity = intensity;
  }
});

// Theme toggle - sync with editorCore
const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Update sidebar button text when theme changes (from any source)
function updateThemeButton() {
  const uiTheme = getUIThemeMode(editorCore.theme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = uiTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
  }
  document.documentElement.setAttribute('data-theme', uiTheme);
  document.body.classList.toggle('dark-theme', uiTheme === 'dark');
}

// Update Monaco editor theme to match app theme
function updateEditorTheme(theme: 'light' | 'dark'): void {
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  dslEditor.editor.updateOptions({ theme: monacoTheme });
}

themeToggleBtn?.addEventListener('click', () => {
  editorCore.handleThemeToggle();
  updateThemeButton();
  updateEditorTheme(getUIThemeMode(editorCore.theme));
  overlay2DManager.render();
});

// Listen for theme changes from other sources (e.g., header button)
editorCore.on('themeChange', () => {
  updateThemeButton();
  updateEditorTheme(getUIThemeMode(editorCore.theme));
  overlay2DManager.render();
});

// Exploded view
const explodedView = document.getElementById('exploded-view') as HTMLInputElement;
const explodedValue = document.getElementById('exploded-value');

explodedView?.addEventListener('input', () => {
  const value = parseInt(explodedView.value, 10);
  if (explodedValue) explodedValue.textContent = `${value}%`;
  editorCore.setExplodedView(value / 100);
});

// Floor visibility
const floorList = document.getElementById('floor-list');
const showAllFloorsBtn = document.getElementById('show-all-floors');
const hideAllFloorsBtn = document.getElementById('hide-all-floors');

function updateFloorListUI() {
  const floors = editorCore.floors;
  const floorManager = editorCore.floorManager;

  if (!floorList || !floors || floors.length === 0) {
    if (floorList) floorList.innerHTML = '<div class="fp-no-floors">Floors will appear here</div>';
    return;
  }

  floorList.innerHTML = '';
  floors.forEach((floor, index) => {
    const floorId = floor.name || `floor-${index}`;
    const visible = floorManager ? floorManager.getFloorVisibility(floorId) : true;

    const item = document.createElement('label');
    item.className = cls.checkbox.wrapper;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = cls.checkbox.input;
    checkbox.id = `floor-toggle-${index}`;
    checkbox.checked = visible;
    checkbox.addEventListener('change', () => {
      if (floorManager) {
        floorManager.setFloorVisible(floorId, checkbox.checked);
        overlay2DManager.render();
      }
    });

    const labelText = document.createElement('span');
    labelText.className = cls.checkbox.label;
    labelText.textContent = floorId;

    item.appendChild(checkbox);
    item.appendChild(labelText);
    floorList.appendChild(item);
  });
}

showAllFloorsBtn?.addEventListener('click', () => {
  editorCore.floorManager?.setAllFloorsVisible(true);
  updateFloorListUI();
  overlay2DManager.render();
});

hideAllFloorsBtn?.addEventListener('click', () => {
  editorCore.floorManager?.setAllFloorsVisible(false);
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
  const isVisible = show2dOverlay.checked;
  overlay2d?.classList.toggle('visible', isVisible);
  // Notify layout manager to reposition floor summary panel
  layoutManager.setOverlay2DVisible(isVisible);
  if (isVisible) {
    overlay2DManager.render();
  }
});

overlayOpacity?.addEventListener('input', () => {
  const opacity = parseInt(overlayOpacity.value, 10);
  if (overlayOpacityValue) overlayOpacityValue.textContent = `${opacity}%`;
  if (overlay2d) overlay2d.style.opacity = String(opacity / 100);
});

overlay2dClose?.addEventListener('click', () => {
  overlay2d?.classList.remove('visible');
  if (show2dOverlay) show2dOverlay.checked = false;
  // Notify layout manager
  layoutManager.setOverlay2DVisible(false);
});

// Annotation controls
const showArea = document.getElementById('show-area') as HTMLInputElement;
const showDimensions = document.getElementById('show-dimensions') as HTMLInputElement;
const showFloorSummary = document.getElementById('show-floor-summary') as HTMLInputElement;
const areaUnit = document.getElementById('area-unit') as HTMLSelectElement;
const lengthUnit = document.getElementById('length-unit') as HTMLSelectElement;
const floorSummary = document.getElementById('floor-summary');

function updateAnnotations() {
  if (editorCore.annotationManager) {
    editorCore.annotationManager.state.showArea = showArea?.checked || false;
    editorCore.annotationManager.state.showDimensions = showDimensions?.checked || false;
    editorCore.annotationManager.state.showFloorSummary = showFloorSummary?.checked || false;
    editorCore.annotationManager.state.areaUnit = (areaUnit?.value as 'sqft' | 'sqm') || 'sqft';
    editorCore.annotationManager.state.lengthUnit =
      (lengthUnit?.value as 'ft' | 'm' | 'cm' | 'in' | 'mm') || 'ft';
    editorCore.annotationManager.updateAll();
  }
}

showArea?.addEventListener('change', updateAnnotations);
showDimensions?.addEventListener('change', updateAnnotations);
showFloorSummary?.addEventListener('change', () => {
  const isVisible = showFloorSummary.checked;
  floorSummary?.classList.toggle('visible', isVisible);
  // Notify layout manager
  layoutManager.setFloorSummaryVisible(isVisible);
  updateAnnotations();
});
areaUnit?.addEventListener('change', updateAnnotations);
lengthUnit?.addEventListener('change', updateAnnotations);

// Selection mode controls
const selectionEnabledCheckbox = document.getElementById('selection-enabled') as HTMLInputElement;
const selectionStatus = document.getElementById('selection-status');
const containmentCheckbox = document.getElementById('containment-mode') as HTMLInputElement;
const modeIndicator = document.getElementById('mode-indicator');

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
  editorCore.getSelectionManager()?.setEnabled(enabled);
  updateSelectionModeUI(enabled);
});

containmentCheckbox?.addEventListener('change', (e) => {
  const mode = (e.target as HTMLInputElement).checked ? 'containment' : 'intersection';
  editorCore.setMarqueeMode(mode);
  if (modeIndicator) {
    modeIndicator.textContent = mode === 'containment' ? 'Containment' : 'Intersection';
    modeIndicator.style.color = mode === 'containment' ? '#ff9500' : '#4a9eff';
  }
});

// Listen for selection mode changes from keyboard (V key)
editorCore.getSelectionManager()?.onModeChange((enabled) => {
  updateSelectionModeUI(enabled);
});

// Update floor list when floorplan is loaded
editorCore.on('floorplanLoaded', () => {
  setTimeout(updateFloorListUI, 100);
});

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

// ============================================================================
// Initialize
// ============================================================================

// Initialize editor panel position and sync with editorCore
updateEditorPanelPosition();
editorCore.setEditorPanelOpen(editorPanelOpen); // Sync initial state with editorCore

// Initialize layout manager state - header is always visible in editor (no auto-hide)
layoutManager.setHeaderVisible(true);
layoutManager.setEditorOpen(editorPanelOpen);
layoutManager.setEditorWidth(editorPanelWidth);

initEditorUI();
initEditorViewerSync();

// ============================================================================
// Add Room Button Wiring (uses Solid.js dialog from unified UI)
// ============================================================================

const addRoomBtn = document.getElementById('add-room-btn');

// Wire up the HTML Add Room button to show the Solid.js dialog
addRoomBtn?.addEventListener('click', () => {
  // Update existing room names for validation before showing dialog
  if (currentJsonData) {
    const names = new Set<string>();
    for (const floor of currentJsonData.floors) {
      for (const room of floor.rooms) {
        names.add(room.name);
      }
    }
    editorUI.setExistingRoomNames(names);
  }
  editorUI.showAddRoomDialog();
});

// ============================================================================
// Export Menu Wiring
// ============================================================================

const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');

exportBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu?.classList.toggle('visible');
  exportBtn?.setAttribute(
    'aria-expanded',
    exportMenu?.classList.contains('visible') ? 'true' : 'false',
  );
});

// Close export menu when clicking outside
document.addEventListener('click', () => {
  exportMenu?.classList.remove('visible');
  exportBtn?.setAttribute('aria-expanded', 'false');
});

// Handle export menu item clicks
exportMenu?.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const menuItem = target.closest('.export-menu-item') as HTMLElement;
  if (!menuItem) return;

  const format = menuItem.dataset.format;
  if (!format) return;

  exportMenu?.classList.remove('visible');
  exportBtn?.setAttribute('aria-expanded', 'false');

  switch (format) {
    case 'dsl':
      editorCore.handleFileAction('save-floorplan');
      break;
    case 'json':
      editorCore.handleFileAction('export-json');
      break;
    case 'glb':
      editorCore.handleFileAction('export-glb');
      break;
    case 'gltf':
      editorCore.handleFileAction('export-gltf');
      break;
  }
});

// Listen for DSL content changes (from file loading)
editorCore.on('dslChange', ({ content }) => {
  log('dslChange event received, updating Monaco editor');
  dslEditor.setValue(content);
});

// Initial parse
parseAndUpdate(sampleDsl);

// Expose for debugging
(
  window as unknown as {
    editorCore: InteractiveEditorCore;
    dslEditor: typeof dslEditor;
    editorSync: EditorViewerSync | null;
  }
).editorCore = editorCore;
(
  window as unknown as {
    editorCore: InteractiveEditorCore;
    dslEditor: typeof dslEditor;
    editorSync: EditorViewerSync | null;
  }
).dslEditor = dslEditor;
(
  window as unknown as {
    editorCore: InteractiveEditorCore;
    dslEditor: typeof dslEditor;
    editorSync: EditorViewerSync | null;
  }
).editorSync = editorSync;

console.log('Interactive Editor (Refactored) initialized');
console.log('Press H or ? for keyboard shortcuts');
