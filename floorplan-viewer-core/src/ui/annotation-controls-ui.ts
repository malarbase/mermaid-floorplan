/**
 * Annotation controls UI component
 */
import { injectStyles } from './styles.js';
import { createControlPanelSection, getSectionContent } from './control-panel-section.js';

export type AreaUnit = 'sqft' | 'sqm';
export type LengthUnit = 'm' | 'ft' | 'cm' | 'in' | 'mm';

export interface AnnotationControlsUIOptions {
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

export interface AnnotationControlsUI {
  element: HTMLElement;
  showAreaCheckbox: HTMLInputElement;
  showDimensionsCheckbox: HTMLInputElement;
  showFloorSummaryCheckbox: HTMLInputElement;
  areaUnitSelect: HTMLSelectElement;
  lengthUnitSelect: HTMLSelectElement;
}

/**
 * Create annotation controls UI section
 */
export function createAnnotationControlsUI(options: AnnotationControlsUIOptions = {}): AnnotationControlsUI {
  injectStyles();
  
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
  } = options;
  
  const section = createControlPanelSection({
    title: 'Annotations',
    id: 'annotation-section',
    collapsed: true,
  });
  
  const content = getSectionContent(section)!;
  
  // Show area checkbox
  const areaRow = document.createElement('div');
  areaRow.className = 'fp-checkbox-row';
  
  const showAreaCheckbox = document.createElement('input');
  showAreaCheckbox.type = 'checkbox';
  showAreaCheckbox.id = 'show-area';
  showAreaCheckbox.checked = initialShowArea;
  showAreaCheckbox.addEventListener('change', () => {
    onShowAreaChange?.(showAreaCheckbox.checked);
  });
  
  const areaLabel = document.createElement('label');
  areaLabel.htmlFor = 'show-area';
  areaLabel.textContent = 'Show Area Labels';
  
  areaRow.appendChild(showAreaCheckbox);
  areaRow.appendChild(areaLabel);
  content.appendChild(areaRow);
  
  // Show dimensions checkbox
  const dimRow = document.createElement('div');
  dimRow.className = 'fp-checkbox-row';
  
  const showDimensionsCheckbox = document.createElement('input');
  showDimensionsCheckbox.type = 'checkbox';
  showDimensionsCheckbox.id = 'show-dimensions';
  showDimensionsCheckbox.checked = initialShowDimensions;
  showDimensionsCheckbox.addEventListener('change', () => {
    onShowDimensionsChange?.(showDimensionsCheckbox.checked);
  });
  
  const dimLabel = document.createElement('label');
  dimLabel.htmlFor = 'show-dimensions';
  dimLabel.textContent = 'Show Dimensions';
  
  dimRow.appendChild(showDimensionsCheckbox);
  dimRow.appendChild(dimLabel);
  content.appendChild(dimRow);
  
  // Show floor summary checkbox
  const summaryRow = document.createElement('div');
  summaryRow.className = 'fp-checkbox-row';
  
  const showFloorSummaryCheckbox = document.createElement('input');
  showFloorSummaryCheckbox.type = 'checkbox';
  showFloorSummaryCheckbox.id = 'show-floor-summary';
  showFloorSummaryCheckbox.checked = initialShowFloorSummary;
  showFloorSummaryCheckbox.addEventListener('change', () => {
    onShowFloorSummaryChange?.(showFloorSummaryCheckbox.checked);
  });
  
  const summaryLabel = document.createElement('label');
  summaryLabel.htmlFor = 'show-floor-summary';
  summaryLabel.textContent = 'Show Floor Summary';
  
  summaryRow.appendChild(showFloorSummaryCheckbox);
  summaryRow.appendChild(summaryLabel);
  content.appendChild(summaryRow);
  
  // Area unit select
  const areaUnitRow = document.createElement('div');
  areaUnitRow.className = 'fp-control-row';
  
  const areaUnitLabel = document.createElement('label');
  areaUnitLabel.className = 'fp-label';
  areaUnitLabel.htmlFor = 'area-unit';
  areaUnitLabel.textContent = 'Area Unit';
  
  const areaUnitSelect = document.createElement('select');
  areaUnitSelect.className = 'fp-select';
  areaUnitSelect.id = 'area-unit';
  areaUnitSelect.innerHTML = `
    <option value="sqft">sq ft</option>
    <option value="sqm">sq m</option>
  `;
  areaUnitSelect.value = initialAreaUnit;
  areaUnitSelect.addEventListener('change', () => {
    onAreaUnitChange?.(areaUnitSelect.value as AreaUnit);
  });
  
  areaUnitRow.appendChild(areaUnitLabel);
  areaUnitRow.appendChild(areaUnitSelect);
  content.appendChild(areaUnitRow);
  
  // Length unit select
  const lengthUnitRow = document.createElement('div');
  lengthUnitRow.className = 'fp-control-row';
  
  const lengthUnitLabel = document.createElement('label');
  lengthUnitLabel.className = 'fp-label';
  lengthUnitLabel.htmlFor = 'length-unit';
  lengthUnitLabel.textContent = 'Length Unit';
  
  const lengthUnitSelect = document.createElement('select');
  lengthUnitSelect.className = 'fp-select';
  lengthUnitSelect.id = 'length-unit';
  lengthUnitSelect.innerHTML = `
    <option value="ft">feet</option>
    <option value="m">meters</option>
    <option value="cm">cm</option>
    <option value="in">inches</option>
    <option value="mm">mm</option>
  `;
  lengthUnitSelect.value = initialLengthUnit;
  lengthUnitSelect.addEventListener('change', () => {
    onLengthUnitChange?.(lengthUnitSelect.value as LengthUnit);
  });
  
  lengthUnitRow.appendChild(lengthUnitLabel);
  lengthUnitRow.appendChild(lengthUnitSelect);
  content.appendChild(lengthUnitRow);
  
  return {
    element: section,
    showAreaCheckbox,
    showDimensionsCheckbox,
    showFloorSummaryCheckbox,
    areaUnitSelect,
    lengthUnitSelect,
  };
}

