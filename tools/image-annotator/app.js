/**
 * Floorplan Dimension Annotator - Phase 1 Client Logic
 * Features: Viewport Zoom/Pan, Constraint Axis Drafting, Scale Calibration, Static Image Export, JSON Persistence.
 */

// --- Application State ---
let img = new Image();
let imageLoaded = false;
let currentFile = null;

// Viewport Zoom & Pan
const viewport = {
  x: 0,
  y: 0,
  scale: 1,
  minScale: 0.1,
  maxScale: 10,
  fitScale: 1
};

let isPanning = false;
let panStart = { x: 0, y: 0 };
let isSpacePressed = false;

// Drawing & Tool State
let activeTool = 'annotate'; // 'calibrate' or 'annotate'
let activeConstraint = 'horizontal'; // 'horizontal', 'vertical', 'slanted'

const drawingState = {
  active: false,
  startX: 0,  // Image relative coords
  startY: 0,
  currentX: 0,
  currentY: 0
};

// Scale Calibration Data
const calibration = {
  pixelDistance: null,
  realDistance: null,
  unit: 'm',
  scale: null // pixels per unit (e.g. px/meter)
};

// Calibration Temporary line capture
let pendingCalibrationLine = null;

// Annotations Array
let annotations = [];

// --- DOM Elements ---
const canvas = document.getElementById('annotator-canvas');
const ctx = canvas.getContext('2d');
const viewportContainer = document.getElementById('viewport-container');
const welcomeScreen = document.getElementById('welcome-screen');
const welcomeUpload = document.getElementById('welcome-upload');
const imageUpload = document.getElementById('image-upload');
const dragOverlay = document.getElementById('drag-overlay');
const loadingSpinner = document.getElementById('loading-spinner');
const canvasHud = document.getElementById('canvas-hud');
const coordsDisplay = document.getElementById('coords-display');
const calibrationBox = document.getElementById('calibration-box');

// Tool buttons
const toolCalibrate = document.getElementById('tool-calibrate');
const toolAnnotate = document.getElementById('tool-annotate');
const btnExportImg = document.getElementById('btn-export-img');
const btnSaveJson = document.getElementById('btn-save-json');
const btnLoadJson = document.getElementById('btn-load-json');
const btnClearAll = document.getElementById('btn-clear-all');

// Constraints Buttons
const constHorizontal = document.getElementById('constraint-horizontal');
const constVertical = document.getElementById('constraint-vertical');
const constSlanted = document.getElementById('constraint-slanted');

// HUD zoom buttons
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const btnZoomFit = document.getElementById('btn-zoom-fit');

// Modal Elements
const calModal = document.getElementById('calibration-modal');
const calDistanceInput = document.getElementById('cal-distance');
const calUnitSelect = document.getElementById('cal-unit');
const calMeasuredPx = document.getElementById('cal-measured-px');
const btnCalCancel = document.getElementById('btn-cal-cancel');
const btnCalSubmit = document.getElementById('btn-cal-submit');

// List
const annotationsList = document.getElementById('annotations-list');
const annotationsCountBadge = document.getElementById('annotations-count');
const roundValuesCheckbox = document.getElementById('round-values-checkbox');
const roundPrecisionGroup = document.getElementById('round-precision-group');
const roundPrecisionSelect = document.getElementById('round-precision-select');

