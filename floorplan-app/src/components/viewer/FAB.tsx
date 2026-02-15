import type { Component } from 'solid-js';

interface FABProps {
  onClick: () => void;
  mode: 'basic' | 'advanced' | 'editor';
}

export const FAB: Component<FABProps> = (props) => {
  return (
    <button
      class="btn btn-circle btn-primary btn-lg shadow-lg fab-button"
      onClick={props.onClick}
      title={props.mode === 'editor' ? 'Show editor & controls' : 'Show controls'}
    >
      {props.mode === 'editor' ? '✏️' : '⚙️'}
    </button>
  );
};
