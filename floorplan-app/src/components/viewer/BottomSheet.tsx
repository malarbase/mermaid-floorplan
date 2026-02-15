import type { Component, JSX } from 'solid-js';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: JSX.Element;
}

export const BottomSheet: Component<BottomSheetProps> = (props) => {
  return (
    <div
      class={`bottom-sheet ${props.isOpen ? 'open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div class="bottom-sheet-content">
        <div class="bottom-sheet-handle" />
        {props.children}
      </div>
    </div>
  );
};
