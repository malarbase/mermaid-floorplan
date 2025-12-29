/**
 * Floorplan diagram renderer
 * Following Mermaid's rendering conventions
 * 
 * This is the main entry point for rendering floorplan diagrams.
 * It takes a parsed Langium document and produces SVG output.
 */

import type { Floorplan, Floor, Connection } from "../../generated/ast.js";
import type { LangiumDocument } from "langium";
import { calculateFloorBounds, generateFloorRectangle, type FloorBounds } from "./floor.js";
import { generateRoomSvg } from "./room.js";
import { generateConnections } from "./connection.js";
import { getStyles, type FloorplanThemeOptions } from "./styles.js";
import { resolveFloorPositions, type ResolvedPosition, type PositionResolutionResult } from "./position-resolver.js";
import { resolveVariables } from "./variable-resolver.js";

export interface RenderOptions {
  /** Include XML declaration in output */
  includeXmlDeclaration?: boolean;
  /** Include embedded styles */
  includeStyles?: boolean;
  /** Theme options for styling */
  theme?: Partial<FloorplanThemeOptions>;
  /** Padding around the diagram */
  padding?: number;
  /** Scale factor for output dimensions */
  scale?: number;
  /** Floor index to render (default: 0 for backward compatibility) */
  floorIndex?: number;
  /** Render all floors in a single SVG */
  renderAllFloors?: boolean;
  /** Layout for multi-floor rendering: 'stacked' (vertical) or 'sideBySide' (horizontal) */
  multiFloorLayout?: 'stacked' | 'sideBySide';
}

const defaultRenderOptions: RenderOptions = {
  includeXmlDeclaration: false,
  includeStyles: true,
  padding: 0,
  scale: 1,
  floorIndex: 0,
  renderAllFloors: false,
  multiFloorLayout: 'sideBySide',
};

/**
 * Render a floorplan document to SVG
 */
export function render(
  document: LangiumDocument<Floorplan>,
  options: RenderOptions = {}
): string {
  const opts = { ...defaultRenderOptions, ...options };
  const floorplan = document.parseResult.value;
  
  if (floorplan.floors.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  }

  // Resolve variables from the floorplan
  const variableResolution = resolveVariables(floorplan);
  const variables = variableResolution.variables;

  // Render all floors if requested
  if (opts.renderAllFloors && floorplan.floors.length > 1) {
    return renderAllFloors(floorplan, opts, variables);
  }

  // Render specific floor (default: first floor for backward compatibility)
  const floorIndex = opts.floorIndex ?? 0;
  const floor = floorplan.floors[floorIndex];
  
  if (!floor) {
    return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  }

  return renderFloor(floor, opts, floorplan.connections, variables);
}

/**
 * Render all floors in a single SVG
 */
function renderAllFloors(
  floorplan: Floorplan,
  options: RenderOptions,
  variables?: Map<string, { width: number; height: number }>
): string {
  const opts = { ...defaultRenderOptions, ...options };
  const padding = opts.padding ?? 0;
  const floorGap = 5; // Gap between floors
  const labelHeight = 2; // Height reserved for floor labels
  
  // Resolve positions for all floors first
  const floorResolutions = new Map<string, PositionResolutionResult>();
  for (const floor of floorplan.floors) {
    floorResolutions.set(floor.id, resolveFloorPositions(floor, variables));
  }
  
  // Calculate bounds for all floors
  const floorData: Array<{ floor: Floor; bounds: FloorBounds; offsetX: number; offsetY: number; resolvedPositions: Map<string, ResolvedPosition> }> = [];
  let totalWidth = 0;
  let totalHeight = 0;
  let currentOffset = 0;
  
  for (const floor of floorplan.floors) {
    const resolution = floorResolutions.get(floor.id)!;
    const resolvedPositions = resolution.positions;
    const bounds = calculateFloorBounds(floor, resolvedPositions, variables);
    let offsetX = 0;
    let offsetY = 0;
    
    if (opts.multiFloorLayout === 'sideBySide') {
      offsetX = currentOffset - bounds.minX;
      offsetY = labelHeight - bounds.minY;
      currentOffset += bounds.width + floorGap;
      totalWidth = currentOffset - floorGap;
      totalHeight = Math.max(totalHeight, bounds.height + labelHeight);
    } else {
      // Stacked layout (floor 1 at bottom)
      offsetX = -bounds.minX;
      offsetY = currentOffset - bounds.minY + labelHeight;
      currentOffset += bounds.height + labelHeight + floorGap;
      totalWidth = Math.max(totalWidth, bounds.width);
      totalHeight = currentOffset - floorGap;
    }
    
    floorData.push({ floor, bounds, offsetX, offsetY, resolvedPositions });
  }
  
  // For stacked layout, reverse so floor 1 is at bottom
  if (opts.multiFloorLayout === 'stacked') {
    floorData.reverse();
    // Recalculate offsets with reversed order
    currentOffset = 0;
    for (const data of floorData) {
      data.offsetY = currentOffset - data.bounds.minY + labelHeight;
      currentOffset += data.bounds.height + labelHeight + floorGap;
    }
  }
  
  const viewBox = `${-padding} ${-padding} ${totalWidth + padding * 2} ${totalHeight + padding * 2}`;
  
  let svg = "";
  
  if (opts.includeXmlDeclaration) {
    svg += '<?xml version="1.0" encoding="UTF-8"?>\n';
  }

  const width = opts.scale ? (totalWidth + padding * 2) * opts.scale : undefined;
  const height = opts.scale ? (totalHeight + padding * 2) * opts.scale : undefined;
  
  const dimensionAttrs = width && height 
    ? `width="${width}" height="${height}"` 
    : "";

  svg += `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ${dimensionAttrs} role="img" aria-roledescription="floorplan">`;

  if (opts.includeStyles) {
    svg += `<style>${getStyles(opts.theme)}</style>`;
  }

  svg += `<g class="floorplan">`;

  // Render each floor with its offset
  for (const { floor, bounds, offsetX, offsetY, resolvedPositions } of floorData) {
    // Add floor label
    const labelX = offsetX + bounds.minX + bounds.width / 2;
    const labelY = offsetY + bounds.minY - 0.5;
    svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" class="floor-label" font-size="1.2" font-weight="bold" fill="black">${floor.id}</text>`;
    
    // Add floor group
    svg += `<g class="floor" aria-label="Floor: ${floor.id}" transform="translate(${offsetX}, ${offsetY})">`;
    svg += generateFloorRectangle(floor, resolvedPositions, variables);
    
    for (const room of floor.rooms) {
      svg += generateRoomSvg(room, 0, 0, resolvedPositions, variables);
    }
    
    // Render connections for this floor
    svg += generateConnections(floor, floorplan.connections, resolvedPositions, variables);
    
    svg += "</g>";
  }

  svg += "</g></svg>";
  return svg;
}

