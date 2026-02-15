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

import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';

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

    return commands.filter((cmd) => {
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
    return groupedCommands().flatMap((g) => g.commands);
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
        setSelectedIndex((i) => Math.min(i + 1, commands.length - 1));
        scrollToSelected();
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        scrollToSelected();
        break;

      case 'Enter': {
        e.preventDefault();
        const selected = commands[selectedIndex()];
        if (selected) {
          executeCommand(selected);
        }
        break;
      }

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

  // ============================================================================
  // Render - Using inline Tailwind utilities + DaisyUI classes
  //
  // With @source directives in tailwind-styles.css and resolve.alias in
  // vite.config.ts pointing to source files, Tailwind v4 scans this file
  // for utility classes. Using inline utilities is the recommended approach.
  // ============================================================================
  return (
    <Show when={getIsOpen()}>
      {/* Backdrop overlay - click to close */}
      <div
        class="fixed inset-0 z-[500] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Modal container */}
        <div class="w-full max-w-xl max-h-[60vh] flex flex-col overflow-hidden rounded-2xl bg-base-100 border border-base-content/20 shadow-2xl">
          {/* Search Input */}
          <div class="p-4 border-b border-base-content/10">
            <input
              ref={inputRef}
              type="text"
              class="input input-bordered w-full text-base"
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
          <div ref={listRef} id="command-list" class="flex-1 overflow-y-auto p-2" role="listbox">
            <Show
              when={flatCommands().length > 0}
              fallback={
                <div class="py-6 text-center text-base-content/60 text-sm">No commands found</div>
              }
            >
              <For each={groupedCommands()}>
                {(group) => (
                  <div class="mb-2">
                    {/* Group header */}
                    <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
                      {group.category}
                    </div>
                    {/* Command items */}
                    <For each={group.commands}>
                      {(cmd) => {
                        const index = () => flatCommands().indexOf(cmd);
                        const isSelected = () => selectedIndex() === index();
                        const isDisabled = () => cmd.requiresAuth && !getIsAuthenticated();

                        return (
                          <div
                            class="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                            classList={{
                              'bg-base-200': isSelected(),
                              'hover:bg-base-200': !isSelected(),
                              'opacity-50 cursor-not-allowed': isDisabled(),
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
                              <span class="text-lg w-6 text-center flex-shrink-0">{cmd.icon}</span>
                            </Show>

                            {/* Label and Description */}
                            <div class="flex-1 flex flex-col gap-0.5 min-w-0">
                              <span class="font-medium text-sm text-base-content">{cmd.label}</span>
                              <Show when={cmd.description}>
                                <span class="text-xs text-base-content/60 truncate">
                                  {cmd.description}
                                </span>
                              </Show>
                            </div>

                            {/* Right side: shortcut or lock icon */}
                            <div class="flex items-center gap-2 flex-shrink-0">
                              <Show when={cmd.requiresAuth && !getIsAuthenticated()}>
                                <span class="text-sm" title="Requires authentication">
                                  🔒
                                </span>
                              </Show>
                              <Show when={cmd.shortcut}>
                                <kbd class="kbd kbd-sm">{cmd.shortcut}</kbd>
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

          {/* Footer - keyboard hints */}
          <div class="flex gap-4 px-4 py-2.5 border-t border-base-content/10 text-xs text-base-content/60">
            <span>
              <kbd class="kbd kbd-xs mr-1">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd class="kbd kbd-xs mr-1">↵</kbd> Select
            </span>
            <span>
              <kbd class="kbd kbd-xs mr-1">Esc</kbd> Close
            </span>
          </div>
        </div>
      </div>
    </Show>
  );
}

export default CommandPalette;
