/**
 * Hybrid Integration Helper for Solid.js Components
 *
 * This module provides utilities for rendering Solid.js components
 * into vanilla JavaScript containers, enabling a hybrid approach
 * where Solid components can be used within a vanilla Three.js app.
 *
 * Usage:
 *   import { renderSolidComponent, unmountSolidComponent } from './render-solid';
 *   import { CommandPalette } from './CommandPalette';
 *
 *   // Mount
 *   const cleanup = renderSolidComponent(
 *     container,
 *     () => <CommandPalette commands={commands} isOpen={true} onClose={close} />
 *   );
 *
 *   // Later: cleanup();
 */

import type { JSXElement } from 'solid-js';
import { render } from 'solid-js/web';

/** Cleanup function type */
export type CleanupFunction = () => void;

/** Map to track mounted components for cleanup */
const mountedComponents = new WeakMap<Element, CleanupFunction>();

/**
 * Render a Solid.js component into a vanilla DOM container.
 *
 * @param container - The DOM element to render into
 * @param component - A function that returns the Solid.js JSX element
 * @returns Cleanup function to unmount the component
 *
 * @example
 * ```tsx
 * const cleanup = renderSolidComponent(
 *   document.getElementById('command-palette-root')!,
 *   () => (
 *     <CommandPalette
 *       commands={commands}
 *       isOpen={isOpen()}
 *       onClose={() => setIsOpen(false)}
 *     />
 *   )
 * );
 * ```
 */
export function renderSolidComponent(
  container: Element,
  component: () => JSXElement,
): CleanupFunction {
  // Unmount existing component if present
  const existingCleanup = mountedComponents.get(container);
  if (existingCleanup) {
    existingCleanup();
  }

  // Render the Solid component
  const dispose = render(component, container);

  // Store cleanup function
  mountedComponents.set(container, dispose);

  return () => {
    dispose();
    mountedComponents.delete(container);
  };
}

/**
 * Unmount a Solid.js component from a container.
 *
 * @param container - The DOM element containing the Solid component
 * @returns true if a component was unmounted, false if none was found
 */
export function unmountSolidComponent(container: Element): boolean {
  const cleanup = mountedComponents.get(container);
  if (cleanup) {
    cleanup();
    mountedComponents.delete(container);
    return true;
  }
  return false;
}

/**
 * Check if a container has a mounted Solid component.
 *
 * @param container - The DOM element to check
 * @returns true if a Solid component is mounted
 */
export function hasSolidComponent(container: Element): boolean {
  return mountedComponents.has(container);
}

/**
 * Create a container element for mounting a Solid component.
 *
 * @param id - Optional ID for the container
 * @param className - Optional class name
 * @returns The created container element
 */
export function createSolidContainer(id?: string, className?: string): HTMLDivElement {
  const container = document.createElement('div');
  if (id) container.id = id;
  if (className) container.className = className;
  return container;
}
