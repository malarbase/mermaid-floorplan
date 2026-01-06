/**
 * Collapsible control panel section component
 */
import { injectStyles } from './styles.js';

export interface ControlPanelSectionOptions {
  title: string;
  id?: string;
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
}

/**
 * Create a collapsible control panel section
 */
export function createControlPanelSection(options: ControlPanelSectionOptions): HTMLElement {
  injectStyles();
  
  const { title, id, collapsed = false, onToggle } = options;
  
  const section = document.createElement('div');
  section.className = 'fp-control-section';
  if (id) section.id = id;
  if (collapsed) section.classList.add('collapsed');
  
  const header = document.createElement('div');
  header.className = 'fp-section-header';
  header.textContent = title;
  
  const content = document.createElement('div');
  content.className = 'fp-section-content';
  
  header.addEventListener('click', () => {
    section.classList.toggle('collapsed');
    const isCollapsed = section.classList.contains('collapsed');
    onToggle?.(isCollapsed);
  });
  
  section.appendChild(header);
  section.appendChild(content);
  
  return section;
}

/**
 * Get the content container from a control panel section
 */
export function getSectionContent(section: HTMLElement): HTMLElement | null {
  return section.querySelector('.fp-section-content');
}

/**
 * Create the main control panel container
 */
export function createControlPanel(id = 'fp-controls'): HTMLElement {
  injectStyles();
  
  const panel = document.createElement('div');
  panel.className = 'fp-control-panel';
  panel.id = id;
  
  return panel;
}

