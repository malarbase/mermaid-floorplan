/**
 * Floor visibility controls UI component
 */
import { injectStyles } from './styles.js';
import { createControlPanelSection, getSectionContent } from './control-panel-section.js';
import { cls } from './class-names.js';

export interface FloorControlsUIOptions {
  onShowAll?: () => void;
  onHideAll?: () => void;
  onFloorToggle?: (floorId: string, visible: boolean) => void;
}

export interface FloorControlsUI {
  element: HTMLElement;
  floorList: HTMLElement;
  showAllButton: HTMLButtonElement;
  hideAllButton: HTMLButtonElement;
  updateFloorList: (floors: { id: string; visible: boolean }[]) => void;
}

/**
 * Create floor visibility controls UI section
 */
export function createFloorControlsUI(options: FloorControlsUIOptions = {}): FloorControlsUI {
  injectStyles();
  
  const { onShowAll, onHideAll, onFloorToggle } = options;
  
  const section = createControlPanelSection({
    title: 'Floors',
    id: 'floor-section',
  });
  
  const content = getSectionContent(section)!;
  
  // Floor list container
  const floorList = document.createElement('div');
  floorList.className = 'fp-floor-list';
  floorList.id = 'floor-list';
  
  const noFloorsMsg = document.createElement('div');
  noFloorsMsg.className = cls.text.muted;
  noFloorsMsg.textContent = 'Load a floorplan to see floors';
  floorList.appendChild(noFloorsMsg);
  
  content.appendChild(floorList);
  
  // Button group
  const buttonGroup = document.createElement('div');
  buttonGroup.className = cls.layout.gapMt;
  
  const showAllButton = document.createElement('button');
  showAllButton.className = cls.btn.ghostXsFlex;
  showAllButton.id = 'show-all-floors';
  showAllButton.textContent = 'Show All';
  showAllButton.addEventListener('click', () => onShowAll?.());
  
  const hideAllButton = document.createElement('button');
  hideAllButton.className = cls.btn.ghostXsFlex;
  hideAllButton.id = 'hide-all-floors';
  hideAllButton.textContent = 'Hide All';
  hideAllButton.addEventListener('click', () => onHideAll?.());
  
  buttonGroup.appendChild(showAllButton);
  buttonGroup.appendChild(hideAllButton);
  content.appendChild(buttonGroup);
  
  // Update floor list function
  const updateFloorList = (floors: { id: string; visible: boolean }[]) => {
    floorList.innerHTML = '';
    
    if (floors.length === 0) {
      const noFloorsMsg = document.createElement('div');
      noFloorsMsg.className = cls.text.muted;
      noFloorsMsg.textContent = 'Load a floorplan to see floors';
      floorList.appendChild(noFloorsMsg);
      return;
    }
    
    floors.forEach((floor, index) => {
      const item = document.createElement('label');
      item.className = cls.checkbox.wrapper;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = cls.checkbox.input;
      checkbox.id = `floor-toggle-${index}`;
      checkbox.checked = floor.visible;
      checkbox.addEventListener('change', () => {
        onFloorToggle?.(floor.id, checkbox.checked);
      });
      
      const labelText = document.createElement('span');
      labelText.className = cls.checkbox.label;
      labelText.textContent = floor.id;
      
      item.appendChild(checkbox);
      item.appendChild(labelText);
      floorList.appendChild(item);
    });
  };
  
  return {
    element: section,
    floorList,
    showAllButton,
    hideAllButton,
    updateFloorList,
  };
}