// --- Event Listeners Initialization ---
function initEventListeners() {
  // File Uploads
  welcomeUpload.addEventListener('change', handleFileSelect);
  imageUpload.addEventListener('change', handleFileSelect);

  // Drag & Drop
  viewportContainer.addEventListener('dragenter', dragEnterHandler);
  viewportContainer.addEventListener('dragover', dragOverHandler);
  viewportContainer.addEventListener('dragleave', dragLeaveHandler);
  viewportContainer.addEventListener('drop', dropHandler);

  // Tool Modes Selection
  toolCalibrate.addEventListener('click', () => setToolMode('calibrate'));
  toolAnnotate.addEventListener('click', () => setToolMode('annotate'));

  // Constraint Mode Toggles
  constHorizontal.addEventListener('click', () => setConstraintMode('horizontal'));
  constVertical.addEventListener('click', () => setConstraintMode('vertical'));
  constSlanted.addEventListener('click', () => setConstraintMode('slanted'));

  // Canvas Viewport Panning & Zooming
  canvas.addEventListener('mousedown', canvasMouseDown);
  window.addEventListener('mousemove', canvasMouseMove);
  window.addEventListener('mouseup', canvasMouseUp);
  canvas.addEventListener('wheel', canvasWheel, { passive: false });

  // Floating HUD Actions
  btnZoomIn.addEventListener('click', () => zoomAtCenter(1.2));
  btnZoomOut.addEventListener('click', () => zoomAtCenter(1 / 1.2));
  btnZoomFit.addEventListener('click', fitImageToViewport);

  // Workspace Actions
  btnExportImg.addEventListener('click', exportAnnotatedImage);
  btnSaveJson.addEventListener('click', exportStateToJson);
  btnLoadJson.addEventListener('click', triggerJsonImport);
  btnClearAll.addEventListener('click', clearAllWorkspace);

  // Calibration Modal Actions
  btnCalCancel.addEventListener('click', closeCalibrationModal);
  btnCalSubmit.addEventListener('click', submitCalibration);

  // Keyboard Shortcuts
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  // Prevent backspace/space bar default scroll when focusing canvas
  canvas.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Backspace') e.preventDefault();
  });

  // Display Options Listeners
  roundValuesCheckbox.addEventListener('change', () => {
    updateUI();
    requestAnimationFrame(drawCanvas);
  });

  roundPrecisionSelect.addEventListener('change', () => {
    updateUI();
    requestAnimationFrame(drawCanvas);
  });
}

// --- File Handling & Loading ---
function dragEnterHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  dragOverlay.classList.add('active');
}

function dragOverHandler(e) {
  e.preventDefault();
  e.stopPropagation();
}

function dragLeaveHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.relatedTarget === null || !viewportContainer.contains(e.relatedTarget)) {
    dragOverlay.classList.remove('active');
  }
}

function dropHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  dragOverlay.classList.remove('active');

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].type.startsWith('image/')) {
    loadImageFile(files[0]);
  }
}

function handleFileSelect(e) {
  const files = e.target.files;
  if (files.length > 0) {
    loadImageFile(files[0]);
  }
}

