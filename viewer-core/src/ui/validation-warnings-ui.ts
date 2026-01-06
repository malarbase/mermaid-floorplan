/**
 * Validation warnings panel UI component
 * Shows non-fatal validation warnings from Langium DSL parsing
 */
import { injectStyles } from './styles.js';

/**
 * Warning/error type (compatible with ParseError from language package)
 */
export interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationWarningsUIOptions {
  /** Position from left edge (default: '220px' to clear control panel) */
  left?: string;
  /** Position from top edge (default: '10px') */
  top?: string;
  /** Start collapsed (default: true) */
  startCollapsed?: boolean;
  /** Callback when a warning is clicked (for navigation) */
  onWarningClick?: (warning: ValidationWarning) => void;
}

export interface ValidationWarningsUI {
  /** The root DOM element */
  element: HTMLElement;
  /** Update the warnings list */
  update: (warnings: ValidationWarning[]) => void;
  /** Clear all warnings */
  clear: () => void;
  /** Toggle collapsed state */
  toggle: () => void;
  /** Check if panel is collapsed */
  isCollapsed: () => boolean;
  /** Set collapsed state */
  setCollapsed: (collapsed: boolean) => void;
  /** Get current warnings count */
  getCount: () => number;
}

/**
 * Create validation warnings panel UI
 */
export function createValidationWarningsUI(options: ValidationWarningsUIOptions = {}): ValidationWarningsUI {
  injectStyles();
  
  const {
    left = '220px',
    top = '10px',
    startCollapsed = true,
    onWarningClick,
  } = options;
  
  let collapsed = startCollapsed;
  let currentWarnings: ValidationWarning[] = [];
  
  // Create container
  const container = document.createElement('div');
  container.className = `fp-warnings-panel${collapsed ? ' collapsed' : ''}`;
  container.id = 'warnings-panel';
  container.style.left = left;
  container.style.top = top;
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Validation warnings');
  
  // Create header
  const header = document.createElement('div');
  header.className = 'fp-warnings-header';
  
  const badge = document.createElement('span');
  badge.className = 'fp-warnings-badge';
  badge.innerHTML = '⚠️ <span class="fp-warnings-count">0</span> warnings';
  
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'fp-warnings-toggle';
  toggleBtn.textContent = collapsed ? '▼' : '▲';
  toggleBtn.setAttribute('aria-label', 'Toggle warnings panel');
  toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  
  header.appendChild(badge);
  header.appendChild(toggleBtn);
  
  // Create warnings list
  const list = document.createElement('div');
  list.className = 'fp-warnings-list';
  list.setAttribute('role', 'list');
  list.innerHTML = '<div class="fp-no-warnings">No warnings</div>';
  
  container.appendChild(header);
  container.appendChild(list);
  
  // Toggle on header click
  header.addEventListener('click', () => {
    collapsed = !collapsed;
    container.classList.toggle('collapsed', collapsed);
    toggleBtn.textContent = collapsed ? '▼' : '▲';
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  });
  
  // Update function
  const update = (warnings: ValidationWarning[]) => {
    currentWarnings = warnings;
    
    // Update count
    const countEl = container.querySelector('.fp-warnings-count');
    if (countEl) {
      countEl.textContent = String(warnings.length);
    }
    
    // Update list
    if (warnings.length === 0) {
      list.innerHTML = '<div class="fp-no-warnings">No warnings</div>';
    } else {
      list.innerHTML = warnings.map((w, index) => {
        const lineInfo = w.line ? `<span class="fp-warning-line">line ${w.line}:</span> ` : '';
        return `<div class="fp-warning-item" role="listitem" data-index="${index}" tabindex="0">${lineInfo}${escapeHtml(w.message)}</div>`;
      }).join('');
      
      // Add click handlers if callback provided
      if (onWarningClick) {
        list.querySelectorAll('.fp-warning-item').forEach((item) => {
          const index = parseInt(item.getAttribute('data-index') || '0', 10);
          item.addEventListener('click', () => {
            onWarningClick(warnings[index]);
          });
          item.addEventListener('keydown', (e) => {
            if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
              e.preventDefault();
              onWarningClick(warnings[index]);
            }
          });
          (item as HTMLElement).style.cursor = 'pointer';
        });
      }
    }
    
    // Show/hide based on warning count
    container.style.display = warnings.length > 0 ? 'block' : 'none';
  };
  
  // Clear function
  const clear = () => {
    update([]);
  };
  
  // Toggle function
  const toggle = () => {
    collapsed = !collapsed;
    container.classList.toggle('collapsed', collapsed);
    toggleBtn.textContent = collapsed ? '▼' : '▲';
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  };
  
  // isCollapsed function
  const isCollapsed = () => collapsed;
  
  // setCollapsed function
  const setCollapsed = (newCollapsed: boolean) => {
    collapsed = newCollapsed;
    container.classList.toggle('collapsed', collapsed);
    toggleBtn.textContent = collapsed ? '▼' : '▲';
    toggleBtn.setAttribute('aria-expanded', String(!collapsed));
  };
  
  // getCount function
  const getCount = () => currentWarnings.length;
  
  return {
    element: container,
    update,
    clear,
    toggle,
    isCollapsed,
    setCollapsed,
    getCount,
  };
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

