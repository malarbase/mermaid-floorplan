import { createMemo, createSignal, For, Show } from 'solid-js';

// ================================================================
// Types
// ================================================================

/** Relative direction keywords from the floorplan DSL grammar */
const RELATIVE_DIRECTIONS = [
  'right-of',
  'left-of',
  'above',
  'below',
  'above-right-of',
  'above-left-of',
  'below-right-of',
  'below-left-of',
] as const;

type RelativeDirection = (typeof RELATIVE_DIRECTIONS)[number];

/** Alignment options for relative positioning */
const ALIGNMENT_OPTIONS = ['top', 'bottom', 'left', 'right', 'center'] as const;
type AlignmentDirection = (typeof ALIGNMENT_OPTIONS)[number];

/** Wall presets for quick setup */
const WALL_PRESETS = {
  'all-solid': { top: 'solid', right: 'solid', bottom: 'solid', left: 'solid' },
  'open-plan': { top: 'open', right: 'open', bottom: 'open', left: 'open' },
  windowed: { top: 'window', right: 'solid', bottom: 'solid', left: 'solid' },
  custom: null, // User picks per-wall
} as const;

type WallPreset = keyof typeof WALL_PRESETS;
type WallType = 'solid' | 'open' | 'door' | 'window';
type WallConfig = { top: WallType; right: WallType; bottom: WallType; left: WallType };

export type PositioningMode = 'absolute' | 'relative';

/** Full data emitted on confirm — matches all room grammar attributes */
export interface AddRoomData {
  name: string;
  width: number;
  height: number; // size depth
  walls: WallConfig;
  positioning:
    | { mode: 'absolute'; x: number; y: number }
    | {
        mode: 'relative';
        direction: RelativeDirection;
        reference: string;
        gap?: number;
        align?: AlignmentDirection;
      };
  label?: string;
  roomHeight?: number;
}

export interface AddRoomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: AddRoomData) => void;
  /** List of existing room names for relative positioning reference dropdown */
  existingRooms?: string[];
}

// ================================================================
// Component
// ================================================================

const WALL_TYPES: WallType[] = ['solid', 'open', 'door', 'window'];

const WALL_TYPE_LABELS: Record<WallType, string> = {
  solid: 'Solid',
  open: 'Open',
  door: 'Door',
  window: 'Window',
};

/** Friendly labels for relative directions */
const DIRECTION_LABELS: Record<RelativeDirection, string> = {
  'right-of': 'Right of',
  'left-of': 'Left of',
  above: 'Above',
  below: 'Below',
  'above-right-of': 'Above-right of',
  'above-left-of': 'Above-left of',
  'below-right-of': 'Below-right of',
  'below-left-of': 'Below-left of',
};

/** Which alignment options make sense for each direction */
function getAlignmentOptions(direction: RelativeDirection): AlignmentDirection[] {
  if (direction === 'right-of' || direction === 'left-of') {
    return ['top', 'bottom', 'center'];
  }
  if (direction === 'above' || direction === 'below') {
    return ['left', 'right', 'center'];
  }
  // Diagonal directions don't have meaningful alignment
  return [];
}

function createDefaultForm(): {
  name: string;
  width: number;
  height: number;
  posMode: PositioningMode;
  x: number;
  y: number;
  direction: RelativeDirection;
  reference: string;
  gap: number;
  align: AlignmentDirection | '';
  wallPreset: WallPreset;
  walls: WallConfig;
  label: string;
  roomHeight: string;
  showAdvanced: boolean;
} {
  return {
    name: '',
    width: 10,
    height: 10,
    posMode: 'relative' as PositioningMode,
    x: 0,
    y: 0,
    direction: 'right-of' as RelativeDirection,
    reference: '',
    gap: 0,
    align: '' as AlignmentDirection | '',
    wallPreset: 'all-solid' as WallPreset,
    walls: { top: 'solid', right: 'solid', bottom: 'solid', left: 'solid' },
    label: '',
    roomHeight: '',
    showAdvanced: false,
  };
}

