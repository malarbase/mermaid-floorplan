/**
 * Shared CSS styles for viewer UI components
 * These styles support both light and dark themes via body.dark-theme selector
 */

export const SHARED_STYLES = `
/* === Base Styles === */
* {
  box-sizing: border-box;
}

/* === Control Panel === */
.fp-control-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.95);
  padding: 0;
  border-radius: 10px;
  width: 260px;
  max-height: calc(100vh - 20px);
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 13px;
}

body.dark-theme .fp-control-panel {
  background: rgba(40, 40, 40, 0.95);
}

/* === Collapsible Sections === */
.fp-control-section {
  border-bottom: 1px solid #e0e0e0;
}

.fp-control-section:last-child {
  border-bottom: none;
}

body.dark-theme .fp-control-section {
  border-bottom-color: #444;
}

.fp-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  background: #f8f8f8;
  font-weight: 600;
  font-size: 13px;
  color: #333;
  transition: background 0.2s;
}

.fp-section-header:hover {
  background: #f0f0f0;
}

.fp-section-header::after {
  content: '▼';
  font-size: 10px;
  transition: transform 0.2s;
}

.fp-control-section.collapsed .fp-section-header::after {
  transform: rotate(-90deg);
}

body.dark-theme .fp-section-header {
  background: #333;
  color: #e0e0e0;
}

body.dark-theme .fp-section-header:hover {
  background: #3a3a3a;
}

.fp-section-content {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fp-control-section.collapsed .fp-section-content {
  display: none;
}

/* === Control Groups === */
.fp-control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fp-control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fp-label {
  font-size: 12px;
  font-weight: 500;
  color: #555;
}

body.dark-theme .fp-label {
  color: #aaa;
}

/* === Slider Control === */
.fp-slider-value {
  font-size: 11px;
  color: #888;
  min-width: 35px;
  text-align: right;
}

body.dark-theme .fp-slider-value {
  color: #888;
}

.fp-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  -webkit-appearance: none;
  background: #ddd;
}

.fp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4a90d9;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

body.dark-theme .fp-slider {
  background: #555;
}

/* === Buttons === */
.fp-btn {
  padding: 8px 12px;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.fp-btn:hover {
  background: #3a7fc8;
}

.fp-btn-secondary {
  background: #666;
}

.fp-btn-secondary:hover {
  background: #555;
}

body.dark-theme .fp-btn {
  background: #4a90d9;
}

body.dark-theme .fp-btn:hover {
  background: #5aa0e9;
}

body.dark-theme .fp-btn-secondary {
  background: #555;
}

body.dark-theme .fp-btn-secondary:hover {
  background: #666;
}

.fp-btn-group {
  display: flex;
  gap: 8px;
}

.fp-btn-group .fp-btn {
  flex: 1;
}

/* === Checkbox === */
.fp-checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fp-checkbox-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.fp-checkbox-row label {
  cursor: pointer;
  flex: 1;
  font-size: 12px;
  color: #555;
}

body.dark-theme .fp-checkbox-row label {
  color: #aaa;
}

/* === Select === */
.fp-select {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
  cursor: pointer;
}

body.dark-theme .fp-select {
  background: #333;
  border-color: #555;
  color: #e0e0e0;
}

/* === Floor List === */
.fp-floor-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fp-floor-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.fp-floor-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.fp-floor-item label {
  cursor: pointer;
  flex: 1;
  font-size: 12px;
  color: #333;
}

body.dark-theme .fp-floor-item label {
  color: #ccc;
}

.fp-floor-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.fp-floor-actions .fp-btn {
  flex: 1;
  padding: 6px 8px;
  font-size: 11px;
}

.fp-no-floors {
  color: #888;
  font-size: 11px;
  font-style: italic;
}

/* === Annotation Labels (CSS2D) === */
.area-label {
  background: rgba(74, 144, 217, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}

.dimension-label {
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  white-space: nowrap;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.width-label {
  background: rgba(0, 150, 136, 0.9);
}

.depth-label {
  background: rgba(255, 152, 0, 0.9);
}

.height-label {
  background: rgba(156, 39, 176, 0.9);
}

/* === Floor Summary Panel === */
.fp-floor-summary-panel {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  font-size: 12px;
  max-width: 300px;
  display: none;
  transition: left 0.3s ease;
}

body.dark-theme .fp-floor-summary-panel {
  background: rgba(40, 40, 40, 0.95);
}

.fp-floor-summary-panel.visible {
  display: block;
}

.floor-summary-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
  color: #333;
}

body.dark-theme .floor-summary-title {
  color: #e0e0e0;
}

.floor-summary-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

body.dark-theme .floor-summary-item {
  border-bottom-color: #444;
}

.floor-summary-item:last-child {
  border-bottom: none;
}

.floor-name {
  font-weight: 500;
  color: #4a90d9;
  margin-bottom: 4px;
}

.floor-stats {
  display: flex;
  gap: 12px;
  color: #666;
}

body.dark-theme .floor-stats {
  color: #999;
}

/* === 2D Overlay === */
.fp-overlay-2d {
  position: absolute;
  bottom: 10px;
  left: 10px;
  width: 280px;
  height: 220px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  overflow: hidden;
  z-index: 50;
  display: none;
  transition: left 0.3s ease, bottom 0.3s ease;
}

.fp-overlay-2d.visible {
  display: block;
}

body.dark-theme .fp-overlay-2d {
  background: rgba(40, 40, 40, 0.95);
}

.fp-overlay-2d-header {
  background: #f8f8f8;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
}

.fp-overlay-2d-header:active {
  cursor: grabbing;
}

body.dark-theme .fp-overlay-2d-header {
  background: #333;
  color: #eee;
  border-bottom-color: #444;
}

.fp-overlay-2d-close {
  background: none;
  border: none;
  font-size: 18px;
  line-height: 1;
  color: #666;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.fp-overlay-2d-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

body.dark-theme .fp-overlay-2d-close {
  color: #999;
}

body.dark-theme .fp-overlay-2d-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.fp-overlay-2d.dragging {
  opacity: 0.9;
  transition: none;
}

.fp-overlay-2d-resize {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.2) 50%);
  border-radius: 0 0 8px 0;
}

.fp-overlay-2d-resize:hover {
  background: linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.4) 50%);
}

body.dark-theme .fp-overlay-2d-resize {
  background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.2) 50%);
}

body.dark-theme .fp-overlay-2d-resize:hover {
  background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.4) 50%);
}

.fp-overlay-2d-content {
  width: 100%;
  height: calc(100% - 32px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.fp-overlay-2d-content svg {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
}

.fp-overlay-2d-empty {
  color: #888;
  font-size: 11px;
  font-style: italic;
}

/* === Keyboard Help Overlay === */
.fp-keyboard-help-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.fp-keyboard-help-overlay.visible {
  display: flex;
}

.fp-keyboard-help-panel {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  padding: 24px 32px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

body.dark-theme .fp-keyboard-help-panel {
  background: rgba(40, 40, 40, 0.98);
}

.fp-keyboard-help-panel h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

body.dark-theme .fp-keyboard-help-panel h2 {
  color: #e0e0e0;
}

.fp-keyboard-help-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1;
}

.fp-keyboard-help-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

body.dark-theme .fp-keyboard-help-close {
  color: #999;
}

body.dark-theme .fp-keyboard-help-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.fp-shortcut-section {
  margin-bottom: 20px;
}

.fp-shortcut-section:last-child {
  margin-bottom: 0;
}

.fp-shortcut-section h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #4a90d9;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

body.dark-theme .fp-shortcut-section h3 {
  color: #6ab0ff;
}

.fp-shortcut-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 24px;
}

.fp-shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fp-shortcut-keys {
  display: flex;
  gap: 4px;
  min-width: 80px;
}

.fp-kbd {
  display: inline-block;
  padding: 4px 8px;
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.2;
  color: #333;
  background: #f7f7f7;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.8);
}

body.dark-theme .fp-kbd {
  color: #e0e0e0;
  background: #333;
  border-color: #555;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

.fp-shortcut-desc {
  font-size: 13px;
  color: #555;
}

body.dark-theme .fp-shortcut-desc {
  color: #bbb;
}

.fp-help-footer {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: #888;
  text-align: center;
}

body.dark-theme .fp-help-footer {
  border-top-color: #444;
  color: #777;
}

/* === Selection Info === */
.fp-selection-info {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 100;
  border: 1px solid #333;
  min-width: 180px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.fp-selection-info.has-selection {
  border-color: #00ff00;
  background: rgba(0, 40, 0, 0.85);
}

.fp-selection-info .count {
  font-size: 20px;
  font-weight: bold;
  color: #00ff00;
  margin-bottom: 2px;
}

.fp-selection-info .details {
  color: #aaa;
  font-size: 11px;
}

/* === Selection Mode Toggle === */
.fp-selection-mode-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.75);
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.fp-selection-mode-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.fp-selection-mode-toggle label {
  font-size: 12px;
  color: #ccc;
  cursor: pointer;
}

.fp-selection-mode-indicator {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.fp-selection-mode-indicator.navigation {
  background: rgba(74, 144, 217, 0.3);
  color: #4a90d9;
}

.fp-selection-mode-indicator.selection {
  background: rgba(0, 255, 0, 0.2);
  color: #00ff00;
}

/* === Validation Warnings Panel === */
.fp-warnings-panel {
  position: absolute;
  top: calc(var(--layout-header-offset, 0px) + 10px);  /* Aligned with header */
  left: calc(var(--layout-editor-width, 0px) + 10px);
  background: #fff8e1;
  border: 1px solid #ffd54f;
  border-radius: 8px;
  max-width: 400px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  font-size: 13px;
  z-index: 100;
  display: none;
  transition: left 0.3s ease, top 0.3s ease;
}

body.dark-theme .fp-warnings-panel {
  background: #3d3520;
  border-color: #6b5c2d;
}

.fp-warnings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}

.fp-warnings-badge {
  font-weight: 600;
  color: #f57c00;
}

body.dark-theme .fp-warnings-badge {
  color: #ffb74d;
}

.fp-warnings-toggle {
  background: none;
  border: none;
  color: #f57c00;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 10px;
}

body.dark-theme .fp-warnings-toggle {
  color: #ffb74d;
}

.fp-warnings-toggle:hover {
  background: rgba(255, 152, 0, 0.1);
  border-radius: 4px;
}

.fp-warnings-list {
  padding: 0 14px 14px;
  max-height: 300px;
  overflow-y: auto;
}

.fp-warnings-panel.collapsed .fp-warnings-list {
  display: none;
}

.fp-warning-item {
  padding: 8px 0;
  border-bottom: 1px solid #ffe082;
  color: #5d4037;
  line-height: 1.4;
}

body.dark-theme .fp-warning-item {
  border-bottom-color: #5a4a20;
  color: #e0d4b8;
}

.fp-warning-item:last-child {
  border-bottom: none;
}

.fp-warning-line {
  font-weight: 600;
  color: #f57c00;
}

body.dark-theme .fp-warning-line {
  color: #ffb74d;
}

.fp-no-warnings {
  color: #888;
  font-style: italic;
}

/* === Scrollbar === */
.fp-control-panel::-webkit-scrollbar {
  width: 6px;
}

.fp-control-panel::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.fp-control-panel::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.fp-control-panel::-webkit-scrollbar-thumb:hover {
  background: #999;
}

body.dark-theme .fp-control-panel::-webkit-scrollbar-track {
  background: #2a2a2a;
}

body.dark-theme .fp-control-panel::-webkit-scrollbar-thumb {
  background: #555;
}

body.dark-theme .fp-control-panel::-webkit-scrollbar-thumb:hover {
  background: #666;
}

/* === Shortcut Info Panel === */
.fp-shortcut-info {
  position: absolute;
  bottom: 10px;
  right: 320px;  /* Offset from control panel on the right */
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  pointer-events: none;
  font-size: 13px;
  max-width: 200px;
  z-index: 50;
  transition: right 0.3s ease, bottom 0.3s ease;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

.fp-shortcut-info h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.fp-shortcut-info p {
  margin: 4px 0;
  line-height: 1.4;
}

.fp-shortcut-info-hint {
  margin-top: 8px !important;
  opacity: 0.6;
}

/* Shortcut info panel is now at bottom-right, no need to shift when editor opens */
`;

let stylesInjected = false;

/**
 * Inject shared styles into the document head
 * @param id - Optional custom ID for the style element
 */
export function injectStyles(id = 'fp-shared-styles'): void {
  if (stylesInjected) return;
  
  // Check if already injected
  if (document.getElementById(id)) {
    stylesInjected = true;
    return;
  }
  
  const style = document.createElement('style');
  style.id = id;
  style.textContent = SHARED_STYLES;
  document.head.appendChild(style);
  stylesInjected = true;
}

/**
 * Check if styles have been injected
 */
export function areStylesInjected(): boolean {
  return stylesInjected;
}

