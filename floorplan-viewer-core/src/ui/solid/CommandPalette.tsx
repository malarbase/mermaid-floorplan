/**
 * CommandPalette - Solid.js Command Palette Component
 *
 * A searchable command palette with keyboard navigation, categories,
 * and auth-aware command filtering.
 *
 * Features:
 * - Search filtering with createSignal()
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Command categories and grouping
 * - Auth-aware command filtering (lock icon for protected commands)
 */

import { createSignal, createMemo, For, Show, onMount, onCleanup } from 'solid-js';

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
  /** Execute callback */
  execute: () => void;
}

export interface CommandPaletteProps {
  /** List of available commands */
  commands: Command[];
  /** Whether the palette is open */
  isOpen: boolean;
  /** Callback when palette should close */
  onClose: () => void;
  /** Whether user is authenticated (for auth-aware filtering) */
  isAuthenticated?: boolean;
  /** Placeholder text for search input */
  placeholder?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CommandPalette(props: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;
  let listRef: HTMLDivElement | undefined;

  // Filter and group commands based on search query
  const filteredCommands = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return props.commands;

    return props.commands.filter(cmd => {
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
    if (cmd.requiresAuth && !props.isAuthenticated) {
      return; // Don't execute if auth required but not authenticated
    }
    cmd.execute();
    props.onClose();
  };

  // Focus input when opened
  onMount(() => {
    if (props.isOpen && inputRef) {
      inputRef.focus();
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
    if (e.key === 'Escape' && props.isOpen) {
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
    <Show when={props.isOpen}>
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
                        const isDisabled = () => cmd.requiresAuth && !props.isAuthenticated;

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
                              <Show when={cmd.requiresAuth && !props.isAuthenticated}>
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
