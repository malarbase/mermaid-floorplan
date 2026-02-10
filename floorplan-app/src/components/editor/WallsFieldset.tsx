/**
 * Shared walls fieldset — used by AddRoomDialog and PropertiesPanel.
 *
 * Fully controlled: receives WallConfig as props, emits changes via onChange.
 * Provides preset buttons (Solid, Open, Windowed, Custom) and per-wall dropdowns.
 */
import { For } from 'solid-js';
import {
  WALL_DIRECTIONS,
  WALL_PRESET_LABELS,
  WALL_PRESETS,
  WALL_TYPE_LABELS,
  WALL_TYPES,
  type WallConfig,
  type WallPreset,
  type WallType,
} from './dsl-constants';

// ─── Props ──────────────────────────────────────────────────────────

interface WallsFieldsetProps {
  walls: WallConfig;
  onChange: (walls: WallConfig) => void;
  /** Use compact sizing (xs) for properties panel */
  compact?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Detect which preset (if any) matches the current wall config. */
function detectPreset(walls: WallConfig): WallPreset {
  for (const [key, preset] of Object.entries(WALL_PRESETS)) {
    if (!preset) continue; // skip 'custom'
    if (
      walls.top === preset.top &&
      walls.right === preset.right &&
      walls.bottom === preset.bottom &&
      walls.left === preset.left
    ) {
      return key as WallPreset;
    }
  }
  return 'custom';
}

// ─── Component ──────────────────────────────────────────────────────

export default function WallsFieldset(props: WallsFieldsetProps) {
  const currentPreset = () => detectPreset(props.walls);

  const applyPreset = (preset: WallPreset) => {
    const presetWalls = WALL_PRESETS[preset];
    if (presetWalls) {
      props.onChange({ ...presetWalls });
    }
  };

  const updateWall = (dir: keyof WallConfig, type: WallType) => {
    props.onChange({ ...props.walls, [dir]: type });
  };

  const selectSize = () => (props.compact ? 'select-xs' : 'select-xs');

  return (
    <fieldset class="border border-base-300 rounded-lg px-3 py-2">
      <legend class="text-xs font-medium px-1 text-base-content/70">Walls</legend>

      {/* Preset buttons */}
      <div class="flex gap-1 mb-2">
        {(Object.keys(WALL_PRESETS) as WallPreset[]).map((preset) => (
          <button
            type="button"
            class="btn btn-xs flex-1"
            classList={{
              'btn-primary': currentPreset() === preset,
              'btn-ghost': currentPreset() !== preset,
            }}
            onClick={() => applyPreset(preset)}
          >
            {WALL_PRESET_LABELS[preset]}
          </button>
        ))}
      </div>

      {/* Per-wall selectors */}
      <div class="grid grid-cols-2 gap-x-3 gap-y-1">
        {WALL_DIRECTIONS.map((dir) => (
          <div class="flex items-center gap-2">
            <span class="text-xs w-12 text-base-content/60 capitalize">{dir}</span>
            <select
              class={`select select-bordered ${selectSize()} flex-1`}
              value={props.walls[dir]}
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
  );
}