function loadImageFile(file) {
  currentFile = file;
  loadingSpinner.style.display = 'flex';
  
  const reader = new FileReader();
  reader.onload = function(event) {
    img = new Image();
    img.onload = function() {
      // Setup canvas sizes
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Update UI elements
      welcomeScreen.style.display = 'none';
      canvas.style.display = 'block';
      canvasHud.style.display = 'flex';
      
      toolCalibrate.removeAttribute('disabled');
      toolAnnotate.removeAttribute('disabled');
      btnExportImg.removeAttribute('disabled');
      btnSaveJson.removeAttribute('disabled');
      btnLoadJson.removeAttribute('disabled');
      btnClearAll.removeAttribute('disabled');
      
      imageLoaded = true;
      loadingSpinner.style.display = 'none';
      
      fitImageToViewport();
      updateUI();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

// --- Coordinate Conversions ---
// Get image relative coords from screen mouse event
function getImgCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  return {
    x: (screenX - viewport.x) / viewport.scale,
    y: (screenY - viewport.y) / viewport.scale
  };
}

// Constrain drawing endpoint based on selected constraint
function applyLineConstraint(startX, startY, rawX, rawY) {
  if (activeConstraint === 'horizontal') {
    return { x: rawX, y: startY };
  } else if (activeConstraint === 'vertical') {
    return { x: startX, y: rawY };
  } else {
    // 'slanted'
    return { x: rawX, y: rawY };
  }
}

// --- Drawing Interaction ---
function canvasMouseDown(e) {
  if (!imageLoaded) return;
  
  // Pan operation starts on Middle Click, right click, or space + left click
  if (e.button === 1 || e.button === 2 || (e.button === 0 && isSpacePressed)) {
    isPanning = true;
    panStart.x = e.clientX - viewport.x;
    panStart.y = e.clientY - viewport.y;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
    return;
  }
  
  // Left click starts drawing
  if (e.button === 0 && !isSpacePressed) {
    const coords = getImgCoords(e);
    
    // Bounds check
    if (coords.x < 0 || coords.x > img.naturalWidth || coords.y < 0 || coords.y > img.naturalHeight) {
      return; // click outside image
    }
    
    drawingState.active = true;
    drawingState.startX = coords.x;
    drawingState.startY = coords.y;
    drawingState.currentX = coords.x;
    drawingState.currentY = coords.y;
    
    canvas.focus();
  }
}

function canvasMouseMove(e) {
  if (!imageLoaded) return;
  
  const rect = canvas.getBoundingClientRect();
  const rawCoords = getImgCoords(e);
  
  // Display coordinate status
  coordsDisplay.textContent = `x: ${Math.round(rawCoords.x)}, y: ${Math.round(rawCoords.y)} px`;
  
  if (isPanning) {
    viewport.x = e.clientX - panStart.x;
    viewport.y = e.clientY - panStart.y;
    requestAnimationFrame(drawCanvas);
    return;
  }
  
  if (drawingState.active) {
    // Apply constraints dynamically
    const constrained = applyLineConstraint(
      drawingState.startX,
      drawingState.startY,
      rawCoords.x,
      rawCoords.y
    );
    
    drawingState.currentX = constrained.x;
    drawingState.currentY = constrained.y;
    
    requestAnimationFrame(drawCanvas);
  }
}

function canvasMouseUp(e) {
  if (!imageLoaded) return;
  
  if (isPanning) {
    isPanning = false;
    canvas.style.cursor = 'crosshair';
    return;
  }
  
  if (drawingState.active && e.button === 0) {
    drawingState.active = false;
    
    // Check if drawing has a minimal displacement (avoid simple click error)
    const dx = drawingState.currentX - drawingState.startX;
    const dy = drawingState.currentY - drawingState.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      if (activeTool === 'calibrate') {
        // Trigger calibration prompt
        pendingCalibrationLine = {
          x1: drawingState.startX,
          y1: drawingState.startY,
          x2: drawingState.currentX,
          y2: drawingState.currentY,
          pixelDistance: dist
        };
        openCalibrationModal(dist);
      } else {
        // Annotation Mode: Save dimension line
        const distanceVal = calibration.scale ? dist / calibration.scale : dist;
        const annotation = {
          id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          x1: drawingState.startX,
          y1: drawingState.startY,
          x2: drawingState.currentX,
          y2: drawingState.currentY,
          pixelDistance: dist,
          realDistance: distanceVal,
          unit: calibration.unit,
          type: activeConstraint
        };
        annotations.push(annotation);
        updateUI();
      }
    }
    
    requestAnimationFrame(drawCanvas);
  }
}

// Wheel Zoom relative to cursor point
function canvasWheel(e) {
  if (!imageLoaded) return;
  e.preventDefault();
  
  const zoomFactor = 1.1;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // Relative position within transformed space
  const canvasX = (mouseX - viewport.x) / viewport.scale;
  const canvasY = (mouseY - viewport.y) / viewport.scale;
  
  if (e.deltaY < 0) {
    // Zoom In
    viewport.scale = Math.min(viewport.scale * zoomFactor, viewport.maxScale);
  } else {
    // Zoom Out
    viewport.scale = Math.max(viewport.scale / zoomFactor, viewport.minScale);
  }
  
  // Adjust pan so cursor stays at the same relative position
  viewport.x = mouseX - canvasX * viewport.scale;
  viewport.y = mouseY - canvasY * viewport.scale;
  
  requestAnimationFrame(drawCanvas);
}

// Zoom actions from HUD
function zoomAtCenter(factor) {
  const containerRect = viewportContainer.getBoundingClientRect();
  const centerX = containerRect.width / 2;
  const centerY = containerRect.height / 2;
  
  const canvasX = (centerX - viewport.x) / viewport.scale;
  const canvasY = (centerY - viewport.y) / viewport.scale;
  
  viewport.scale = Math.max(viewport.minScale, Math.min(viewport.scale * factor, viewport.maxScale));
  
  viewport.x = centerX - canvasX * viewport.scale;
  viewport.y = centerY - canvasY * viewport.scale;
  
  requestAnimationFrame(drawCanvas);
}

// Fit source image centered within container viewport
function fitImageToViewport() {
  if (!imageLoaded) return;
  
  const vWidth = viewportContainer.clientWidth;
  const vHeight = viewportContainer.clientHeight;
  const iWidth = img.naturalWidth;
  const iHeight = img.naturalHeight;
  
  const scaleX = vWidth / iWidth;
  const scaleY = vHeight / iHeight;
  
  // Fit scales nicely leaving a margin
  const fitScale = Math.min(scaleX, scaleY) * 0.92;
  
  viewport.scale = fitScale;
  viewport.fitScale = fitScale;
  
  // Centered translation
  viewport.x = (vWidth - iWidth * fitScale) / 2;
  viewport.y = (vHeight - iHeight * fitScale) / 2;
  
  requestAnimationFrame(drawCanvas);
}

// --- Keyboard Shortcuts ---
function handleKeyDown(e) {
  if (e.key === ' ' || e.key === 'Spacebar') {
    isSpacePressed = true;
    if (imageLoaded) canvas.style.cursor = 'grab';
    e.preventDefault();
  }
  
  if (e.key === 'Escape') {
    if (drawingState.active) {
      drawingState.active = false;
      requestAnimationFrame(drawCanvas);
    }
  }
  
  // Fast Toggles (Only when not filling inputs/dialogs)
  if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
    if (e.key.toLowerCase() === 'h') {
      setConstraintMode('horizontal');
    }
    if (e.key.toLowerCase() === 'v') {
      setConstraintMode('vertical');
    }
    if (e.key.toLowerCase() === 's') {
      setConstraintMode('slanted');
    }
  }
}

