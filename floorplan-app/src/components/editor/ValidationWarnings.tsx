import { createSignal, For, Show } from 'solid-js';

export interface ValidationWarning {
  message: string;
  line?: number;
  column?: number;
}

interface ValidationWarningsProps {
  warnings: ValidationWarning[];
  /** Called when user clicks a warning to jump to that line */
  onWarningClick?: (warning: ValidationWarning) => void;
  /** Controlled collapsed state (if omitted, uses internal state) */
  collapsed?: boolean;
  /** Called when the user toggles collapse */
  onToggle?: () => void;
}

/**
 * Collapsible panel showing DSL validation warnings.
 * Supports both controlled (collapsed + onToggle) and uncontrolled modes.
 */
export default function ValidationWarnings(props: ValidationWarningsProps) {
  const [localCollapsed, setLocalCollapsed] = createSignal(false);

  // Use controlled props if provided, otherwise fall back to local state
  const isCollapsed = () => props.collapsed ?? localCollapsed();
  const toggle = () => {
    if (props.onToggle) {
      props.onToggle();
    } else {
      setLocalCollapsed((c) => !c);
    }
  };

  return (
    <Show when={props.warnings.length > 0}>
      <div class="bg-base-200 border-t-2 border-warning">
        {/* Header — always visible */}
        <button
          class="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-warning cursor-pointer hover:bg-base-300 transition-colors"
          onClick={toggle}
          aria-expanded={!isCollapsed()}
          aria-label="Toggle warnings panel"
        >
          <span class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {props.warnings.length} warning{props.warnings.length !== 1 ? 's' : ''}
          </span>
          <span class="text-[10px] opacity-60">{isCollapsed() ? '▼' : '▲'}</span>
        </button>

        {/* Warning list — collapsible */}
        <Show when={!isCollapsed()}>
          <div class="max-h-28 overflow-y-auto border-t border-base-300">
            <For each={props.warnings}>
              {(warning) => (
                <div
                  class={`flex items-start gap-2 px-3 py-1.5 text-xs text-base-content/80 border-b border-base-300/50 last:border-b-0 ${
                    props.onWarningClick
                      ? 'cursor-pointer hover:bg-base-300 active:bg-base-300/80'
                      : ''
                  }`}
                  onClick={() => props.onWarningClick?.(warning)}
                  role={props.onWarningClick ? 'button' : undefined}
                  tabIndex={props.onWarningClick ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      props.onWarningClick?.(warning);
                    }
                  }}
                >
                  <Show when={warning.line}>
                    <span class="text-warning font-mono whitespace-nowrap shrink-0">
                      L{warning.line}
                    </span>
                  </Show>
                  <span class="break-words">{warning.message}</span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}

interface ParseErrorBannerProps {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * Thin error banner shown at the top of the editor when DSL has parse errors.
 */
export function ParseErrorBanner(props: ParseErrorBannerProps) {
  return (
    <Show when={props.hasError}>
      <div class="flex items-center gap-2 px-3 py-1.5 bg-base-200 border-b-2 border-error text-xs text-error">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span class="truncate">{props.errorMessage || 'Parse error in DSL'}</span>
      </div>
    </Show>
  );
}
