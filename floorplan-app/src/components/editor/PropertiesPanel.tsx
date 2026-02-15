import { createMemo, For, Show } from 'solid-js';
import type { PropertyDefinition } from '~/hooks/useSelection';
import type { PositioningMode, RelativeDirection, WallConfig } from './dsl-constants';
import PositioningFieldset, {
  DEFAULT_POSITIONING,
  type PositioningData,
} from './PositioningFieldset';
import WallsFieldset from './WallsFieldset';

interface PropertiesPanelProps {
  /** Whether something is selected */
  hasSelection: boolean;
  /** Entity type (e.g., "room", "wall") */
  entityType: string;
  /** Entity ID (e.g., "LivingRoom") */
  entityId: string;
  /** Number of selected entities */
  selectionCount?: number;
  /** Selection summary (e.g., "2 rooms, 1 wall") */
  selectionSummary?: string;
  /** Rich property definitions (from useSelection) */
  propertyDefs: PropertyDefinition[];
  /** Called when a property value changes */
  onPropertyChange?: (
    property: string,
    value: string | number | boolean | PositioningData | WallConfig,
  ) => void;
  /** Raw entity data from getEntityData (needed for fieldsets) */
  entityData?: Record<string, unknown>;
  /** Available room names for relative positioning reference dropdown */
  existingRooms?: string[];
}

/**
 * Properties panel -- pure presentational component.
 * Receives selection data as props. Collapses to a header when nothing is selected,
 * expands with property controls when an entity is selected.
 *
 * For room entities, shows PositioningFieldset and WallsFieldset (shared with AddRoomDialog).
 * For other entity types, shows the standard 2-column property grid.
 */
export default function PropertiesPanel(props: PropertiesPanelProps) {
  const isSingleRoom = createMemo(
    () =>
      props.hasSelection &&
      (props.selectionCount ?? 1) === 1 &&
      props.entityType === 'room' &&
      !!props.entityData,
  );

  // Build positioning data from raw entity data
  const positioningData = createMemo((): PositioningData => {
    const d = props.entityData;
    if (!d) return DEFAULT_POSITIONING;
    return {
      mode: (d.posMode as PositioningMode) ?? 'absolute',
      x: Number(d.x ?? 0),
      y: Number(d.y ?? 0),
      direction: (d.direction as RelativeDirection) ?? 'right-of',
      reference: String(d.reference ?? ''),
      gap: Number(d.gap ?? 0),
      align: (d.alignment as PositioningData['align']) ?? '',
    };
  });

  // Build wall config from raw entity data
  const wallConfig = createMemo((): WallConfig => {
    const d = props.entityData;
    if (!d?.walls) return { top: 'solid', right: 'solid', bottom: 'solid', left: 'solid' };
    const w = d.walls as Record<string, string>;
    return {
      top: (w.top ?? 'solid') as WallConfig['top'],
      right: (w.right ?? 'solid') as WallConfig['right'],
      bottom: (w.bottom ?? 'solid') as WallConfig['bottom'],
      left: (w.left ?? 'solid') as WallConfig['left'],
    };
  });

  // Filter out properties that are handled by fieldsets (for rooms)
  const basicPropertyDefs = createMemo(() => {
    if (!isSingleRoom()) return props.propertyDefs;
    // Room fieldsets handle: x, y (positioning), walls are separate.
    // Keep: name, width, height, roomHeight, style, label
    const fieldsetProps = new Set(['x', 'y']);
    return props.propertyDefs.filter((def) => !fieldsetProps.has(def.name));
  });

  const existingRooms = createMemo(() => props.existingRooms ?? []);

  return (
    <div class="border-t border-base-300 bg-base-100">
      {/* Header - always visible */}
      <div class="flex items-center gap-2 px-3 py-2">
        <span class="text-xs font-semibold text-base-content/50 uppercase tracking-wider">
          Properties
        </span>
        <Show when={props.hasSelection && (props.selectionCount ?? 1) > 1}>
          <span class="text-xs text-base-content/70">
            — {props.selectionSummary || `${props.selectionCount} items`}
          </span>
        </Show>
        <Show when={props.hasSelection && (props.selectionCount ?? 1) === 1}>
          <span class="text-xs text-base-content/70">
            — {props.entityType}: {props.entityId}
          </span>
        </Show>
        <Show when={!props.hasSelection}>
          <span class="text-xs text-base-content/40 italic">No selection</span>
        </Show>
      </div>

      {/* Room-specific: positioning + walls fieldsets */}
      <Show when={isSingleRoom()}>
        <div class="px-2 pb-2 space-y-2">
          <PositioningFieldset
            data={positioningData()}
            existingRooms={existingRooms()}
            onChange={(pos) => props.onPropertyChange?.('positioning', pos)}
            compact
          />
          <WallsFieldset
            walls={wallConfig()}
            onChange={(walls) => props.onPropertyChange?.('walls', walls)}
            compact
          />
        </div>
      </Show>

      {/* Standard property fields */}
      <Show when={props.hasSelection && basicPropertyDefs().length > 0}>
        <div class="px-3 pb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          <For each={basicPropertyDefs()}>
            {(def) => (
              <div class={`form-control ${def.name === 'name' ? 'col-span-2' : ''}`}>
                <label class="label py-0.5">
                  <span class="label-text text-xs text-base-content/60">{def.label}</span>
                </label>
                {renderField(def, props.onPropertyChange)}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

function renderField(
  def: PropertyDefinition,
  onPropertyChange?: (property: string, value: string | number | boolean) => void,
) {
  // Mixed values across multi-selection -- show placeholder
  if (def.mixed) {
    return <span class="text-sm text-base-content/40 italic px-2 py-1">Mixed</span>;
  }

  switch (def.type) {
    case 'readonly':
      return <span class="text-sm text-base-content/80 px-2 py-1">{def.value ?? '—'}</span>;

    case 'select':
      return (
        <select
          class="select select-xs select-bordered w-full"
          value={String(def.value ?? '')}
          onChange={(e) => onPropertyChange?.(def.name, e.target.value)}
        >
          <For each={def.options ?? []}>
            {(opt) => <option value={opt.value}>{opt.label}</option>}
          </For>
        </select>
      );

    case 'number':
      return (
        <input
          type="number"
          class="input input-xs input-bordered w-full"
          value={def.value ?? ''}
          step={def.step}
          min={def.min}
          max={def.max}
          onChange={(e) => onPropertyChange?.(def.name, parseFloat(e.target.value))}
        />
      );

    default: // "text"
      return (
        <input
          type="text"
          class="input input-xs input-bordered w-full"
          value={def.value ?? ''}
          onChange={(e) => onPropertyChange?.(def.name, e.target.value)}
        />
      );
  }
}
