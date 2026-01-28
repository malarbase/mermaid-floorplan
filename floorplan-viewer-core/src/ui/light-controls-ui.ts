/**
 * Light controls UI component (Vanilla)
 * 
 * @deprecated Use Solid.js version instead: `LightControls` from './solid/ControlPanels'
 */
import { injectStyles } from './styles.js';
import { createControlPanelSection, getSectionContent } from './control-panel-section.js';
import { createSliderControl, type SliderControl } from './slider-control.js';

export interface LightControlsUIOptions {
  initialAzimuth?: number;
  initialElevation?: number;
  initialIntensity?: number;
  onAzimuthChange?: (azimuth: number) => void;
  onElevationChange?: (elevation: number) => void;
  onIntensityChange?: (intensity: number) => void;
}

export interface LightControlsUI {
  element: HTMLElement;
  azimuthSlider: SliderControl;
  elevationSlider: SliderControl;
  intensitySlider: SliderControl;
}

/**
 * Create light controls UI section
 */
export function createLightControlsUI(options: LightControlsUIOptions = {}): LightControlsUI {
  injectStyles();
  
  const {
    initialAzimuth = 45,
    initialElevation = 45,
    initialIntensity = 1.0,
    onAzimuthChange,
    onElevationChange,
    onIntensityChange,
  } = options;
  
  const section = createControlPanelSection({
    title: 'Lighting',
    id: 'light-section',
    collapsed: true,
  });
  
  const content = getSectionContent(section)!;
  
  // Azimuth slider
  const azimuthSlider = createSliderControl({
    id: 'light-azimuth',
    label: 'Azimuth',
    min: 0,
    max: 360,
    value: initialAzimuth,
    step: 5,
    formatValue: (v) => `${Math.round(v)}°`,
    onChange: onAzimuthChange,
  });
  content.appendChild(azimuthSlider.element);
  
  // Elevation slider
  const elevationSlider = createSliderControl({
    id: 'light-elevation',
    label: 'Elevation',
    min: 0,
    max: 90,
    value: initialElevation,
    step: 5,
    formatValue: (v) => `${Math.round(v)}°`,
    onChange: onElevationChange,
  });
  content.appendChild(elevationSlider.element);
  
  // Intensity slider
  const intensitySlider = createSliderControl({
    id: 'light-intensity',
    label: 'Intensity',
    min: 0,
    max: 2,
    value: initialIntensity,
    step: 0.1,
    formatValue: (v) => v.toFixed(1),
    onChange: onIntensityChange,
  });
  content.appendChild(intensitySlider.element);
  
  return {
    element: section,
    azimuthSlider,
    elevationSlider,
    intensitySlider,
  };
}

