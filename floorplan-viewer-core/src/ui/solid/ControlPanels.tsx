/**
 * ControlPanels - Solid.js Control Panel Components
 *
 * Reusable control panel primitives and sections:
 * - ControlPanelSection: Collapsible section container
 * - Slider: Range slider with label and value display
 * - Checkbox: Checkbox with label
 * - Select: Dropdown select with label
 * - CameraControls: Camera mode, FOV, isometric view
 * - LightControls: Azimuth, elevation, intensity
 * - AnnotationControls: Show area/dimensions, units
 *
 * Features:
 * - Reactive state with createSignal()
 * - Collapsible sections
 * - Consistent styling with vanilla components
 */

import { createSignal, For, type JSX, Show } from 'solid-js';

// ============================================================================
// Primitive Components
// ============================================================================

export interface ControlPanelSectionProps {
  /** Section title */
  title: string;
  /** Section ID */
  id?: string;
  /** Initially collapsed */
  collapsed?: boolean;
  /** Callback when toggled */
  onToggle?: (collapsed: boolean) => void;
  /** Section content */
  children: JSX.Element;
}

export function ControlPanelSection(props: ControlPanelSectionProps) {
  const [isCollapsed, setIsCollapsed] = createSignal(props.collapsed ?? false);

  const handleToggle = () => {
    const newState = !isCollapsed();
    setIsCollapsed(newState);
    props.onToggle?.(newState);
  };

  return (
    <div class="fp-control-section" classList={{ collapsed: isCollapsed() }} id={props.id}>
      <div class="fp-section-header" onClick={handleToggle}>
        {props.title}
      </div>
      <div class="fp-section-content">{props.children}</div>
    </div>
  );
}

export interface SliderProps {
  /** Slider ID */
  id: string;
  /** Label text */
  label: string;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Current value */
  value: number;
  /** Step increment */
  step?: number;
  /** Format display value */
  formatValue?: (value: number) => string;
  /** Change callback */
  onChange?: (value: number) => void;
}

export function Slider(props: SliderProps) {
  const formatValue = props.formatValue ?? ((v) => String(v));

  const handleInput = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    props.onChange?.(value);
  };

  return (
    <div class="fp-control-group" id={`${props.id}-group`}>
      <div class="fp-control-row">
        <label class="fp-label" for={props.id}>
          {props.label}
        </label>
        <input
          type="range"
          class="fp-slider"
          id={props.id}
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          value={props.value}
          onInput={handleInput}
        />
        <span class="fp-slider-value" id={`${props.id}-value`}>
          {formatValue(props.value)}
        </span>
      </div>
    </div>
  );
}

export interface CheckboxProps {
  /** Checkbox ID */
  id: string;
  /** Label text */
  label: string;
  /** Checked state */
  checked: boolean;
  /** Change callback */
  onChange?: (checked: boolean) => void;
}

export function Checkbox(props: CheckboxProps) {
  const handleChange = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    props.onChange?.(checked);
  };

  return (
    <label class="label cursor-pointer justify-start gap-2">
      <input
        type="checkbox"
        class="checkbox checkbox-xs"
        id={props.id}
        checked={props.checked}
        onChange={handleChange}
      />
      <span class="label-text text-xs">{props.label}</span>
    </label>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  /** Select ID */
  id: string;
  /** Label text */
  label: string;
  /** Current value */
  value: string;
  /** Options */
  options: SelectOption[];
  /** Change callback */
  onChange?: (value: string) => void;
}

export function Select(props: SelectProps) {
  const handleChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value;
    props.onChange?.(value);
  };

  return (
    <div class="fp-control-row">
      <label class="fp-label" for={props.id}>
        {props.label}
      </label>
      <select class="fp-select" id={props.id} value={props.value} onChange={handleChange}>
        <For each={props.options}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
      </select>
    </div>
  );
}

// ============================================================================
// Camera Controls
// ============================================================================

export type CameraMode = 'perspective' | 'orthographic';

export interface CameraControlsProps {
  /** Current camera mode */
  mode?: CameraMode;
  /** Current FOV (perspective only) */
  fov?: number;
  /** Mode change callback */
  onModeChange?: (mode: CameraMode) => void;
  /** FOV change callback */
  onFovChange?: (fov: number) => void;
  /** Isometric view callback */
  onIsometric?: () => void;
}

export function CameraControls(props: CameraControlsProps) {
  const mode = () => props.mode ?? 'perspective';
  const fov = () => props.fov ?? 75;

  const handleModeToggle = () => {
    const newMode = mode() === 'perspective' ? 'orthographic' : 'perspective';
    props.onModeChange?.(newMode);
  };

  return (
    <ControlPanelSection title="Camera" id="camera-section">
      {/* Mode Toggle */}
      <button class="fp-btn" id="camera-mode-btn" onClick={handleModeToggle}>
        {mode() === 'perspective' ? 'Switch to Orthographic' : 'Switch to Perspective'}
      </button>

      {/* FOV Slider (perspective only) */}
      <Show when={mode() === 'perspective'}>
        <Slider
          id="fov-slider"
          label="FOV"
          min={30}
          max={120}
          value={fov()}
          step={1}
          formatValue={(v) => `${Math.round(v)}°`}
          onChange={props.onFovChange}
        />
      </Show>

      {/* Isometric Button */}
      <button class="fp-btn fp-btn-secondary" id="isometric-btn" onClick={props.onIsometric}>
        Isometric View
      </button>
    </ControlPanelSection>
  );
}