export default function AddRoomDialog(props: AddRoomDialogProps) {
  const [form, setForm] = createSignal(createDefaultForm());

  const rooms = createMemo(() => props.existingRooms ?? []);
  const hasRooms = createMemo(() => rooms().length > 0);

  // Auto-select first room as reference when rooms become available.
  // If user typed a manual reference, honour it even if it's not in the list.
  const effectiveReference = createMemo(() => {
    const f = form();
    if (f.reference) return f.reference; // manual or selected value
    return rooms()[0] ?? '';
  });

  const alignOptions = createMemo(() => getAlignmentOptions(form().direction));

  const canSubmit = createMemo(() => {
    const f = form();
    if (!f.name.trim()) return false;
    if (f.posMode === 'relative' && !effectiveReference()) return false;
    return true;
  });

  const update = <K extends keyof ReturnType<typeof form>>(
    key: K,
    value: ReturnType<typeof form>[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyWallPreset = (preset: WallPreset) => {
    update('wallPreset', preset);
    const presetWalls = WALL_PRESETS[preset];
    if (presetWalls) {
      update('walls', { ...presetWalls });
    }
  };

  const updateWall = (dir: keyof WallConfig, type: WallType) => {
    setForm((prev) => ({
      ...prev,
      wallPreset: 'custom' as WallPreset,
      walls: { ...prev.walls, [dir]: type },
    }));
  };

  const handleSubmit = () => {
    const f = form();
    if (!canSubmit()) return;

    const data: AddRoomData = {
      name: f.name.trim().replace(/\s+/g, ''),
      width: f.width,
      height: f.height,
      walls: { ...f.walls },
      positioning:
        f.posMode === 'absolute'
          ? { mode: 'absolute', x: f.x, y: f.y }
          : {
              mode: 'relative',
              direction: f.direction,
              reference: effectiveReference(),
              gap: f.gap > 0 ? f.gap : undefined,
              align: (f.align as AlignmentDirection) || undefined,
            },
      label: f.label.trim() || undefined,
      roomHeight: f.roomHeight ? Number.parseFloat(f.roomHeight) : undefined,
    };

    props.onConfirm(data);
    setForm(createDefaultForm());
    props.onClose();
  };

  return (
    <dialog class="modal" classList={{ 'modal-open': props.isOpen }}>
      <div class="modal-box max-w-lg max-h-[85vh] overflow-y-auto">
        <h3 class="font-bold text-lg mb-4">Add Room</h3>

        <div class="space-y-4">
          {/* ── Name ── */}
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text font-medium">Room Name</span>
            </label>
            <input
              type="text"
              class="input input-bordered input-sm"
              value={form().name}
              onInput={(e) => update('name', e.target.value)}
              placeholder="e.g., MasterBedroom"
            />
            <label class="label py-0.5">
              <span class="label-text-alt text-base-content/50">
                No spaces — used as an identifier in the DSL
              </span>
            </label>
          </div>

          {/* ── Size ── */}
          <fieldset class="border border-base-300 rounded-lg px-3 py-2">
            <legend class="text-xs font-medium px-1 text-base-content/70">Size</legend>
            <div class="flex gap-3">
              <div class="form-control flex-1">
                <label class="label py-0.5">
                  <span class="label-text text-xs">Width</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  value={form().width}
                  min={1}
                  step={1}
                  onInput={(e) => update('width', Number.parseFloat(e.target.value) || 1)}
                />
              </div>
              <div class="flex items-end pb-2 text-base-content/40">x</div>
              <div class="form-control flex-1">
                <label class="label py-0.5">
                  <span class="label-text text-xs">Depth</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered input-sm w-full"
                  value={form().height}
                  min={1}
                  step={1}
                  onInput={(e) => update('height', Number.parseFloat(e.target.value) || 1)}
                />
              </div>
            </div>
          </fieldset>

          {/* ── Positioning ── */}
          <fieldset class="border border-base-300 rounded-lg px-3 py-2">
            <legend class="text-xs font-medium px-1 text-base-content/70">Position</legend>

            {/* Mode toggle */}
            <div class="flex gap-1 mb-3">
              <button
                type="button"
                class="btn btn-xs flex-1"
                classList={{
                  'btn-primary': form().posMode === 'relative',
                  'btn-ghost': form().posMode !== 'relative',
                }}
                onClick={() => update('posMode', 'relative')}
              >
                Relative
              </button>
              <button
                type="button"
                class="btn btn-xs flex-1"
                classList={{
                  'btn-primary': form().posMode === 'absolute',
                  'btn-ghost': form().posMode !== 'absolute',
                }}
                onClick={() => update('posMode', 'absolute')}
              >
                Absolute
              </button>
            </div>

            <Show when={form().posMode === 'relative'}>
              <div class="space-y-2">
                {/* Direction + Reference */}
                <div class="flex gap-2">
                  <div class="form-control flex-1">
                    <label class="label py-0.5">
                      <span class="label-text text-xs">Direction</span>
                    </label>
                    <select
                      class="select select-bordered select-sm w-full"
                      value={form().direction}
                      onChange={(e) => {
                        update('direction', e.target.value as RelativeDirection);
                        update('align', ''); // Reset alignment when direction changes
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
                          class="input input-bordered input-sm w-full"
                          value={form().reference}
                          onInput={(e) => update('reference', e.target.value)}
                          placeholder="Room name"
                        />
                      }
                    >
                      <select
                        class="select select-bordered select-sm w-full"
                        value={effectiveReference()}
                        onChange={(e) => update('reference', e.target.value)}
                      >
                        <For each={rooms()}>{(name) => <option value={name}>{name}</option>}</For>
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
                      class="input input-bordered input-sm w-full"
                      value={form().gap}
                      min={0}
                      step={0.5}
                      onInput={(e) => update('gap', Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <Show when={alignOptions().length > 0}>
                    <div class="form-control flex-1">
                      <label class="label py-0.5">
                        <span class="label-text text-xs">Align</span>
                      </label>
                      <select
                        class="select select-bordered select-sm w-full"
                        value={form().align}
                        onChange={(e) => update('align', e.target.value as AlignmentDirection | '')}
                      >
                        <option value="">Default</option>
                        <For each={alignOptions()}>
                          {(opt) => (
                            <option value={opt}>{opt[0].toUpperCase() + opt.slice(1)}</option>
                          )}
                        </For>
                      </select>
                    </div>
                  </Show>
                </div>
              </div>
            </Show>

            <Show when={form().posMode === 'absolute'}>
              <div class="flex gap-3">
                <div class="form-control flex-1">
                  <label class="label py-0.5">
                    <span class="label-text text-xs">X</span>
                  </label>
                  <input
                    type="number"
                    class="input input-bordered input-sm w-full"
                    value={form().x}
                    step={1}
                    onInput={(e) => update('x', Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div class="form-control flex-1">
                  <label class="label py-0.5">
                    <span class="label-text text-xs">Y</span>
                  </label>
                  <input
                    type="number"
                    class="input input-bordered input-sm w-full"
                    value={form().y}
                    step={1}
                    onInput={(e) => update('y', Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </Show>
          </fieldset>

          {/* ── Walls ── */}
          <fieldset class="border border-base-300 rounded-lg px-3 py-2">
            <legend class="text-xs font-medium px-1 text-base-content/70">Walls</legend>

            {/* Preset buttons */}
            <div class="flex gap-1 mb-2">
              {(Object.keys(WALL_PRESETS) as WallPreset[]).map((preset) => (
                <button
                  type="button"
                  class="btn btn-xs flex-1"
                  classList={{
                    'btn-primary': form().wallPreset === preset,
                    'btn-ghost': form().wallPreset !== preset,
                  }}
                  onClick={() => applyWallPreset(preset)}
                >
                  {preset === 'all-solid'
                    ? 'Solid'
                    : preset === 'open-plan'
                      ? 'Open'
                      : preset === 'windowed'
                        ? 'Windowed'
                        : 'Custom'}
                </button>
              ))}
            </div>

            {/* Per-wall selectors */}
            <div class="grid grid-cols-2 gap-x-3 gap-y-1">
              {(['top', 'right', 'bottom', 'left'] as const).map((dir) => (
                <div class="flex items-center gap-2">
                  <span class="text-xs w-12 text-base-content/60 capitalize">{dir}</span>
                  <select
                    class="select select-bordered select-xs flex-1"
                    value={form().walls[dir]}
                    onChange={(e) => updateWall(dir, e.target.value as WallType)}
                  >
                    <For each={WALL_TYPES}>
                      {(wt) => <option value={wt}>{WALL_TYPE_LABELS[wt]}</option>}
                    </For>
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          {/* ── Advanced (collapsible) ── */}
          <div class="collapse collapse-arrow border border-base-300 rounded-lg">
            <input
              type="checkbox"
              checked={form().showAdvanced}
              onChange={(e) => update('showAdvanced', e.target.checked)}
            />
            <div class="collapse-title text-xs font-medium py-2 min-h-0">Advanced Options</div>
            <div class="collapse-content space-y-3 px-3">
              <div class="form-control">
                <label class="label py-0.5">
                  <span class="label-text text-xs">Display Label</span>
                </label>
                <input
                  type="text"
                  class="input input-bordered input-sm"
                  value={form().label}
                  onInput={(e) => update('label', e.target.value)}
                  placeholder="e.g., Master Bedroom (optional)"
                />
                <label class="label py-0">
                  <span class="label-text-alt text-base-content/50">
                    Shown on the floorplan. Can contain spaces.
                  </span>
                </label>
              </div>

              <div class="form-control">
                <label class="label py-0.5">
                  <span class="label-text text-xs">Wall Height (3D)</span>
                </label>
                <input
                  type="number"
                  class="input input-bordered input-sm"
                  value={form().roomHeight}
                  min={0}
                  step={0.5}
                  onInput={(e) => update('roomHeight', e.target.value)}
                  placeholder="Default (from config)"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div class="modal-action mt-4">
          <button type="button" class="btn btn-sm" onClick={props.onClose}>
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-sm btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmit()}
          >
            Add Room
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="button" onClick={props.onClose}>
          close
        </button>
      </form>
    </dialog>
  );
}
