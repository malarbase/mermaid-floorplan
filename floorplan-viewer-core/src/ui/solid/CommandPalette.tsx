/**
 * CommandPalette - Solid.js Command Palette Component
 *
 * A searchable command palette with keyboard navigation, categories,
 * and auth-aware command filtering.
 *
 * Features:
 * - Search filtering with createSignal() or direct accessors
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Command categories and grouping
 * - Auth-aware command filtering (lock icon for protected commands)
 */

import { createSignal, createMemo, createEffect, For, Show, onMount, onCleanup, type Accessor } from 'solid-js';

// ============================================================================
// Types
// ============================================================================

export interface Command {
  /** Unique identifier for the command */
  id: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Category for grouping */
  category?: string;
  /** Keyboard shortcut hint (e.g., "Ctrl+S") */
  shortcut?: string;
  /** Whether command requires authentication */
  requiresAuth?: boolean;
  /** Icon (emoji or class name) */
  icon?: string;
  /** Execute callback (optional - use onExecute prop of CommandPalette instead) */
  execute?: () => void;
}

/** Helper to unwrap a value that may be an accessor or plain value */
function unwrap<T>(value: T | Accessor<T> | undefined, defaultValue: T): T {
  if (value === undefined) return defaultValue;
  if (typeof value === 'function') return (value as Accessor<T>)();
  return value;
}

export interface CommandPaletteProps {
  /** List of available commands (array or accessor) */
  commands: Command[] | Accessor<Command[]>;
  /** Whether the palette is open (boolean or accessor) */
  isOpen: boolean | Accessor<boolean>;
  /** Callback when palette should close */
  onClose: () => void;
  /** Whether user is authenticated (for auth-aware filtering) */
  isAuthenticated?: boolean | Accessor<boolean>;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Callback when a command is executed */
  onExecute?: (command: Command) => void;
}

// ============================================================================
// Component
// ============================================================================

export function CommandPalette(props: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLDivElement | undefined;

  // Unwrap props
  const getIsOpen = () => unwrap(props.isOpen, false);
  const getCommands = () => unwrap(props.commands, []);
  const getIsAuthenticated = () => unwrap(props.isAuthenticated, false);

  // Filter and group commands based on search query
  const filteredCommands = createMemo(() => {
    const commands = getCommands();
    const query = searchQuery().toLowerCase().trim();
    if (!query) return commands;

    return commands.filter(cmd => {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const descMatch = cmd.description?.toLowerCase().includes(query);
      const categoryMatch = cmd.category?.toLowerCase().includes(query);
      return labelMatch || descMatch || categoryMatch;
    });
  });

  // Group commands by category
  const groupedCommands = createMemo(() => {
    const filtered = filteredCommands();
    const groups = new Map<string, Command[]>();

    for (const cmd of filtered) {
      const category = cmd.category ?? 'General';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    }

    return Array.from(groups.entries()).map(([category, commands]) => ({
      category,
      commands,
    }));
  });

  // Flatten for keyboard navigation
  const flatCommands = createMemo(() => {
    return groupedCommands().flatMap(g => g.commands);
  });

  // Reset selection when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedIndex(0);
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    const commands = flatCommands();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, commands.length - 1));
        scrollToSelected();
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        scrollToSelected();
        break;

      case 'Enter':
        e.preventDefault();
        const selected = commands[selectedIndex()];
        if (selected) {
          executeCommand(selected);
        }
        break;

      case 'Escape':
        e.preventDefault();
        props.onClose();
        break;
    }
  };

  const scrollToSelected = () => {
    if (listRef) {
      const selectedEl = listRef.querySelector('[data-selected="true"]');
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  };

  const executeCommand = (cmd: Command) => {
    // Check auth requirement
    if (cmd.requiresAuth && !getIsAuthenticated()) {
      return; // Don't execute if auth required but not authenticated
    }
    props.onClose();
    // Call onExecute callback if provided, otherwise execute directly
    if (props.onExecute) {
      props.onExecute(cmd);
    } else {
      cmd.execute?.();
    }
  };

  // Focus input when opened and reset state
  createEffect(() => {
    if (getIsOpen()) {
      setTimeout(() => inputRef?.focus(), 50);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  });

  // Handle clicks outside to close
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) {
      props.onClose();
    }
  };

  // Global escape handler
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && getIsOpen()) {
      props.onClose();
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleGlobalKeyDown);
  });

  return (
    <Show when={getIsOpen()}>
      <div
        class="fp-command-palette-backdrop"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div class="fp-command-palette">
          {/* Search Input */}
          <div class="fp-command-palette-search">
            <input
              ref={inputRef}
              type="text"
              class="fp-command-palette-input"
              placeholder={props.placeholder ?? 'Type a command...'}
              value={searchQuery()}
              onInput={(e) => handleSearchChange(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              aria-label="Search commands"
              aria-autocomplete="list"
              aria-controls="command-list"
            />
          </div>

          {/* Command List */}
          <div
            ref={listRef}
            id="command-list"
            class="fp-command-palette-list"
            role="listbox"
          >
            <Show
              when={flatCommands().length > 0}
              fallback={
                <div class="fp-command-palette-empty">
                  No commands found
                </div>
              }
            >
              <For each={groupedCommands()}>
                {(group) => (
                  <div class="fp-command-palette-group">
                    <div class="fp-command-palette-group-header">
                      {group.category}
                    </div>
                    <For each={group.commands}>
                      {(cmd) => {
                        const index = () => flatCommands().indexOf(cmd);
                        const isSelected = () => selectedIndex() === index();
                        const isDisabled = () => cmd.requiresAuth && !getIsAuthenticated();

                        return (
                          <div
                            class="fp-command-palette-item"
                            classList={{
                              'selected': isSelected(),
                              'disabled': isDisabled(),
                            }}
                            data-selected={isSelected()}
                            role="option"
                            aria-selected={isSelected()}
                            aria-disabled={isDisabled()}
                            onClick={() => !isDisabled() && executeCommand(cmd)}
                            onMouseEnter={() => setSelectedIndex(index())}
                          >
                            {/* Icon */}
                            <Show when={cmd.icon}>
                              <span class="fp-command-palette-icon">{cmd.icon}</span>
                            </Show>

                            {/* Label and Description */}
                            <div class="fp-command-palette-content">
                              <span class="fp-command-palette-label">
                                {cmd.label}
                              </span>
                              <Show when={cmd.description}>
                                <span class="fp-command-palette-description">
                                  {cmd.description}
                                </span>
                              </Show>
                            </div>

                            {/* Right side: shortcut or lock icon */}
                            <div class="fp-command-palette-right">
                              <Show when={cmd.requiresAuth && !getIsAuthenticated()}>
                                <span class="fp-command-palette-lock" title="Requires authentication">
                                  🔒
                                </span>
                              </Show>
                              <Show when={cmd.shortcut}>
                                <span class="fp-command-palette-shortcut">
                                  {cmd.shortcut}
                                </span>
                              </Show>
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                )}
              </For>
            </Show>
          </div>

          {/* Footer */}
          <div class="fp-command-palette-footer">
            <span>
              <kbd>↑↓</kbd> Navigate
            </span>
            <span>
              <kbd>↵</kbd> Select
            </span>
            <span>
              <kbd>Esc</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </Show>
  );
}

export default CommandPalette;
