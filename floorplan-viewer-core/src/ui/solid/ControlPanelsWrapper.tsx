/**
 * ControlPanelsWrapper - Vanilla-compatible wrappers for Solid Control Panels
 *
 * Provides vanilla-compatible APIs for:
 * - CameraControls
 * - LightControls
 * - AnnotationControls
 *
 * Usage:
 *   import { createSolidCameraControls } from './solid/ControlPanelsWrapper';
 *   const controls = createSolidCameraControls({ onModeChange, onFovChange });
 */

import { createSignal, createEffect } from 'solid-js';
import { render } from 'solid-js/web';
import {
  CameraControls,
  LightControls,
  AnnotationControls,
  type CameraMode,
  type AreaUnit,
  type LengthUnit,
} from './ControlPanels.jsx';

// Re-export types
export type { CameraMode, AreaUnit, LengthUnit };

// ============================================================================
// Camera Controls Wrapper
// ============================================================================

export interface CameraControlsConfig {
  initialMode?: CameraMode;
  initialFov?: number;
  onModeChange?: (mode: CameraMode) => void;
  onFovChange?: (fov: number) => void;
  onIsometric?: () => void;
}

export interface CameraControlsAPI {
  element: HTMLElement;
  setMode: (mode: CameraMode) => void;
  setFov: (fov: number) => void;
  dispose: () => void;
}

export function createSolidCameraControls(config: CameraControlsConfig = {}): CameraControlsAPI {
  const {
    initialMode = 'perspective',
    initialFov = 75,
    onModeChange,
    onFovChange,
    onIsometric,
  } = config;

  const container = document.createElement('div');
  container.id = 'solid-camera-controls-root';

  const [mode, setMode] = createSignal<CameraMode>(initialMode);
  const [fov, setFov] = createSignal(initialFov);

  const dispose = render(() => {
    return (
      <CameraControls
        mode={mode()}
        fov={fov()}
        onModeChange={(m) => {
          setMode(m);
          onModeChange?.(m);
        }}
        onFovChange={(f) => {
          setFov(f);
          onFovChange?.(f);
        }}
        onIsometric={onIsometric}
      />
    );
  }, container);

  return {
    element: container,
    setMode: (m: CameraMode) => setMode(m),
    setFov: (f: number) => setFov(f),
    dispose: () => {
      dispose();
      container.remove();
    },
  };
}

// ============================================================================
// Light Controls Wrapper
// ============================================================================

export interface LightControlsConfig {
  initialAzimuth?: number;
  initialElevation?: number;
  initialIntensity?: number;
  onAzimuthChange?: (azimuth: number) => void;
  onElevationChange?: (elevation: number) => void;
  onIntensityChange?: (intensity: number) => void;
}

export interface LightControlsAPI {
  element: HTMLElement;
  setAzimuth: (azimuth: number) => void;
  setElevation: (elevation: number) => void;
  setIntensity: (intensity: number) => void;
  dispose: () => void;
}

export function createSolidLightControls(config: LightControlsConfig = {}): LightControlsAPI {
  const {
    initialAzimuth = 45,
    initialElevation = 45,
    initialIntensity = 1.0,
    onAzimuthChange,
    onElevationChange,
    onIntensityChange,
  } = config;

  const container = document.createElement('div');
  container.id = 'solid-light-controls-root';

  const [azimuth, setAzimuth] = createSignal(initialAzimuth);
  const [elevation, setElevation] = createSignal(initialElevation);
  const [intensity, setIntensity] = createSignal(initialIntensity);

  const dispose = render(() => {
    return (
      <LightControls
        azimuth={azimuth()}
        elevation={elevation()}
        intensity={intensity()}
        onAzimuthChange={(a) => {
          setAzimuth(a);
          onAzimuthChange?.(a);
        }}
        onElevationChange={(e) => {
          setElevation(e);
          onElevationChange?.(e);
        }}
        onIntensityChange={(i) => {
          setIntensity(i);
          onIntensityChange?.(i);
        }}
      />
    );
  }, container);

  return {
    element: container,
    setAzimuth: (a: number) => setAzimuth(a),
    setElevation: (e: number) => setElevation(e),
    setIntensity: (i: number) => setIntensity(i),
    dispose: () => {
      dispose();
      container.remove();
    },
  };
}

// ============================================================================
// Annotation Controls Wrapper
// ============================================================================

export interface AnnotationControlsConfig {
  initialShowArea?: boolean;
  initialShowDimensions?: boolean;
  initialShowFloorSummary?: boolean;
  initialAreaUnit?: AreaUnit;
  initialLengthUnit?: LengthUnit;
  onShowAreaChange?: (show: boolean) => void;
  onShowDimensionsChange?: (show: boolean) => void;
  onShowFloorSummaryChange?: (show: boolean) => void;
  onAreaUnitChange?: (unit: AreaUnit) => void;
  onLengthUnitChange?: (unit: LengthUnit) => void;
}

export interface AnnotationControlsAPI {
  element: HTMLElement;
  setShowArea: (show: boolean) => void;
  setShowDimensions: (show: boolean) => void;
  setShowFloorSummary: (show: boolean) => void;
  setAreaUnit: (unit: AreaUnit) => void;
  setLengthUnit: (unit: LengthUnit) => void;
  dispose: () => void;
}

export function createSolidAnnotationControls(config: AnnotationControlsConfig = {}): AnnotationControlsAPI {
  const {
    initialShowArea = false,
    initialShowDimensions = false,
    initialShowFloorSummary = false,
    initialAreaUnit = 'sqft',
    initialLengthUnit = 'ft',
    onShowAreaChange,
    onShowDimensionsChange,
    onShowFloorSummaryChange,
    onAreaUnitChange,
    onLengthUnitChange,
  } = config;

  const container = document.createElement('div');
  container.id = 'solid-annotation-controls-root';

  const [showArea, setShowArea] = createSignal(initialShowArea);
  const [showDimensions, setShowDimensions] = createSignal(initialShowDimensions);
  const [showFloorSummary, setShowFloorSummary] = createSignal(initialShowFloorSummary);
  const [areaUnit, setAreaUnit] = createSignal<AreaUnit>(initialAreaUnit);
  const [lengthUnit, setLengthUnit] = createSignal<LengthUnit>(initialLengthUnit);

  const dispose = render(() => {
    return (
      <AnnotationControls
        showArea={showArea()}
        showDimensions={showDimensions()}
        showFloorSummary={showFloorSummary()}
        areaUnit={areaUnit()}
        lengthUnit={lengthUnit()}
        onShowAreaChange={(s) => {
          setShowArea(s);
          onShowAreaChange?.(s);
        }}
        onShowDimensionsChange={(s) => {
          setShowDimensions(s);
          onShowDimensionsChange?.(s);
        }}
        onShowFloorSummaryChange={(s) => {
          setShowFloorSummary(s);
          onShowFloorSummaryChange?.(s);
        }}
        onAreaUnitChange={(u) => {
          setAreaUnit(u);
          onAreaUnitChange?.(u);
        }}
        onLengthUnitChange={(u) => {
          setLengthUnit(u);
          onLengthUnitChange?.(u);
        }}
      />
    );
  }, container);

  return {
    element: container,
    setShowArea: (s: boolean) => setShowArea(s),
    setShowDimensions: (s: boolean) => setShowDimensions(s),
    setShowFloorSummary: (s: boolean) => setShowFloorSummary(s),
    setAreaUnit: (u: AreaUnit) => setAreaUnit(u),
    setLengthUnit: (u: LengthUnit) => setLengthUnit(u),
    dispose: () => {
      dispose();
      container.remove();
    },
  };
}
