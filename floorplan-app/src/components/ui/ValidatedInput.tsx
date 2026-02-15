import { type JSX, Show } from 'solid-js';

export interface ValidatedInputProps {
  /** Current value */
  value: string;
  /** Called when value changes */
  onInput: (value: string) => void;
  /** Whether the current value passes validation (undefined = no state shown) */
  isValid?: boolean;
  /** Validation message shown below the input */
  validationMessage?: string;
  /** Validation message severity */
  validationSeverity?: 'warning' | 'error' | 'info' | 'success';
  /** Placeholder text */
  placeholder?: string;
  /** Max character length */
  maxLength?: number;
  /** Input type */
  type?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Autofocus on mount */
  autofocus?: boolean;
  /** Extra CSS classes on the input element */
  class?: string;
  /** Min length before validation styling kicks in (default: 1) */
  minLengthForValidation?: number;
  /** Label above the input */
  label?: string;
  /** Label hint (right-aligned) */
  labelAlt?: string;
  /** Content prepended before the input (e.g. prefix text in a join group) */
  prefix?: JSX.Element;
}

/**
 * Input with built-in validation state styling and message display.
 *
 * Shows `input-success` / `input-error` border colors and a validation
 * message below the input, following the DaisyUI form-control pattern.
 *
 * @example
 * ```tsx
 * <ValidatedInput
 *   value={name()}
 *   onInput={setName}
 *   isValid={isNameValid()}
 *   validationMessage={nameError()}
 *   placeholder="Enter a name"
 *   label="Version Name"
 *   labelAlt="1-50 characters"
 * />
 * ```
 */
export function ValidatedInput(props: ValidatedInputProps) {
  const minLen = () => props.minLengthForValidation ?? 1;

  const validationClass = () => {
    if (props.isValid === undefined || props.value.length < minLen()) return '';
    return props.isValid ? 'input-success' : 'input-error';
  };

  const messageClass = () => {
    switch (props.validationSeverity) {
      case 'error':
        return 'text-error';
      case 'success':
        return 'text-success';
      case 'info':
        return 'text-info';
      default:
        return 'text-warning';
    }
  };

  const inputElement = (
    <input
      type={props.type ?? 'text'}
      placeholder={props.placeholder}
      class={`input input-bordered w-full ${validationClass()} ${props.prefix ? 'join-item' : ''} ${props.class ?? ''}`}
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value)}
      maxLength={props.maxLength}
      required={props.required}
      disabled={props.disabled}
      autofocus={props.autofocus}
    />
  );

  return (
    <div class="form-control w-full">
      <Show when={props.label || props.labelAlt}>
        <label class="label">
          <Show when={props.label}>
            <span class="label-text">{props.label}</span>
          </Show>
          <Show when={props.labelAlt}>
            <span class="label-text-alt text-base-content/50">{props.labelAlt}</span>
          </Show>
        </label>
      </Show>

      <Show when={props.prefix} fallback={inputElement}>
        <div class="join w-full">
          {props.prefix}
          {inputElement}
        </div>
      </Show>

      <label class="label">
        <Show when={props.validationMessage}>
          <span class={`label-text-alt ${messageClass()}`}>{props.validationMessage}</span>
        </Show>
      </label>
    </div>
  );
}

export default ValidatedInput;
