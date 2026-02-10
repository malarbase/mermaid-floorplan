/**
 * Shared positioning fieldset — used by AddRoomDialog and PropertiesPanel.
 *
 * Fully controlled: receives all values as props, emits changes via onChange.
 * Supports both absolute (x, y) and relative (direction, reference, gap, align).
 */
import { createMemo, For, Show } from 'solid-js';
import {
  ALIGNMENT_OPTIONS,
  type AlignmentDirection,
  DIRECTION_LABELS,
  getAlignmentOptions,
  type PositioningMode,
  RELATIVE_DIRECTIONS,
  type RelativeDirection,
} from './dsl-constants';

// ─── Data types ─────────────────────────────────────────────────────

export interface PositioningData {
  mode: PositioningMode;
  x: number;
  y: number;
  direction: RelativeDirection;
  reference: string;
  gap: number;
  align: AlignmentDirection | '';
}

export const DEFAULT_POSITIONING: PositioningData = {
  mode: 'absolute',
  x: 0,
  y: 0,
  direction: 'right-of',
  reference: '',
  gap: 0,
  align: '',
};

// ─── Props ──────────────────────────────────────────────────────────

interface PositioningFieldsetProps {
  data: PositioningData;
  existingRooms: string[];
  onChange: (data: PositioningData) => void;
  /** Use compact sizing (xs) for properties panel */
  compact?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────

export default function PositioningFieldset(props: PositioningFieldsetProps) {
  const alignOptions = createMemo(() => getAlignmentOptions(props.data.direction));
  const hasRooms = createMemo(() => props.existingRooms.length > 0);

  const effectiveReference = createMemo(() => {
    if (props.data.reference) return props.data.reference;
    return props.existingRooms[0] ?? '';
  });

  const update = (patch: Partial<PositioningData>) => {
    props.onChange({ ...props.data, ...patch });
  };

  const inputSize = () => (props.compact ? 'input-xs' : 'input-sm');
  const selectSize = () => (props.compact ? 'select-xs' : 'select-sm');
  const btnSize = () => (props.compact ? 'btn-xs' : 'btn-xs');

  // In compact mode (properties panel), commit on blur/Enter to avoid
  // excessive scene rebuilds during typing. In dialog mode, use onInput
  // for live preview of form state.
  const numberHandler = (fn: (v: number) => void) =>
    props.compact
      ? { onChange: (e: Event) => fn(Number.parseFloat((e.target as HTMLInputElement).value) || 0) }
      : { onInput: (e: Event) => fn(Number.parseFloat((e.target as HTMLInputElement).value) || 0) };

  return (
    <fieldset class="border border-base-300 rounded-lg px-3 py-2">
      <legend class="text-xs font-medium px-1 text-base-content/70">Position</legend>

      {/* Mode toggle */}
      <div class="flex gap-1 mb-3">
        <button
          type="button"
          class={`btn ${btnSize()} flex-1`}
          classList={{
            'btn-primary': props.data.mode === 'relative',
            'btn-ghost': props.data.mode !== 'relative',
          }}
          onClick={() => update({ mode: 'relative' })}
        >
          Relative
        </button>
        <button
          type="button"
          class={`btn ${btnSize()} flex-1`}
          classList={{
            'btn-primary': props.data.mode === 'absolute',
            'btn-ghost': props.data.mode !== 'absolute',
          }}
          onClick={() => update({ mode: 'absolute' })}
        >
          Absolute
        </button>
      </div>

      {/* ── Relative mode ── */}
      <Show when={props.data.mode === 'relative'}>
        <div class="space-y-2">
          {/* Direction + Reference */}
          <div class="flex gap-2">
            <div class="form-control flex-1">
              <label class="label py-0.5">
                <span class="label-text text-xs">Direction</span>
              </label>
              <select
                class={`select select-bordered ${selectSize()} w-full`}
                value={props.data.direction}
                onChange={(e) => {
                  update({ direction: e.target.value as RelativeDirection, align: '' });
                }}
              >
                <For each={[...RELATIVE_DIRECTIONS]}>
                  {(dir) => <option value={dir}>{DIRECTION_LABELS[dir]}</option>}
                </For>
              </select>
            </div>

            <div class="form-control flex-1">
              <label class="label py-0.5">
                <span class="label-text text-xs">Reference Room</span>
              </label>
              <Show
                when={hasRooms()}
                fallback={
                  <input
                    type="text"
                    class={`input input-bordered ${inputSize()} w-full`}
                    value={props.data.reference}
                    onInput={(e) => update({ reference: e.target.value })}
                    placeholder="Room name"
                  />
                }
              >
                <select
                  class={`select select-bordered ${selectSize()} w-full`}
                  value={effectiveReference()}
                  onChange={(e) => update({ reference: e.target.value })}
                >
                  <For each={props.existingRooms}>
                    {(name) => <option value={name}>{name}</option>}
                  </For>
                </select>
              </Show>
            </div>
          </div>

          {/* Gap + Alignment */}
          <div class="flex gap-2">
            <div class="form-control flex-1">
              <label class="label py-0.5">
                <span class="label-text text-xs">Gap</span>
              </label>
              <input
                type="number"
                class={`input input-bordered ${inputSize()} w-full`}
                value={props.data.gap}
                min={0}
                step={0.5}
                {...numberHandler((v) => update({ gap: v }))}
              />
            </div>

            <Show when={alignOptions().length > 0}>
              <div class="form-control flex-1">
                <label class="label py-0.5">
                  <span class="label-text text-xs">Align</span>
                </label>
                <select
                  class={`select select-bordered ${selectSize()} w-full`}
                  value={props.data.align}
                  onChange={(e) => update({ align: e.target.value as AlignmentDirection | '' })}
                >
                  <option value="">Default</option>
                  <For each={alignOptions()}>
                    {(opt) => <option value={opt}>{opt[0].toUpperCase() + opt.slice(1)}</option>}
                  </For>
                </select>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* ── Absolute mode ── */}
      <Show when={props.data.mode === 'absolute'}>
        <div class="flex gap-3">
          <div class="form-control flex-1">
            <label class="label py-0.5">
              <span class="label-text text-xs">X</span>
            </label>
            <input
              type="number"
              class={`input input-bordered ${inputSize()} w-full`}
              value={props.data.x}
              step={1}
              {...numberHandler((v) => update({ x: v }))}
            />
          </div>
          <div class="form-control flex-1">
            <label class="label py-0.5">
              <span class="label-text text-xs">Y</span>
            </label>
            <input
              type="number"
              class={`input input-bordered ${inputSize()} w-full`}
              value={props.data.y}
              step={1}
              {...numberHandler((v) => update({ y: v }))}
            />
          </div>
        </div>
      </Show>
    </fieldset>
  );
}
