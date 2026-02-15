/**
 * Shortcut info panel - compact persistent panel showing basic navigation hints
 *
 * This panel displays quick reference shortcuts and hints users to press H/?
 * for the full keyboard shortcuts overlay.
 */
import { injectStyles } from './styles.js';

export interface ShortcutItem {
  label: string;
  description: string;
}

export interface ShortcutInfoUIOptions {
  /** Panel title */
  title?: string;
  /** List of shortcuts to display */
  shortcuts?: ShortcutItem[];
  /** Hint text at bottom (supports HTML) */
  helpHint?: string;
  /** Initially visible (default: true) */
  visible?: boolean;
}

export interface ShortcutInfoUI {
  /** The panel element */
  element: HTMLElement;
  /** Show the panel */
  show: () => void;
  /** Hide the panel */
  hide: () => void;
  /** Set visibility */
  setVisible: (visible: boolean) => void;
  /** Check if visible */
  isVisible: () => boolean;
}

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { label: 'Left Click', description: 'Rotate' },
  { label: 'Right Click', description: 'Pan' },
  { label: 'Scroll', description: 'Zoom' },
  { label: 'WASD', description: 'Pan | Q/E: Up/Down' },
];

/**
 * Create a shortcut info panel UI component
 */
export function createShortcutInfoUI(options: ShortcutInfoUIOptions = {}): ShortcutInfoUI {
  injectStyles();

  const {
    title = 'Floorplan 3D Viewer',
    shortcuts = DEFAULT_SHORTCUTS,
    helpHint = 'Press <b>?</b> or <b>H</b> for shortcuts',
    visible = true,
  } = options;

  const panel = document.createElement('div');
  panel.className = 'fp-shortcut-info';
  panel.id = 'info';

  // Title
  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  panel.appendChild(titleEl);

  // Shortcuts list
  shortcuts.forEach(({ label, description }) => {
    const p = document.createElement('p');
    p.textContent = `${label}: ${description}`;
    panel.appendChild(p);
  });

  // Help hint
  const hint = document.createElement('p');
  hint.className = 'fp-shortcut-info-hint';
  hint.innerHTML = helpHint;
  panel.appendChild(hint);

  // Initial visibility
  if (!visible) {
    panel.style.display = 'none';
  }

  return {
    element: panel,
    show: () => {
      panel.style.display = 'block';
    },
    hide: () => {
      panel.style.display = 'none';
    },
    setVisible: (v) => {
      panel.style.display = v ? 'block' : 'none';
    },
    isVisible: () => panel.style.display !== 'none',
  };
}