function handleKeyUp(e) {
  if (e.key === ' ' || e.key === 'Spacebar') {
    isSpacePressed = false;
    if (imageLoaded) {
      canvas.style.cursor = isPanning ? 'grabbing' : 'crosshair';
    }
  }
}

// --- UI Management ---
function setToolMode(mode) {
  activeTool = mode;
  toolCalibrate.classList.toggle('active', mode === 'calibrate');
  toolAnnotate.classList.toggle('active', mode === 'annotate');
}

function setConstraintMode(constraint) {
  activeConstraint = constraint;
  constHorizontal.classList.toggle('active', constraint === 'horizontal');
  constVertical.classList.toggle('active', constraint === 'vertical');
  constSlanted.classList.toggle('active', constraint === 'slanted');
  
  // Trigger redraw if active
  if (drawingState.active) {
    // Re-evaluate current coordinate under new constraint
    const rect = canvas.getBoundingClientRect();
    const rawCoords = { x: drawingState.currentX, y: drawingState.currentY };
    
    // Realignment
    const constrained = applyLineConstraint(
      drawingState.startX,
      drawingState.startY,
      drawingState.currentX,
      drawingState.currentY
    );
    drawingState.currentX = constrained.x;
    drawingState.currentY = constrained.y;
    
    requestAnimationFrame(drawCanvas);
  }
}

function updatePrecisionSelectVisibility() {
  const isRound = roundValuesCheckbox.checked;
  const isFt = calibration.scale && calibration.unit === 'ft';
  if (isRound && isFt) {
    roundPrecisionGroup.style.display = 'flex';
  } else {
    roundPrecisionGroup.style.display = 'none';
  }
}

function updateUI() {
  // Update precision selector visibility
  updatePrecisionSelectVisibility();

  // Update Calibration Display Box
  if (calibration.scale) {
    calibrationBox.innerHTML = `
      <div class="calibration-status calibrated">
        <span class="status-indicator">●</span> Calibrated
      </div>
      <p class="calibration-detail">Scale: <strong>${calibration.scale.toFixed(2)} px/${calibration.unit}</strong></p>
      <p class="calibration-detail" style="margin-top: 4px;">Reference Unit: <strong>${calibration.unit}</strong></p>
    `;
  } else {
    calibrationBox.innerHTML = `
      <div class="calibration-status uncalibrated">
        <span class="status-indicator">●</span> Uncalibrated
      </div>
      <p class="calibration-detail">Annotated measurements will show raw pixels. Click <strong>Calibrate Scale</strong> to calibrate.</p>
    `;
  }
  
  // Render active annotations sidebar list
  annotationsCountBadge.textContent = annotations.length;
  
  if (annotations.length === 0) {
    annotationsList.innerHTML = `<div class="empty-list-message">No annotations added yet. Click & drag on the canvas to draw.</div>`;
  } else {
    annotationsList.innerHTML = '';
    annotations.forEach((anno) => {
      const item = document.createElement('div');
      item.className = 'annotation-item';
      
      const shouldRound = roundValuesCheckbox.checked;
      const distText = formatDimensionValue(
        calibration.scale ? anno.realDistance : anno.pixelDistance,
        calibration.scale ? anno.unit : 'px',
        shouldRound
      );
        
      const constraintLabel = anno.type.charAt(0).toUpperCase() + anno.type.slice(1);
      
      item.innerHTML = `
        <div class="anno-info">
          <span class="anno-label">${distText}</span>
          <span class="anno-meta">${constraintLabel} mode • (${Math.round(anno.pixelDistance)}px)</span>
        </div>
        <button class="btn-delete" title="Delete Annotation" onclick="deleteAnnotation('${anno.id}')">🗑️</button>
      `;
      annotationsList.appendChild(item);
    });
  }
}

