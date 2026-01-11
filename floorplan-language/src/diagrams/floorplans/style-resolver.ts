/**
 * Style resolution utilities for floorplan rendering
 * Provides lookup and fallback logic for room styles
 */

import type { Floorplan, StyleBlock, Room } from "../../generated/ast.js";

/**
 * Resolved style properties for rendering
 */
export interface ResolvedStyle {
  floor_color: string;
  wall_color: string;
  floor_texture?: string;
  wall_texture?: string;
  roughness: number;
  metalness: number;
}

/**
 * Default style when no style is defined
 */
export const DEFAULT_STYLE: ResolvedStyle = {
  floor_color: "#E0E0E0",
  wall_color: "#000000", // Black for walls in SVG
  roughness: 0.8,
  metalness: 0.1
};

/**
 * Style context for rendering, containing style lookup map and default style name
 */
export interface StyleContext {
  /** Map of style name to style definition */
  styles: Map<string, StyleBlock>;
  /** Default style name from config */
  defaultStyleName?: string;
}

/**
 * Build a style context from a floorplan
 */
export function buildStyleContext(floorplan: Floorplan): StyleContext {
  const styles = new Map<string, StyleBlock>();
  
  for (const style of floorplan.styles) {
    styles.set(style.name, style);
  }
  
  // Get default_style from config
  let defaultStyleName: string | undefined;
  if (floorplan.config) {
    for (const prop of floorplan.config.properties) {
      if (prop.name === 'default_style' && prop.styleRef) {
        defaultStyleName = prop.styleRef;
        break;
      }
    }
  }
  
  return { styles, defaultStyleName };
}

/**
 * Resolve the style for a room, with fallback chain:
 * 1. Room's explicit style
 * 2. Default style from config
 * 3. Built-in defaults
 */
export function resolveRoomStyle(
  room: Room,
  context: StyleContext
): ResolvedStyle {
  // Try room's explicit style first
  if (room.styleRef) {
    const style = context.styles.get(room.styleRef);
    if (style) {
      return styleBlockToResolved(style);
    }
  }
  
  // Try default style
  if (context.defaultStyleName) {
    const style = context.styles.get(context.defaultStyleName);
    if (style) {
      return styleBlockToResolved(style);
    }
  }
  
  // Return defaults
  return { ...DEFAULT_STYLE };
}

/**
 * Convert a StyleBlock AST node to resolved style properties
 */
function styleBlockToResolved(style: StyleBlock): ResolvedStyle {
  const resolved: ResolvedStyle = { ...DEFAULT_STYLE };
  
  for (const prop of style.properties) {
    switch (prop.name) {
      case 'floor_color':
        if (prop.stringValue) {
          resolved.floor_color = prop.stringValue.replace(/^["']|["']$/g, '');
        }
        break;
      case 'wall_color':
        if (prop.stringValue) {
          resolved.wall_color = prop.stringValue.replace(/^["']|["']$/g, '');
        }
        break;
      case 'floor_texture':
        if (prop.stringValue) {
          resolved.floor_texture = prop.stringValue.replace(/^["']|["']$/g, '');
        }
        break;
      case 'wall_texture':
        if (prop.stringValue) {
          resolved.wall_texture = prop.stringValue.replace(/^["']|["']$/g, '');
        }
        break;
      case 'roughness':
        if (prop.numberValue !== undefined) {
          resolved.roughness = prop.numberValue;
        }
        break;
      case 'metalness':
        if (prop.numberValue !== undefined) {
          resolved.metalness = prop.numberValue;
        }
        break;
    }
  }
  
  return resolved;
}

/**
 * Get a style by name from context
 */
export function getStyleByName(
  styleName: string,
  context: StyleContext
): ResolvedStyle | undefined {
  const style = context.styles.get(styleName);
  if (style) {
    return styleBlockToResolved(style);
  }
  return undefined;
}

