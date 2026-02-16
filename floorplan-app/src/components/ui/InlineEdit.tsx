import { createEffect, createSignal, type JSX, Show } from 'solid-js';

export interface InlineEditProps {
  /** Current value */
  value: string;
  /** Called when the user saves a new value */
  onSave: (newValue: string) => void | Promise<void>;
  /** Render custom display view. Default: text span */
  displayAs?: (value: string) => JSX.Element;
  /** Placeholder text */
  placeholder?: string;
  /** Return error string or undefined */
  validate?: (value: string) => string | undefined;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Extra CSS class on the wrapper */
  class?: string;
}

/**
 * Inline-editable text field designed for compact contexts like table cells.
 *
 * Display mode shows the value (or a custom `displayAs` render) with a pencil
 * icon on hover. Click to enter edit mode with an input field.
 *
 * - **Enter** saves the value
 * - **Escape** cancels and reverts
 * - **Blur** saves the value
 *
 * @example
 * ```tsx
 * <InlineEdit
 *   value={username()}
 *   onSave={async (v) => await updateUsername(v)}
 *   validate={(v) => v.length < 2 ? "Too short" : undefined}
 *   placeholder="Enter name"
 * />
 * ```
 */
export function InlineEdit(props: InlineEditProps) {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal('');
  const [error, setError] = createSignal<string | undefined>();
  const [saving, setSaving] = createSignal(false);

  // Sync draft when entering edit mode
  createEffect(() => {
    if (editing()) {
      setDraft(props.value);
      setError(undefined);
    }
  });

  const enterEdit = () => {
    if (props.disabled || saving()) return;
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError(undefined);
  };

  const save = async () => {
    const value = draft();

    if (props.validate) {
      const err = props.validate(value);
      if (err) {
        setError(err);
        return;
      }
    }

    // Skip save if value hasn't changed
    if (value === props.value) {
      setEditing(false);
      return;
    }

    const result = props.onSave(value);
    if (result instanceof Promise) {
      setSaving(true);
      try {
        await result;
      } finally {
        setSaving(false);
      }
    }

    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  return (
    <div class={`inline-flex flex-col ${props.class ?? ''}`}>
      <Show
        when={editing()}
        fallback={
          <span
            class={`group inline-flex items-center gap-1 ${props.disabled ? '' : 'cursor-pointer'}`}
            onClick={enterEdit}
          >
            <Show
              when={props.displayAs}
              fallback={
                <span class={props.value ? '' : 'text-base-content/40'}>
                  {props.value || props.placeholder || '\u2014'}
                </span>
              }
            >
              {(displayFn) => displayFn()(props.value)}
            </Show>
            <Show when={!props.disabled}>
              <svg
                class="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </Show>
          </span>
        }
      >
        <div class="inline-flex items-center gap-1">
          <input
            type="text"
            class={`input input-bordered input-sm ${error() ? 'input-error' : ''}`}
            value={draft()}
            onInput={(e) => {
              setDraft(e.currentTarget.value);
              setError(undefined);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => save()}
            placeholder={props.placeholder}
            disabled={saving()}
            autofocus
          />
          <Show when={saving()}>
            <span class="loading loading-spinner loading-xs" />
          </Show>
        </div>
        <Show when={error()}>
          <span class="text-error text-xs mt-0.5">{error()}</span>
        </Show>
      </Show>
    </div>
  );
}

export default InlineEdit;