// Delete helper exposed to global window context
window.deleteAnnotation = function(id) {
  annotations = annotations.filter(anno => anno.id !== id);
  updateUI();
  requestAnimationFrame(drawCanvas);
};

// --- Calibration Modal Dialog Handlers ---
function openCalibrationModal(pixelDist) {
  calMeasuredPx.textContent = Math.round(pixelDist);
  calModal.style.display = 'flex';
  calDistanceInput.focus();
  calDistanceInput.select();
}

function closeCalibrationModal() {
  calModal.style.display = 'none';
  pendingCalibrationLine = null;
  drawingState.active = false;
  requestAnimationFrame(drawCanvas);
}

function submitCalibration() {
  const value = parseFloat(calDistanceInput.value);
  const unit = calUnitSelect.value;
  
  if (isNaN(value) || value <= 0) {
    alert("Please enter a valid positive number.");
    return;
  }
  
  if (pendingCalibrationLine) {
    calibration.pixelDistance = pendingCalibrationLine.pixelDistance;
    calibration.realDistance = value;
    calibration.unit = unit;
    calibration.scale = pendingCalibrationLine.pixelDistance / value;
    
    // Re-scale existing annotations if any
    annotations.forEach(anno => {
      anno.realDistance = anno.pixelDistance / calibration.scale;
      anno.unit = unit;
    });
    
    // Automatically switch tool back to Draw annotations
    setToolMode('annotate');
    closeCalibrationModal();
    updateUI();
  }
}

// Dimension Value Formatting Helper (DRY implementation)
// Imperial formatting: Convert decimal feet to standard feet-inches (e.g. 5' 6") when rounded
function formatDimensionValue(value, unit, shouldRound) {
  if (unit === 'px') {
    return shouldRound ? `${Math.round(value)} px` : `${value.toFixed(1)} px`;
  }
  
  if (unit === 'ft') {
    if (shouldRound) {
      const grid = parseInt(roundPrecisionSelect?.value) || 1;
      const totalInches = Math.round(value * 12);
      // Round to the nearest grid increment (1", 3", 6", or 12")
      const roundedInches = Math.round(totalInches / grid) * grid;
      const feet = Math.floor(roundedInches / 12);
      const inches = roundedInches % 12;
      return `${feet}' ${inches}"`;
    } else {
      return `${value.toFixed(2)} ft`;
    }
  }
  
  // Standard units (m, cm, mm, etc.)
  return shouldRound ? `${Math.round(value)} ${unit}` : `${value.toFixed(2)} ${unit}`;
}

