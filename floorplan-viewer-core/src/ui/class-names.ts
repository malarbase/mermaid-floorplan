/**
 * Centralized DaisyUI/Tailwind class definitions
 * 
 * Why this file exists:
 * - Tailwind CSS v4 has a regression where @apply cannot reference classes
 *   defined in @layer blocks (which is how DaisyUI defines its components)
 * - This file centralizes all class strings for maintainability
 * - When Tailwind fixes @apply, we can migrate to CSS classes by updating
 *   only this file (see .cursor/skills/solidjs-daisyui/SKILL.md)
 * 
 * Usage:
 *   import { cls } from './class-names.js';
 *   button.className = cls.btn.ghost;
 * 
 * @see https://github.com/tailwindlabs/tailwindcss/issues/15139
 */

export const cls = {
  // ============================================================================
  // Buttons
  // ============================================================================
  btn: {
    /** Standard button: btn btn-sm */
    base: 'btn btn-sm',
    /** Full-width button: btn btn-sm w-full */
    full: 'btn btn-sm w-full',
    /** Primary button: btn btn-sm btn-primary */
    primary: 'btn btn-sm btn-primary',
    /** Ghost button: btn btn-sm btn-ghost */
    ghost: 'btn btn-sm btn-ghost',
    /** Full-width ghost: btn btn-sm btn-ghost w-full */
    ghostFull: 'btn btn-sm btn-ghost w-full',
    /** Extra-small ghost: btn btn-xs btn-ghost */
    ghostXs: 'btn btn-xs btn-ghost',
    /** Extra-small ghost, flexible width: btn btn-xs btn-ghost flex-1 */
    ghostXsFlex: 'btn btn-xs btn-ghost flex-1',
    /** Danger/error button: btn btn-xs btn-error */
    danger: 'btn btn-xs btn-error',
    /** Full-width danger: btn btn-xs btn-error w-full */
    dangerFull: 'btn btn-xs btn-error w-full',
    /** Success button: btn btn-sm btn-success */
    success: 'btn btn-sm btn-success',
  },

  // ============================================================================
  // Checkboxes
  // ============================================================================
  checkbox: {
    /** Wrapper label for checkbox row */
    wrapper: 'label cursor-pointer justify-start gap-2',
    /** Checkbox input: checkbox checkbox-xs */
    input: 'checkbox checkbox-xs',
    /** Label text: label-text text-xs */
    label: 'label-text text-xs',
  },

  // ============================================================================
  // Inputs
  // ============================================================================
  input: {
    /** Small bordered input: input input-xs input-bordered */
    xs: 'input input-xs input-bordered',
    /** With background: input input-xs input-bordered bg-base-200 */
    xsBg: 'input input-xs input-bordered bg-base-200',
    /** Flexible width: input input-xs input-bordered flex-1 bg-base-200 */
    xsFlex: 'input input-xs input-bordered flex-1 bg-base-200',
    /** Number input with fixed width */
    number: 'input input-xs input-bordered flex-1 bg-base-200 w-16',
  },

  // ============================================================================
  // Selects
  // ============================================================================
  select: {
    /** Small select: select select-xs */
    xs: 'select select-xs',
    /** Fixed width select: select select-xs w-24 */
    xsFixed: 'select select-xs w-24',
    /** With background: select select-xs select-bordered bg-base-200 */
    xsBg: 'select select-xs select-bordered bg-base-200',
    /** Flexible select: select select-xs select-bordered flex-1 bg-base-200 */
    xsFlex: 'select select-xs select-bordered flex-1 bg-base-200',
  },

  // ============================================================================
  // Range/Slider
  // ============================================================================
  range: {
    /** Extra-small range: range range-xs */
    xs: 'range range-xs',
  },

  // ============================================================================
  // Layout
  // ============================================================================
  layout: {
    /** Flex row with gap: flex items-center gap-2 */
    row: 'flex items-center gap-2',
    /** Space between with small text: flex justify-between text-xs */
    between: 'flex justify-between text-xs',
    /** Space between with items centered: flex justify-between items-center text-xs */
    betweenCenter: 'flex justify-between items-center text-xs',
    /** Gap with margin: flex gap-2 mt-2 */
    gapMt: 'flex gap-2 mt-2',
    /** Vertical spacing: space-y-2 */
    spaceY: 'space-y-2',
  },

  // ============================================================================
  // Text
  // ============================================================================
  text: {
    /** Label text: text-xs text-base-content/60 */
    label: 'text-xs text-base-content/60',
    /** Muted text: text-xs text-base-content/50 */
    muted: 'text-xs text-base-content/50',
    /** Small text: text-xs */
    xs: 'text-xs',
    /** Panel title: text-xs font-semibold text-base-content/60 */
    title: 'text-xs font-semibold text-base-content/60',
  },

  // ============================================================================
  // Borders/Dividers
  // ============================================================================
  border: {
    /** Bottom border: border-b border-base-content/10 */
    bottom: 'border-b border-base-content/10',
    /** Top border: border-t border-base-content/10 */
    top: 'border-t border-base-content/10',
    /** Title with bottom border and spacing */
    titleSection: 'text-xs font-semibold text-base-content/60 mb-3 pb-2 border-b border-base-content/10',
    /** Action section with top border and spacing */
    actionSection: 'mt-3 pt-2 border-t border-base-content/10',
  },

  // ============================================================================
  // Panels (high-specificity overrides exist in tailwind-styles.css)
  // ============================================================================
  panel: {
    /** Properties panel padding */
    padding: 'p-3',
  },
} as const;

// Type for autocomplete support
export type ClassNames = typeof cls;