// ============================================================================
// Light Controls
// ============================================================================

export interface LightControlsProps {
  /** Light azimuth angle (0-360) */
  azimuth?: number;
  /** Light elevation angle (0-90) */
  elevation?: number;
  /** Light intensity (0-2) */
  intensity?: number;
  /** Azimuth change callback */
  onAzimuthChange?: (azimuth: number) => void;
  /** Elevation change callback */
  onElevationChange?: (elevation: number) => void;
  /** Intensity change callback */
  onIntensityChange?: (intensity: number) => void;
}

export function LightControls(props: LightControlsProps) {
  return (
    <ControlPanelSection title="Lighting" id="light-section" collapsed={true}>
      <Slider
        id="light-azimuth"
        label="Azimuth"
        min={0}
        max={360}
        value={props.azimuth ?? 45}
        step={5}
        formatValue={(v) => `${Math.round(v)}°`}
        onChange={props.onAzimuthChange}
      />

      <Slider
        id="light-elevation"
        label="Elevation"
        min={0}
        max={90}
        value={props.elevation ?? 45}
        step={5}
        formatValue={(v) => `${Math.round(v)}°`}
        onChange={props.onElevationChange}
      />

      <Slider
        id="light-intensity"
        label="Intensity"
        min={0}
        max={2}
        value={props.intensity ?? 1.0}
        step={0.1}
        formatValue={(v) => v.toFixed(1)}
        onChange={props.onIntensityChange}
      />
    </ControlPanelSection>
  );
}

// ============================================================================
// Annotation Controls
// ============================================================================

export type AreaUnit = 'sqft' | 'sqm';
export type LengthUnit = 'm' | 'ft' | 'cm' | 'in' | 'mm';

export interface AnnotationControlsProps {
  /** Show area labels */
  showArea?: boolean;
  /** Show dimension labels */
  showDimensions?: boolean;
  /** Show floor summary */
  showFloorSummary?: boolean;
  /** Area unit */
  areaUnit?: AreaUnit;
  /** Length unit */
  lengthUnit?: LengthUnit;
  /** Show area change callback */
  onShowAreaChange?: (show: boolean) => void;
  /** Show dimensions change callback */
  onShowDimensionsChange?: (show: boolean) => void;
  /** Show floor summary change callback */
  onShowFloorSummaryChange?: (show: boolean) => void;
  /** Area unit change callback */
  onAreaUnitChange?: (unit: AreaUnit) => void;
  /** Length unit change callback */
  onLengthUnitChange?: (unit: LengthUnit) => void;
}

export function AnnotationControls(props: AnnotationControlsProps) {
  const areaUnitOptions: SelectOption[] = [
    { value: 'sqft', label: 'sq ft' },
    { value: 'sqm', label: 'sq m' },
  ];

  const lengthUnitOptions: SelectOption[] = [
    { value: 'ft', label: 'feet' },
    { value: 'm', label: 'meters' },
    { value: 'cm', label: 'cm' },
    { value: 'in', label: 'inches' },
    { value: 'mm', label: 'mm' },
  ];

  return (
    <ControlPanelSection title="Annotations" id="annotation-section" collapsed={true}>
      <Checkbox
        id="show-area"
        label="Show Area Labels"
        checked={props.showArea ?? false}
        onChange={props.onShowAreaChange}
      />

      <Checkbox
        id="show-dimensions"
        label="Show Dimensions"
        checked={props.showDimensions ?? false}
        onChange={props.onShowDimensionsChange}
      />

      <Checkbox
        id="show-floor-summary"
        label="Show Floor Summary"
        checked={props.showFloorSummary ?? false}
        onChange={props.onShowFloorSummaryChange}
      />

      <Select
        id="area-unit"
        label="Area Unit"
        value={props.areaUnit ?? 'sqft'}
        options={areaUnitOptions}
        onChange={(v) => props.onAreaUnitChange?.(v as AreaUnit)}
      />

      <Select
        id="length-unit"
        label="Length Unit"
        value={props.lengthUnit ?? 'ft'}
        options={lengthUnitOptions}
        onChange={(v) => props.onLengthUnitChange?.(v as LengthUnit)}
      />
    </ControlPanelSection>
  );
}

export default {
  ControlPanelSection,
  Slider,
  Checkbox,
  Select,
  CameraControls,
  LightControls,
  AnnotationControls,
};