// --- Canvas Drawing Methods ---
function drawCanvas() {
  if (!imageLoaded) return;
  
  // Set physical display dimension
  const viewportRect = viewportContainer.getBoundingClientRect();
  canvas.width = viewportRect.width;
  canvas.height = viewportRect.height;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 1. Draw translated image
  ctx.save();
  ctx.translate(viewport.x, viewport.y);
  ctx.scale(viewport.scale, viewport.scale);
  
  ctx.drawImage(img, 0, 0);
  
  // 2. Draw existing annotations
  annotations.forEach(anno => {
    const val = calibration.scale ? anno.realDistance : anno.pixelDistance;
    const unit = calibration.scale ? anno.unit : 'px';
    drawDimensionLine(ctx, anno.x1, anno.y1, anno.x2, anno.y2, val, unit, false);
  });
  
  // 3. Draw active drawing preview line
  if (drawingState.active) {
    const isCal = activeTool === 'calibrate';
    let tempDistance = 0;
    const dx = drawingState.currentX - drawingState.startX;
    const dy = drawingState.currentY - drawingState.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (calibration.scale) {
      tempDistance = dist / calibration.scale;
    } else {
      tempDistance = dist;
    }
    
    // Draw guide indicators for constraints
    drawConstraintGuide(ctx, drawingState.startX, drawingState.startY, drawingState.currentX, drawingState.currentY);
    
    // Draw active vector
    drawDimensionLine(
      ctx,
      drawingState.startX,
      drawingState.startY,
      drawingState.currentX,
      drawingState.currentY,
      tempDistance,
      calibration.scale ? calibration.unit : 'px',
      true
    );
  }
  
  ctx.restore();
}

// Draw visual axis guides under the drawing line
function drawConstraintGuide(cContext, x1, y1, x2, y2) {
  cContext.save();
  cContext.beginPath();
  cContext.strokeStyle = 'rgba(6, 182, 212, 0.25)';
  cContext.lineWidth = 1 / viewport.scale;
  cContext.setLineDash([5 / viewport.scale, 5 / viewport.scale]);
  
  if (activeConstraint === 'horizontal') {
    // Horizontal guide line extending infinitely
    cContext.moveTo(0, y1);
    cContext.lineTo(img.naturalWidth, y1);
  } else if (activeConstraint === 'vertical') {
    // Vertical guide line extending infinitely
    cContext.moveTo(x1, 0);
    cContext.lineTo(x1, img.naturalHeight);
  } else {
    // Angle lines
    cContext.moveTo(x1, y1);
    cContext.lineTo(x2, y2);
  }
  
  cContext.stroke();
  cContext.restore();
}

// Shared method to draw dimension arrows, lines, and rotated text labels
function drawDimensionLine(cContext, x1, y1, x2, y2, value, unit, isPreview) {
  const color = isPreview ? '#22d3ee' : '#10b981'; // preview cyan, active green
  const scaleAdjustment = 1; // Used if drawing on different resolutions
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return;
  
  const angle = Math.atan2(dy, dx);
  
  // Arrowhead size relative to screen space to maintain visibility
  const arrowLength = Math.max(12, 14 / (viewport.scale || 1));
  const arrowWidth = 0.3; // Angle of arrow feathers
  
  cContext.save();
  cContext.strokeStyle = color;
  cContext.fillStyle = color;
  cContext.lineWidth = Math.max(1.5, 2 / (viewport.scale || 1));
  
  // --- 1. Draw Main Line ---
  cContext.beginPath();
  cContext.moveTo(x1, y1);
  cContext.lineTo(x2, y2);
  cContext.stroke();
  
  // --- 2. Draw Arrowheads ---
  // Arrowhead at P1
  cContext.beginPath();
  cContext.moveTo(x1, y1);
  cContext.lineTo(
    x1 + arrowLength * Math.cos(angle + arrowWidth),
    y1 + arrowLength * Math.sin(angle + arrowWidth)
  );
  cContext.lineTo(
    x1 + arrowLength * Math.cos(angle - arrowWidth),
    y1 + arrowLength * Math.sin(angle - arrowWidth)
  );
  cContext.closePath();
  cContext.fill();
  
  // Arrowhead at P2
  cContext.beginPath();
  cContext.moveTo(x2, y2);
  cContext.lineTo(
    x2 - arrowLength * Math.cos(angle + arrowWidth),
    y2 - arrowLength * Math.sin(angle + arrowWidth)
  );
  cContext.lineTo(
    x2 - arrowLength * Math.cos(angle - arrowWidth),
    y2 - arrowLength * Math.sin(angle - arrowWidth)
  );
  cContext.closePath();
  cContext.fill();
  
  // --- 3. Draw Rotated Text Value Label ---
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  
  const shouldRound = roundValuesCheckbox.checked;
  const labelText = formatDimensionValue(value, unit, shouldRound);
    
  cContext.save();
  cContext.translate(midX, midY);
  
  // Flip angle by 180 deg if text would be drawn upside down
  let textAngle = angle;
  if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
    textAngle += Math.PI;
  }
  cContext.rotate(textAngle);
  
  // Setup text properties (Outfit or standard monospace, sized nicely in screen pixels)
  const fontSize = Math.max(11, 13 / (viewport.scale || 1));
  cContext.font = `500 ${fontSize}px 'Space Mono', var(--font-sans), sans-serif`;
  cContext.textAlign = 'center';
  cContext.textBaseline = 'middle';
  
  // Mask behind the text so the line is split beautifully (made transparent per user request)
  /*
  const textWidth = cContext.measureText(labelText).width;
  const paddingX = Math.max(6, 8 / (viewport.scale || 1));
  const paddingY = Math.max(4, 5 / (viewport.scale || 1));
  
  cContext.fillStyle = '#0b0f19'; // dark viewport background color
  cContext.fillRect(
    -textWidth / 2 - paddingX,
    -fontSize / 2 - paddingY,
    textWidth + paddingX * 2,
    fontSize + paddingY * 2
  );
  */
  
  // Draw Text (shifted above the line to avoid obstruction)
  cContext.fillStyle = color;
  cContext.textBaseline = 'bottom';
  const textOffset = Math.max(6, 8 / (viewport.scale || 1));
  cContext.fillText(labelText, 0, -textOffset);
  
  cContext.restore();
  cContext.restore();
}

