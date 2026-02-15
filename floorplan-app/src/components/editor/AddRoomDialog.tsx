import { createMemo, createSignal, Show } from 'solid-js';
import type {
  AlignmentDirection,
  PositioningMode,
  RelativeDirection,
  WallConfig,
  WallPreset,
} from './dsl-constants';
import PositioningFieldset, {
  DEFAULT_POSITIONING,
  type PositioningData,
} from './PositioningFieldset';
import WallsFieldset from './WallsFieldset';

// ================================================================
// Types
// ================================================================

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

interface FormState {
  name: string;
  width: number;
  height: number;
  positioning: PositioningData;
  walls: WallConfig;
  label: string;
  roomHeight: string;
  showAdvanced: boolean;
}

function createDefaultForm(): FormState {
  return {
    name: '',
    width: 10,
    height: 10,
    positioning: { ...DEFAULT_POSITIONING, mode: 'relative' },
    walls: { top: 'solid', right: 'solid', bottom: 'solid', left: 'solid' },
    label: '',
    roomHeight: '',
    showAdvanced: false,
  };
}

export default function AddRoomDialog(props: AddRoomDialogProps) {
  const [form, setForm] = createSignal(createDefaultForm());

  const rooms = createMemo(() => props.existingRooms ?? []);

  const effectiveReference = createMemo(() => {
    const pos = form().positioning;
    if (pos.reference) return pos.reference;
    return rooms()[0] ?? '';
  });

  const canSubmit = createMemo(() => {
    const f = form();
    if (!f.name.trim()) return false;
    if (f.positioning.mode === 'relative' && !effectiveReference()) return false;
    return true;
  });

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const f = form();
    if (!canSubmit()) return;

    const pos = f.positioning;
    const data: AddRoomData = {
      name: f.name.trim().replace(/\s+/g, ''),
      width: f.width,
      height: f.height,
      walls: { ...f.walls },
      positioning:
        pos.mode === 'absolute'
          ? { mode: 'absolute', x: pos.x, y: pos.y }
          : {
              mode: 'relative',
              direction: pos.direction,
              reference: effectiveReference(),
              gap: pos.gap > 0 ? pos.gap : undefined,
              align: (pos.align as AlignmentDirection) || undefined,
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

          {/* ── Positioning (shared component) ── */}
          <PositioningFieldset
            data={form().positioning}
            existingRooms={rooms()}
            onChange={(pos) => update('positioning', pos)}
          />

          {/* ── Walls (shared component) ── */}
          <WallsFieldset walls={form().walls} onChange={(walls) => update('walls', walls)} />

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
