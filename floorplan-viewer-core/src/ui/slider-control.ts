/**
 * Reusable slider control component
 */

import { cls } from './class-names.js';
import { injectStyles } from './styles.js';

export interface SliderControlOptions {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  step?: number;
  formatValue?: (value: number) => string;
  onChange?: (value: number) => void;
}

export interface SliderControl {
  element: HTMLElement;
  slider: HTMLInputElement;
  valueDisplay: HTMLElement;
  setValue: (value: number) => void;
  getValue: () => number;
}

/**
 * Create a slider control with label and value display
 */
export function createSliderControl(options: SliderControlOptions): SliderControl {
  injectStyles();

  const {
    id,
    label,
    min,
    max,
    value,
    step = 1,
    formatValue = (v) => String(v),
    onChange,
  } = options;

  const container = document.createElement('div');
  container.className = 'fp-control-group';
  container.id = `${id}-group`;

  const row = document.createElement('div');
  row.className = cls.layout.between;

  const labelEl = document.createElement('label');
  labelEl.className = cls.text.label;
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const valueDisplay = document.createElement('span');
  valueDisplay.className = cls.text.xs;
  valueDisplay.id = `${id}-value`;
  valueDisplay.textContent = formatValue(value);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = cls.range.xs;
  slider.id = id;
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);

  slider.addEventListener('input', () => {
    const newValue = parseFloat(slider.value);
    valueDisplay.textContent = formatValue(newValue);
    onChange?.(newValue);
  });

  row.appendChild(labelEl);
  row.appendChild(valueDisplay);
  container.appendChild(row);
  container.appendChild(slider);

  return {
    element: container,
    slider,
    valueDisplay,
    setValue: (newValue: number) => {
      slider.value = String(newValue);
      valueDisplay.textContent = formatValue(newValue);
    },
    getValue: () => parseFloat(slider.value),
  };
}
