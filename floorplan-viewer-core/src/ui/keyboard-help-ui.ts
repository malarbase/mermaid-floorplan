/**
 * Keyboard shortcuts help overlay UI component
 */
import { injectStyles } from './styles.js';

export interface KeyboardShortcut {
  keys: string[];
  description: string;
}

export interface KeyboardHelpSection {
  title: string;
  shortcuts: KeyboardShortcut[];
}

export interface KeyboardHelpUIOptions {
  sections?: KeyboardHelpSection[];
  footerText?: string;
  onClose?: () => void;
}

export interface KeyboardHelpUI {
  element: HTMLElement;
  panel: HTMLElement;
  closeButton: HTMLButtonElement;
  show: () => void;
  hide: () => void;
  toggle: () => void;
  isVisible: () => boolean;
}

// Default keyboard shortcuts
const DEFAULT_SECTIONS: KeyboardHelpSection[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['W', 'A', 'S', 'D'], description: 'Pan camera' },
      { keys: ['Q', 'E'], description: 'Move down / up' },
      { keys: ['+', '-'], description: 'Zoom in / out' },
      { keys: ['Shift'], description: 'Precision mode' },
    ],
  },
  {
    title: 'Camera Views',
    shortcuts: [
      { keys: ['1'], description: 'Front view' },
      { keys: ['3'], description: 'Right view' },
      { keys: ['7'], description: 'Top view' },
      { keys: ['5'], description: 'Toggle perspective/ortho' },
    ],
  },
  {
    title: 'Focus & Pivot',
    shortcuts: [
      { keys: ['Home'], description: 'Reset camera' },
      { keys: ['F'], description: 'Frame geometry' },
      { keys: ['C'], description: 'Center pivot' },
      { keys: ['P'], description: 'Toggle pivot indicator' },
    ],
  },
  {
    title: 'Selection',
    shortcuts: [
      { keys: ['V'], description: 'Toggle selection mode' },
      { keys: ['Click'], description: 'Select' },
      { keys: ['Shift', 'Click'], description: 'Add to selection' },
      { keys: ['Esc'], description: 'Deselect all' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [
      { keys: ['H', '?'], description: 'Toggle this help' },
    ],
  },
];

/**
 * Create keyboard shortcuts help overlay UI
 */
export function createKeyboardHelpUI(options: KeyboardHelpUIOptions = {}): KeyboardHelpUI {
  injectStyles();
  
  const {
    sections = DEFAULT_SECTIONS,
    footerText = 'Press H or ? to toggle this help',
    onClose,
  } = options;
  
  const overlay = document.createElement('div');
  overlay.className = 'fp-keyboard-help-overlay';
  overlay.id = 'keyboard-help-overlay';
  
  const panel = document.createElement('div');
  panel.className = 'fp-keyboard-help-panel';
  
  // Header with title and close button
  const header = document.createElement('h2');
  
  const titleSpan = document.createElement('span');
  titleSpan.textContent = '⌨️ Keyboard Shortcuts';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'fp-keyboard-help-close';
  closeButton.id = 'keyboard-help-close';
  closeButton.title = 'Close';
  closeButton.textContent = '×';
  closeButton.addEventListener('click', () => {
    overlay.classList.remove('visible');
    onClose?.();
  });
  
  header.appendChild(titleSpan);
  header.appendChild(closeButton);
  panel.appendChild(header);
  
  // Sections
  sections.forEach((section) => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'fp-shortcut-section';
    
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = section.title;
    sectionEl.appendChild(sectionTitle);
    
    const list = document.createElement('div');
    list.className = 'fp-shortcut-list';
    
    section.shortcuts.forEach((shortcut) => {
      const item = document.createElement('div');
      item.className = 'fp-shortcut-item';
      
      const keysContainer = document.createElement('span');
      keysContainer.className = 'fp-shortcut-keys';
      
      shortcut.keys.forEach((key) => {
        const kbd = document.createElement('span');
        kbd.className = 'fp-kbd';
        kbd.textContent = key;
        keysContainer.appendChild(kbd);
      });
      
      const desc = document.createElement('span');
      desc.className = 'fp-shortcut-desc';
      desc.textContent = shortcut.description;
      
      item.appendChild(keysContainer);
      item.appendChild(desc);
      list.appendChild(item);
    });
    
    sectionEl.appendChild(list);
    panel.appendChild(sectionEl);
  });
  
  // Footer
  const footer = document.createElement('div');
  footer.className = 'fp-help-footer';
  footer.textContent = footerText;
  panel.appendChild(footer);
  
  overlay.appendChild(panel);
  
  // Close on overlay click (outside panel)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('visible');
      onClose?.();
    }
  });
  
  return {
    element: overlay,
    panel,
    closeButton,
    show: () => overlay.classList.add('visible'),
    hide: () => overlay.classList.remove('visible'),
    toggle: () => overlay.classList.toggle('visible'),
    isVisible: () => overlay.classList.contains('visible'),
  };
}