/**
 * Render a single floor to SVG
 */
export function renderFloor(
  floor: Floor,
  options: RenderOptions = {},
  connections: Connection[] = [],
  variables?: Map<string, { width: number; height: number }>
): string {
  const opts = { ...defaultRenderOptions, ...options };
  
  // Resolve relative positions first
  const resolution = resolveFloorPositions(floor, variables);
  const resolvedPositions = resolution.positions;
  
  const bounds = calculateFloorBounds(floor, resolvedPositions, variables);
  const padding = opts.padding ?? 0;

  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2}`;
  
  let svg = "";
  
  if (opts.includeXmlDeclaration) {
    svg += '<?xml version="1.0" encoding="UTF-8"?>\n';
  }

  // Calculate dimensions with scale
  const width = opts.scale ? (bounds.width + padding * 2) * opts.scale : undefined;
  const height = opts.scale ? (bounds.height + padding * 2) * opts.scale : undefined;
  
  const dimensionAttrs = width && height 
    ? `width="${width}" height="${height}"` 
    : "";

  svg += `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ${dimensionAttrs} role="img" aria-roledescription="floorplan">`;

  // Add styles if requested
  if (opts.includeStyles) {
    svg += `<style>${getStyles(opts.theme)}</style>`;
  }

  // Add floor group with accessible label
  svg += `<g class="floorplan" aria-label="Floor: ${floor.id}">`;

  if (floor.rooms.length > 0) {
    svg += generateFloorRectangle(floor, resolvedPositions, variables);
    for (const room of floor.rooms) {
      svg += generateRoomSvg(room, 0, 0, resolvedPositions, variables);
    }
    
    // Render connections for this floor
    svg += generateConnections(floor, connections, resolvedPositions, variables);
  }

  svg += "</g></svg>";
  return svg;
}

/**
 * Render for standalone SVG file output
 */
export function renderToFile(floor: Floor, options: RenderOptions = {}): string {
  return renderFloor(floor, {
    ...options,
    includeXmlDeclaration: true,
    includeStyles: true,
    padding: options.padding ?? 2,
    scale: options.scale ?? 15,
  });
}

// Re-export utilities for direct access
export { calculateFloorBounds, generateFloorRectangle } from "./floor.js";
export { generateRoomSvg, generateRoomText } from "./room.js";
export { wallRectangle } from "./wall.js";
export { generateDoor } from "./door.js";
export { generateWindow } from "./window.js";
export { generateConnection, generateConnections } from "./connection.js";
export { getStyles, defaultThemeOptions, darkTheme, blueprintTheme } from "./styles.js";
export { resolveFloorPositions, resolveAllPositions, getResolvedPosition } from "./position-resolver.js";
export type { FloorBounds } from "./floor.js";
export type { FloorplanThemeOptions } from "./styles.js";
export type { ResolvedPosition, PositionResolutionResult, PositionResolutionError, OverlapWarning } from "./position-resolver.js";
