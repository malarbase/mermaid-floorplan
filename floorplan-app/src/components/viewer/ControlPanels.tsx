import { onMount, onCleanup, createEffect } from "solid-js";
import type { FloorplanAppCore } from "floorplan-viewer-core";

function getUIThemeMode(theme: string): 'light' | 'dark' {
  return (theme === 'dark' || theme === 'blueprint') ? 'dark' : 'light';
}

interface ControlPanelsProps {
  viewer: FloorplanAppCore | null;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
}

export default function ControlPanels(props: ControlPanelsProps) {
  let containerRef: HTMLDivElement | undefined;
  // Store reference to theme button updater for reactive updates
  let updateThemeBtnRef: ((theme: string) => void) | null = null;
  
  // Reactive effect at component level to update theme button when props.theme changes
  createEffect(() => {
    if (props.theme && updateThemeBtnRef) {
      updateThemeBtnRef(props.theme);
    }
  });
  
  onMount(async () => {
    const {
      createControlPanel,
      createCameraControlsUI,
      createLightControlsUI,
      createFloorControlsUI,
      createAnnotationControlsUI,
      createOverlay2DUI,
      createControlPanelSection,
      getSectionContent,
      createSliderControl,
      getLayoutManager,
      cls,
      injectStyles
    } = await import("floorplan-viewer-core");

    injectStyles();

    if (!props.viewer || !containerRef) return;
    const viewer = props.viewer;

    const controlPanel = createControlPanel();
    
    controlPanel.style.opacity = "0";
    controlPanel.style.transform = "translateX(20px)";
    controlPanel.style.transition = "opacity 0.3s ease-out, transform 0.3s ease-out";
    
    containerRef.appendChild(controlPanel);

    requestAnimationFrame(() => {
      controlPanel.style.opacity = "1";
      controlPanel.style.transform = "translateX(0)";
    });

    const cameraControls = createCameraControlsUI({
      initialMode: 'perspective',
      initialFov: 75,
      onModeChange: () => viewer.cameraManager.toggleCameraMode(),
      onFovChange: (fov) => {
        if (viewer.perspectiveCamera) {
          viewer.perspectiveCamera.fov = fov;
          viewer.perspectiveCamera.updateProjectionMatrix();
        }
      },
      onIsometric: () => viewer.cameraManager.setIsometricView(),
    });
    controlPanel.appendChild(cameraControls.element);

    let currentAzimuth = 45;
    let currentElevation = 60;
    
    const updateLightPosition = (az: number, el: number) => {
        const azRad = az * Math.PI / 180;
        const elRad = el * Math.PI / 180;
        const distance = 20;
        const x = distance * Math.cos(elRad) * Math.sin(azRad);
        const y = distance * Math.sin(elRad);
        const z = distance * Math.cos(elRad) * Math.cos(azRad);
        if (viewer.light) viewer.light.position.set(x, y, z);
    };

    const lightControls = createLightControlsUI({
      initialAzimuth: currentAzimuth,
      initialElevation: currentElevation,
      initialIntensity: 1.0,
      onAzimuthChange: (v) => { currentAzimuth = v; updateLightPosition(v, currentElevation); },
      onElevationChange: (v) => { currentElevation = v; updateLightPosition(currentAzimuth, v); },
      onIntensityChange: (v) => { if (viewer.light) viewer.light.intensity = v; }
    });
    controlPanel.appendChild(lightControls.element);

    const viewSection = createControlPanelSection({
       title: 'View',
       id: 'view-section',
       collapsed: true
    });
    const viewContent = getSectionContent(viewSection);
    
    if (viewContent) {
       const themeRow = document.createElement('div');
       themeRow.className = 'fp-control-group';
       themeRow.innerHTML = `
         <div class="fp-control-row">
           <label class="fp-label">Theme</label>
         </div>
       `;
       
       const themeBtn = document.createElement('button');
       themeBtn.className = 'fp-btn fp-btn-secondary';
       themeBtn.style.cssText = 'padding: 4px 12px; font-size: 11px; margin-top: 4px;';
       
       const updateThemeBtn = (theme: string) => {
         const uiTheme = getUIThemeMode(theme);
         themeBtn.textContent = uiTheme === 'dark' ? '☀️ Light' : '🌙 Dark';
       };
       // Initialize from prop or viewer state
       updateThemeBtn(props.theme || (viewer as any).theme || 'dark');
       
       themeBtn.addEventListener('click', () => {
         // Use the unified theme toggle callback if provided
         if (props.onThemeToggle) {
           props.onThemeToggle();
         } else {
           // Fallback to viewer-only toggle
           // @ts-ignore
           viewer.handleThemeToggle();
           // @ts-ignore
           updateThemeBtn(viewer.theme);
         }
       });
       
       themeRow.appendChild(themeBtn);
       viewContent.appendChild(themeRow);
       
       // Store reference to update function for component-level reactive effect
       updateThemeBtnRef = updateThemeBtn;
       
       // @ts-ignore - Subscribe to viewer theme changes as backup
       viewer.on('themeChange', ({ theme }: { theme: string }) => {
          updateThemeBtn(theme);
       });

       const explodedSlider = createSliderControl({
          id: 'exploded-view',
          label: 'Exploded View',
          min: 0, max: 100, value: 0, step: 1,
          formatValue: (v) => `${Math.round(v)}%`,
          onChange: (v) => viewer.setExplodedView(v / 100)
       });
       viewContent.appendChild(explodedSlider.element);
    }
    controlPanel.appendChild(viewSection);

    const floorControls = createFloorControlsUI({
       onShowAll: () => viewer.floorManager.setAllFloorsVisible(true),
       onHideAll: () => viewer.floorManager.setAllFloorsVisible(false),
       onFloorToggle: (id, visible) => viewer.floorManager.setFloorVisible(id, visible)
    });
    controlPanel.appendChild(floorControls.element);
    
    viewer.floorManager.initFloorVisibility();

    const overlaySection = createControlPanelSection({
       title: '2D Overlay',
       id: 'overlay-2d-section',
       collapsed: true
    });
    const overlayContent = getSectionContent(overlaySection);
    
    const layoutManager = getLayoutManager();
    const overlay2D = createOverlay2DUI({
        initialVisible: false,
        onClose: () => { 
           if (overlayCheckbox) overlayCheckbox.checked = false;
        },
        onVisibilityChange: (v) => layoutManager.setOverlay2DVisible(v)
    });
    document.body.appendChild(overlay2D.element);
    
    // @ts-ignore - Trigger initial 2D overlay render with current floorplan data
    if (viewer.overlay2DManager?.render) {
      viewer.overlay2DManager.render();
    }
    
    let overlayCheckbox: HTMLInputElement | null = null;
    
    if (overlayContent) {
       const checkboxRow = document.createElement('label');
       checkboxRow.className = cls?.checkbox?.wrapper || 'fp-checkbox-wrapper';
       
       overlayCheckbox = document.createElement('input');
       overlayCheckbox.type = 'checkbox';
       overlayCheckbox.className = cls?.checkbox?.input || 'fp-checkbox-input';
       overlayCheckbox.id = 'show-2d-overlay';
       overlayCheckbox.addEventListener('change', () => {
         if (overlayCheckbox?.checked) overlay2D.show();
         else overlay2D.hide();
       });
       
       const labelText = document.createElement('span');
       labelText.className = cls?.checkbox?.label || 'fp-checkbox-label';
       labelText.textContent = 'Show 2D Mini-map';
       
       checkboxRow.appendChild(overlayCheckbox);
       checkboxRow.appendChild(labelText);
       overlayContent.appendChild(checkboxRow);
       
       const opacitySlider = createSliderControl({
          id: 'overlay-opacity',
          label: 'Opacity',
          min: 20, max: 100, value: 60, step: 5,
          formatValue: (v) => `${Math.round(v)}%`,
          onChange: (v) => { overlay2D.element.style.opacity = String(v / 100); }
       });
       overlayContent.appendChild(opacitySlider.element);
    }
    controlPanel.appendChild(overlaySection);

    const annotationControls = createAnnotationControlsUI({
       onShowAreaChange: (show) => {
          viewer.annotationManager.state.showArea = show;
          viewer.annotationManager.updateAll();
       },
       onShowDimensionsChange: (show) => {
          viewer.annotationManager.state.showDimensions = show;
          viewer.annotationManager.updateAll();
       },
       onShowFloorSummaryChange: (show) => {
          viewer.annotationManager.state.showFloorSummary = show;
          viewer.annotationManager.updateAll();
          layoutManager.setFloorSummaryVisible(show);
       },
       onAreaUnitChange: (unit) => {
          viewer.annotationManager.state.areaUnit = unit;
          viewer.annotationManager.updateAll();
       },
       onLengthUnitChange: (unit) => {
          viewer.annotationManager.state.lengthUnit = unit;
          viewer.annotationManager.updateAll();
       }
    });
    controlPanel.appendChild(annotationControls.element);

    // @ts-ignore - Subscribe to floorplanLoaded for future DSL reloads
    const unsubscribeFloorplan = viewer.on?.('floorplanLoaded', () => {
      viewer.floorManager.initFloorVisibility();
      if (viewer.overlay2DManager?.render) {
        viewer.overlay2DManager.render();
      }
    });

    onCleanup(() => {
       if (controlPanel.parentNode) controlPanel.parentNode.removeChild(controlPanel);
       if (overlay2D.element.parentNode) overlay2D.element.parentNode.removeChild(overlay2D.element);
       unsubscribeFloorplan?.();
    });
  });

  return <div ref={containerRef} class="h-full w-full bg-base-100" />;
}