// --- Persistence Save / Load JSON ---
function exportStateToJson() {
  if (!imageLoaded) return;
  
  const state = {
    fileName: currentFile ? currentFile.name : 'floorplan.png',
    calibration: {
      pixelDistance: calibration.pixelDistance,
      realDistance: calibration.realDistance,
      unit: calibration.unit,
      scale: calibration.scale
    },
    annotations: annotations
  };
  
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `${(currentFile ? currentFile.name.split('.')[0] : 'floorplan')}_annotations.json`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
}

function triggerJsonImport() {
  if (!imageLoaded) return;
  
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        try {
          const state = JSON.parse(event.target.result);
          
          if (state.calibration) {
            calibration.pixelDistance = state.calibration.pixelDistance;
            calibration.realDistance = state.calibration.realDistance;
            calibration.unit = state.calibration.unit || 'm';
            calibration.scale = state.calibration.scale;
          }
          
          if (Array.isArray(state.annotations)) {
            annotations = state.annotations;
          }
          
          updateUI();
          requestAnimationFrame(drawCanvas);
          alert("Annotations successfully imported!");
        } catch (err) {
          alert("Error parsing JSON state: " + err.message);
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function clearAllWorkspace() {
  if (!imageLoaded) return;
  
  if (confirm("Are you sure you want to clear all annotations and calibration settings?")) {
    annotations = [];
    calibration.pixelDistance = null;
    calibration.realDistance = null;
    calibration.scale = null;
    calibration.unit = 'm';
    
    updateUI();
    requestAnimationFrame(drawCanvas);
  }
}

// --- High-Resolution Static Image Export ---
function exportAnnotatedImage() {
  if (!imageLoaded) return;
  
  // Show spinner while generating
  loadingSpinner.style.display = 'flex';
  document.querySelector('#loading-spinner p').textContent = 'Generating high-res export...';
  
  setTimeout(() => {
    try {
      // 1. Create a hidden canvas matching original image resolution
      const exportCanvas = document.createElement('canvas');
      const exportCtx = exportCanvas.getContext('2d');
      
      const nativeWidth = img.naturalWidth;
      const nativeHeight = img.naturalHeight;
      
      exportCanvas.width = nativeWidth;
      exportCanvas.height = nativeHeight;
      
      // 2. Draw original clean image first
      exportCtx.drawImage(img, 0, 0);
      
      // 3. Compute optimal font & visual scale factor based on image size
      // (a standard 1000px image has base font size = 14px, arrowLength = 12px)
      const baseDim = Math.max(nativeWidth, nativeHeight);
      const renderScaleFactor = baseDim / 1200; // Optimal scaling ratio
      
      // Draw each annotation scaled properly onto the high-res canvas
      annotations.forEach(anno => {
        drawHighResDimensionLine(exportCtx, anno, renderScaleFactor);
      });
      
      // 4. Download file
      const link = document.createElement('a');
      link.download = `annotated_${currentFile ? currentFile.name : 'floorplan.png'}`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
      
      loadingSpinner.style.display = 'none';
      document.querySelector('#loading-spinner p').textContent = 'Processing image...';
    } catch (err) {
      loadingSpinner.style.display = 'none';
      document.querySelector('#loading-spinner p').textContent = 'Processing image...';
      alert("Failed to export annotated image: " + err.message);
    }
  }, 100);
}

// Offscreen high-resolution annotation rendering
function drawHighResDimensionLine(expCtx, anno, fontScale) {
  const x1 = anno.x1;
  const y1 = anno.y1;
  const x2 = anno.x2;
  const y2 = anno.y2;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 2) return;
  
  const angle = Math.atan2(dy, dx);
  const color = '#10b981'; // Green for export
  
  // Scaled line, arrow and font sizes
  const lineWidth = 3.5 * fontScale;
  const arrowLength = 16 * fontScale;
  const arrowWidth = 0.3;
  const fontSize = 16 * fontScale;
  
  expCtx.save();
  expCtx.strokeStyle = color;
  expCtx.fillStyle = color;
  expCtx.lineWidth = lineWidth;
  
  // Draw Main line
  expCtx.beginPath();
  expCtx.moveTo(x1, y1);
  expCtx.lineTo(x2, y2);
  expCtx.stroke();
  
  // Arrowhead P1
  expCtx.beginPath();
  expCtx.moveTo(x1, y1);
  expCtx.lineTo(
    x1 + arrowLength * Math.cos(angle + arrowWidth),
    y1 + arrowLength * Math.sin(angle + arrowWidth)
  );
  expCtx.lineTo(
    x1 + arrowLength * Math.cos(angle - arrowWidth),
    y1 + arrowLength * Math.sin(angle - arrowWidth)
  );
  expCtx.closePath();
  expCtx.fill();
  
  // Arrowhead P2
  expCtx.beginPath();
  expCtx.moveTo(x2, y2);
  expCtx.lineTo(
    x2 - arrowLength * Math.cos(angle + arrowWidth),
    y2 - arrowLength * Math.sin(angle + arrowWidth)
  );
  expCtx.lineTo(
    x2 - arrowLength * Math.cos(angle - arrowWidth),
    y2 - arrowLength * Math.sin(angle - arrowWidth)
  );
  expCtx.closePath();
  expCtx.fill();
  
  // Render Rotated Text
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const shouldRound = roundValuesCheckbox.checked;
  const val = calibration.scale ? anno.realDistance : anno.pixelDistance;
  const unitText = calibration.scale ? anno.unit : 'px';
  const labelText = formatDimensionValue(val, unitText, shouldRound);
    
  expCtx.save();
  expCtx.translate(midX, midY);
  
  let textAngle = angle;
  if (textAngle > Math.PI / 2 || textAngle < -Math.PI / 2) {
    textAngle += Math.PI;
  }
  expCtx.rotate(textAngle);
  
  expCtx.font = `bold ${fontSize}px 'Space Mono', sans-serif`;
  expCtx.textAlign = 'center';
  expCtx.textBaseline = 'middle';
  
  const textWidth = expCtx.measureText(labelText).width;
  const paddingX = 10 * fontScale;
  const paddingY = 6 * fontScale;
  
  // Mask background (made transparent per user request)
  /*
  expCtx.fillStyle = '#0b0f19';
  expCtx.fillRect(
    -textWidth / 2 - paddingX,
    -fontSize / 2 - paddingY,
    textWidth + paddingX * 2,
    fontSize + paddingY * 2
  );
  */
  
  // Draw Text (shifted above the line to avoid obstruction)
  expCtx.fillStyle = color;
  expCtx.textBaseline = 'bottom';
  const textOffset = 10 * fontScale;
  expCtx.fillText(labelText, 0, -textOffset);
  
  expCtx.restore();
  expCtx.restore();
}

// Start drawing loop and initialize listeners
initEventListeners();

// Window Resize triggers redraw
window.addEventListener('resize', () => {
  requestAnimationFrame(drawCanvas);
});
