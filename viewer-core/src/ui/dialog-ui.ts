/**
 * Dialog UI component for creating modal dialogs
 * Uses .fp-dialog-* classes from shared-styles.css
 */

import { injectStyles } from './styles.js';

export interface DialogField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  value?: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface DialogConfig {
  title: string;
  fields?: DialogField[];
  message?: string;
  primaryAction?: {
    label: string;
    variant?: 'primary' | 'success' | 'danger';
    onClick?: (values: Record<string, string>) => void;
  };
  cancelAction?: {
    label?: string;
    onClick?: () => void;
  };
  onClose?: () => void;
}

export interface DialogUI {
  element: HTMLElement;
  show: () => void;
  hide: () => void;
  getValues: () => Record<string, string>;
  setError: (message: string) => void;
  clearError: () => void;
  focus: () => void;
  destroy: () => void;
}

/**
 * Create a modal dialog UI
 */
export function createDialogUI(config: DialogConfig): DialogUI {
  injectStyles();
  
  const { title, fields = [], message, primaryAction, cancelAction, onClose } = config;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'fp-dialog-overlay';
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'fp-dialog';
  
  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'fp-dialog-title';
  titleEl.textContent = title;
  dialog.appendChild(titleEl);
  
  // Message (if provided)
  if (message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'fp-dialog-message';
    messageEl.textContent = message;
    messageEl.style.marginBottom = '16px';
    messageEl.style.color = 'inherit';
    messageEl.style.fontSize = '13px';
    dialog.appendChild(messageEl);
  }
  
  // Fields
  const fieldInputs: Map<string, HTMLInputElement | HTMLSelectElement> = new Map();
  
  fields.forEach(field => {
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'fp-dialog-field';
    
    const label = document.createElement('label');
    label.htmlFor = `dialog-field-${field.name}`;
    label.textContent = field.label;
    fieldContainer.appendChild(label);
    
    let input: HTMLInputElement | HTMLSelectElement;
    
    if (field.type === 'select' && field.options) {
      input = document.createElement('select');
      input.className = 'fp-select';
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (String(field.value) === opt.value) {
          option.selected = true;
        }
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type;
      if (field.placeholder) input.placeholder = field.placeholder;
      if (field.value !== undefined) input.value = String(field.value);
      if (field.type === 'number') {
        if (field.min !== undefined) input.min = String(field.min);
        if (field.max !== undefined) input.max = String(field.max);
        if (field.step !== undefined) input.step = String(field.step);
      }
    }
    
    input.id = `dialog-field-${field.name}`;
    input.name = field.name;
    fieldContainer.appendChild(input);
    fieldInputs.set(field.name, input);
    dialog.appendChild(fieldContainer);
  });
  
  // Error message
  const errorEl = document.createElement('div');
  errorEl.className = 'fp-dialog-error';
  dialog.appendChild(errorEl);
  
  // Buttons
  const buttons = document.createElement('div');
  buttons.className = 'fp-dialog-buttons';
  
  if (cancelAction) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'fp-dialog-btn cancel';
    cancelBtn.textContent = cancelAction.label || 'Cancel';
    cancelBtn.addEventListener('click', () => {
      hide();
      cancelAction.onClick?.();
    });
    buttons.appendChild(cancelBtn);
  }
  
  if (primaryAction) {
    const primaryBtn = document.createElement('button');
    primaryBtn.className = `fp-dialog-btn ${primaryAction.variant || 'primary'}`;
    primaryBtn.textContent = primaryAction.label;
    primaryBtn.addEventListener('click', () => {
      primaryAction.onClick?.(getValues());
    });
    buttons.appendChild(primaryBtn);
  }
  
  dialog.appendChild(buttons);
  overlay.appendChild(dialog);
  
  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hide();
      onClose?.();
    }
  });
  
  // Escape to close
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && overlay.classList.contains('visible')) {
      hide();
      onClose?.();
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  // Helper functions
  function show() {
    overlay.classList.add('visible');
    // Focus first input
    const firstInput = fieldInputs.values().next().value;
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }
  }
  
  function hide() {
    overlay.classList.remove('visible');
    clearError();
  }
  
  function getValues(): Record<string, string> {
    const values: Record<string, string> = {};
    fieldInputs.forEach((input, name) => {
      values[name] = input.value;
    });
    return values;
  }
  
  function setError(message: string) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }
  
  function clearError() {
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }
  
  function focus() {
    const firstInput = fieldInputs.values().next().value;
    if (firstInput) firstInput.focus();
  }
  
  function destroy() {
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
  }
  
  return {
    element: overlay,
    show,
    hide,
    getValues,
    setError,
    clearError,
    focus,
    destroy,
  };
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  warning?: {
    title: string;
    items: string[];
  };
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface ConfirmDialogUI {
  element: HTMLElement;
  show: () => void;
  hide: () => void;
  updateWarning: (title: string, items: string[]) => void;
  destroy: () => void;
}

/**
 * Create a confirmation dialog UI
 */
export function createConfirmDialogUI(config: ConfirmDialogConfig): ConfirmDialogUI {
  injectStyles();
  
  const { 
    title, 
    message, 
    warning, 
    confirmLabel = 'Confirm', 
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm, 
    onCancel 
  } = config;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'fp-dialog-overlay';
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'fp-confirm-dialog';
  
  // Title
  const titleEl = document.createElement('div');
  titleEl.className = 'fp-confirm-dialog-title';
  titleEl.textContent = title;
  dialog.appendChild(titleEl);
  
  // Message
  const messageEl = document.createElement('div');
  messageEl.className = 'fp-confirm-dialog-message';
  messageEl.textContent = message;
  dialog.appendChild(messageEl);
  
  // Warning section (optional)
  const warningEl = document.createElement('div');
  warningEl.className = 'fp-confirm-dialog-warning';
  warningEl.style.display = warning ? 'block' : 'none';
  
  const warningTitleEl = document.createElement('div');
  warningTitleEl.className = 'fp-confirm-dialog-warning-title';
  warningTitleEl.textContent = warning?.title || '';
  warningEl.appendChild(warningTitleEl);
  
  const warningList = document.createElement('ul');
  warningList.className = 'fp-confirm-dialog-warning-list';
  if (warning?.items) {
    warning.items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      warningList.appendChild(li);
    });
  }
  warningEl.appendChild(warningList);
  dialog.appendChild(warningEl);
  
  // Buttons
  const buttons = document.createElement('div');
  buttons.className = 'fp-dialog-buttons';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fp-dialog-btn cancel';
  cancelBtn.textContent = cancelLabel;
  cancelBtn.addEventListener('click', () => {
    hide();
    onCancel?.();
  });
  buttons.appendChild(cancelBtn);
  
  const confirmBtn = document.createElement('button');
  confirmBtn.className = `fp-dialog-btn ${variant}`;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.addEventListener('click', () => {
    hide();
    onConfirm();
  });
  buttons.appendChild(confirmBtn);
  
  dialog.appendChild(buttons);
  overlay.appendChild(dialog);
  
  // Click outside to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hide();
      onCancel?.();
    }
  });
  
  // Helper functions
  function show() {
    overlay.classList.add('visible');
  }
  
  function hide() {
    overlay.classList.remove('visible');
  }
  
  function updateWarning(title: string, items: string[]) {
    warningTitleEl.textContent = title;
    warningList.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      warningList.appendChild(li);
    });
    warningEl.style.display = items.length > 0 ? 'block' : 'none';
  }
  
  function destroy() {
    overlay.remove();
  }
  
  return {
    element: overlay,
    show,
    hide,
    updateWarning,
    destroy,
  };
}
