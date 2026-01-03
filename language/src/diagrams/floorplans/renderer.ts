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
import { generateRoomSvg, generateRoomLabels, type RoomRenderOptions } from "./room.js";
import { generateConnections } from "./connection.js";
import { getStyles, type FloorplanThemeOptions } from "./styles.js";
import { resolveFloorPositions, type ResolvedPosition, type PositionResolutionResult } from "./position-resolver.js";
import { resolveVariables, getRoomSize } from "./variable-resolver.js";
import { buildStyleContext, type StyleContext } from "./style-resolver.js";
import { computeFloorMetrics, type FloorMetrics, formatEfficiency } from "./metrics.js";
import { convertFloorplanToJson, type JsonFloor } from "./json-converter.js";
import { generateFloorDimensions, type DimensionType, type DimensionRenderOptions, type LengthUnit } from "./dimension.js";
import { resolveConfig, resolveThemeOptions } from "./config-resolver.js";
import { generateFloorCirculation } from "./stair-renderer.js";

/**
 * Generate floor summary panel SVG
 */
function generateFloorSummaryPanel(
  metrics: FloorMetrics,
  bounds: FloorBounds,
  offsetX: number,
  offsetY: number,
  areaUnit: AreaUnit = 'sqft'
): string {
  const panelWidth = bounds.width;
  const panelHeight = 3;
  const panelX = offsetX + bounds.minX;
  const panelY = offsetY + bounds.maxY + 1;
  
  const fontSize = 0.5;
  const lineHeight = 0.8;
  let currentY = panelY + 0.8;
  
  let svg = `<g class="floor-summary" transform="translate(0, 0)">`;
  
  // Panel background
  svg += `<rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" 
    fill="#f5f5f5" stroke="#ccc" stroke-width="0.05" rx="0.2" />`;
  
  // Title
  svg += `<text x="${panelX + panelWidth / 2}" y="${currentY}" text-anchor="middle" 
    font-size="${fontSize * 1.2}" font-weight="bold" fill="#333">Floor Summary</text>`;
  currentY += lineHeight;
  
  // Bounding box
  const bbText = `Bounding: ${metrics.boundingBox.width.toFixed(1)} × ${metrics.boundingBox.height.toFixed(1)} (${metrics.boundingBox.area.toFixed(1)} ${areaUnit})`;
  svg += `<text x="${panelX + 0.3}" y="${currentY}" font-size="${fontSize}" fill="#666">${bbText}</text>`;
  currentY += lineHeight;
  
  // Net area and efficiency
  const netText = `Net Area: ${metrics.netArea.toFixed(1)} ${areaUnit} | Rooms: ${metrics.roomCount} | Efficiency: ${formatEfficiency(metrics.efficiency)}`;
  svg += `<text x="${panelX + 0.3}" y="${currentY}" font-size="${fontSize}" fill="#666">${netText}</text>`;
  
  svg += `</g>`;
  return svg;
}

/** Area unit for display */
export type AreaUnit = 'sqft' | 'sqm';

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
  /** Show room area inside rooms */
  showArea?: boolean;
  /** Unit for displaying area */
  areaUnit?: AreaUnit;
  /** Length unit for dimension annotations (e.g., 'ft', 'm') */
  lengthUnit?: LengthUnit;
  /** Show floor summary panel below each floor */
  showFloorSummary?: boolean;
  /** Show dimension lines on room edges */
  showDimensions?: boolean;
  /** Types of dimensions to show */
  dimensionTypes?: DimensionType[];
}

const defaultRenderOptions: RenderOptions = {
  includeXmlDeclaration: false,
  includeStyles: true,
  padding: 0,
  scale: 1,
  floorIndex: 0,
  renderAllFloors: false,
  multiFloorLayout: 'sideBySide',
  showArea: false,
  areaUnit: 'sqft',
  lengthUnit: 'ft',
  showFloorSummary: false,
  showDimensions: false,
  dimensionTypes: ['width', 'depth'],
};

/**
 * Render a floorplan document to SVG
 */
export function render(
  document: LangiumDocument<Floorplan>,
  options: RenderOptions = {}
): string {
  const floorplan = document.parseResult.value;
  
  if (floorplan.floors.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  }

  // Resolve config from DSL (supports theme, darkMode, fontFamily, etc.)
  const resolvedConfig = resolveConfig(floorplan);
  
  // Resolve theme options from config (handles theme + darkMode)
  const configTheme = resolveThemeOptions(resolvedConfig);
  
  // Merge options: defaults < config < explicit options
  const opts: RenderOptions = {
    ...defaultRenderOptions,
    // Apply config-derived values (can be overridden by explicit options)
    showDimensions: resolvedConfig.showDimensions ?? defaultRenderOptions.showDimensions,
    // Merge theme: config theme + explicit theme options
    theme: { ...configTheme, ...options.theme },
    ...options,
  };
  
  // If showLabels is set in config, we need to pass it through
  // (Currently handled by room renderer, but exposed via config)
  const showLabels = resolvedConfig.showLabels ?? true;

  // Resolve variables from the floorplan
  const variableResolution = resolveVariables(floorplan);
  const variables = variableResolution.variables;
  
  // Build style context for the floorplan
  const styleContext = buildStyleContext(floorplan);

  // Render all floors if requested
  if (opts.renderAllFloors && floorplan.floors.length > 1) {
    return renderAllFloors(floorplan, opts, variables, styleContext, showLabels);
  }

  // Render specific floor (default: first floor for backward compatibility)
  const floorIndex = opts.floorIndex ?? 0;
  const floor = floorplan.floors[floorIndex];
  
  if (!floor) {
    return '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
  }

  return renderFloor(floor, opts, floorplan.connections, variables, styleContext, showLabels);
}

/**
 * Render all floors in a single SVG
 */
function renderAllFloors(
  floorplan: Floorplan,
  options: RenderOptions,
  variables?: Map<string, { width: number; height: number }>,
  styleContext?: StyleContext,
  showLabels: boolean = true
): string {
  const resolvedConfig = resolveConfig(floorplan);
  const opts = { ...defaultRenderOptions, ...options };
  const padding = opts.padding ?? 0;
  const floorGap = 5; // Gap between floors
  const labelHeight = 2; // Height reserved for floor labels
  const summaryHeight = opts.showFloorSummary ? 4 : 0; // Height for floor summary panel (3) + gap (1)
  
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
  
  // Get default unit from config for proper bounds calculation
  const defaultUnit = (resolvedConfig.defaultUnit as LengthUnit) ?? 'ft';
  
  for (const floor of floorplan.floors) {
    const resolution = floorResolutions.get(floor.id)!;
    const resolvedPositions = resolution.positions;
    const bounds = calculateFloorBounds(floor, resolvedPositions, variables, defaultUnit);
    let offsetX = 0;
    let offsetY = 0;
    
    if (opts.multiFloorLayout === 'sideBySide') {
      offsetX = currentOffset - bounds.minX;
      offsetY = labelHeight - bounds.minY;
      currentOffset += bounds.width + floorGap;
      totalWidth = currentOffset - floorGap;
      totalHeight = Math.max(totalHeight, bounds.height + labelHeight + summaryHeight);
    } else {
      // Stacked layout (floor 1 at bottom)
      offsetX = -bounds.minX;
      offsetY = currentOffset - bounds.minY + labelHeight;
      currentOffset += bounds.height + labelHeight + summaryHeight + floorGap;
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

  // Add SVG defs for markers used by stair arrows
  svg += `<defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
    </marker>
  </defs>`;

  if (opts.includeStyles) {
    svg += `<style>${getStyles(opts.theme)}</style>`;
  }

  svg += `<g class="floorplan">`;

  // Build room render options
  const roomRenderOpts: RoomRenderOptions = {
    showArea: opts.showArea,
    areaUnit: opts.areaUnit,
    showLabels: showLabels,
  };

  // Render each floor with its offset
  for (const { floor, bounds, offsetX, offsetY, resolvedPositions } of floorData) {
    // Add floor label
    const labelX = offsetX + bounds.minX + bounds.width / 2;
    const labelY = offsetY + bounds.minY - 0.5;
    svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" class="floor-label" font-size="1.2" font-weight="bold" fill="black">${floor.id}</text>`;
    
    // Add floor group
    svg += `<g class="floor" aria-label="Floor: ${floor.id}" transform="translate(${offsetX}, ${offsetY})">`;
    svg += generateFloorRectangle(floor, resolvedPositions, variables, defaultUnit);
    
    for (const room of floor.rooms) {
      svg += generateRoomSvg(room, 0, 0, resolvedPositions, variables, styleContext, roomRenderOpts);
    }
    
    // Render connections for this floor
    svg += generateConnections(floor, floorplan.connections, resolvedPositions, variables);
    
    // Render stairs and lifts
    svg += generateFloorCirculation(floor, resolvedPositions, { 
      showLabels: showLabels,
      defaultUnit: resolvedConfig.defaultUnit
    });
    
    // Render room labels AFTER circulation elements for proper z-order
    svg += generateRoomLabels(floor.rooms, 0, 0, resolvedPositions, variables, roomRenderOpts);
    
    // Render dimension lines if enabled
    if (opts.showDimensions) {
      const dimensionOpts: DimensionRenderOptions = {
        showDimensions: true,
        dimensionTypes: opts.dimensionTypes,
        lengthUnit: opts.lengthUnit,
      };
      svg += generateFloorDimensions(floor.rooms, resolvedPositions, variables, dimensionOpts);
    }
    
    svg += "</g>";
    
    // Add floor summary panel if enabled
    if (opts.showFloorSummary) {
      const jsonResult = convertFloorplanToJson(floorplan);
      const jsonFloor = jsonResult.data?.floors.find(f => f.id === floor.id);
      if (jsonFloor?.metrics) {
        svg += generateFloorSummaryPanel(jsonFloor.metrics, bounds, offsetX, offsetY, opts.areaUnit);
      }
    }
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
  variables?: Map<string, { width: number; height: number }>,
  styleContext?: StyleContext,
  showLabels: boolean = true
): string {
  const opts = { ...defaultRenderOptions, ...options };
  
  // Try to resolve config from parent floorplan to get default unit
  let defaultUnit: LengthUnit | undefined;
  try {
    // @ts-ignore - Accessing parent container safely
    const floorplan = floor.$container;
    if (floorplan) {
       const config = resolveConfig(floorplan as Floorplan);
       defaultUnit = config.defaultUnit as LengthUnit;
    }
  } catch (e) {
    // Ignore error if container not accessible
  }

  // Resolve relative positions first
  const resolution = resolveFloorPositions(floor, variables);
  const resolvedPositions = resolution.positions;
  
  const bounds = calculateFloorBounds(floor, resolvedPositions, variables, defaultUnit ?? 'ft');
  const padding = opts.padding ?? 0;
  
  // Calculate extra height needed for summary panel
  const summaryHeight = opts.showFloorSummary ? 4 : 0;
  
  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.width + padding * 2} ${bounds.height + padding * 2 + summaryHeight}`;
  
  let svg = "";
  
  if (opts.includeXmlDeclaration) {
    svg += '<?xml version="1.0" encoding="UTF-8"?>\n';
  }

  // Calculate dimensions with scale
  const width = opts.scale ? (bounds.width + padding * 2) * opts.scale : undefined;
  const height = opts.scale ? (bounds.height + padding * 2 + summaryHeight) * opts.scale : undefined;
  
  const dimensionAttrs = width && height 
    ? `width="${width}" height="${height}"` 
    : "";

  svg += `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" ${dimensionAttrs} role="img" aria-roledescription="floorplan">`;

  // Add SVG defs for markers used by stair arrows
  svg += `<defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
    </marker>
  </defs>`;

  // Add styles if requested
  if (opts.includeStyles) {
    svg += `<style>${getStyles(opts.theme)}</style>`;
  }

  // Build room render options
  const roomRenderOpts: RoomRenderOptions = {
    showArea: opts.showArea,
    areaUnit: opts.areaUnit,
    showLabels: showLabels,
  };

  // Add floor group with accessible label
  svg += `<g class="floorplan" aria-label="Floor: ${floor.id}">`;

  if (floor.rooms.length > 0) {
    svg += generateFloorRectangle(floor, resolvedPositions, variables, defaultUnit ?? 'ft');
    for (const room of floor.rooms) {
      svg += generateRoomSvg(room, 0, 0, resolvedPositions, variables, styleContext, roomRenderOpts);
    }
    
    // Render connections for this floor
    svg += generateConnections(floor, connections, resolvedPositions, variables);
    
    // Render stairs and lifts
    svg += generateFloorCirculation(floor, resolvedPositions, { 
      showLabels: showLabels,
      defaultUnit: defaultUnit
    });
    
    // Render room labels AFTER circulation elements for proper z-order
    svg += generateRoomLabels(floor.rooms, 0, 0, resolvedPositions, variables, roomRenderOpts);
    
    // Render dimension lines if enabled
    if (opts.showDimensions) {
      const dimensionOpts: DimensionRenderOptions = {
        showDimensions: true,
        dimensionTypes: opts.dimensionTypes,
        lengthUnit: opts.lengthUnit,
      };
      svg += generateFloorDimensions(floor.rooms, resolvedPositions, variables, dimensionOpts);
    }
    
    // Add floor summary panel if enabled
    if (opts.showFloorSummary) {
      // Build a minimal JsonFloor for metrics computation
      const jsonFloor: JsonFloor = {
        id: floor.id,
        index: 0,
        rooms: floor.rooms.map(room => {
          const resolved = resolvedPositions.get(room.name);
          const size = getRoomSize(room, variables);
          return {
            name: room.name,
            label: room.label,
            x: resolved?.x ?? 0,
            z: resolved?.y ?? 0,
            width: size.width,
            height: size.height,
            walls: [],
          };
        }),
        stairs: [],
        lifts: [],
      };
      const metrics = computeFloorMetrics(jsonFloor);
      svg += generateFloorSummaryPanel(metrics, bounds, 0, 0, opts.areaUnit);
    }
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
export { generateRoomSvg, generateRoomText, generateRoomLabels } from "./room.js";
export { wallRectangle } from "./wall.js";
export { generateDoor } from "./door.js";
export { generateWindow } from "./window.js";
export { generateConnection, generateConnections } from "./connection.js";
export { getStyles, defaultThemeOptions, darkTheme, blueprintTheme } from "./styles.js";
export { resolveFloorPositions, resolveAllPositions, getResolvedPosition } from "./position-resolver.js";
export type { FloorBounds } from "./floor.js";
export type { FloorplanThemeOptions } from "./styles.js";
export type { ResolvedPosition, PositionResolutionResult, PositionResolutionError, OverlapWarning } from "./position-resolver.js";
export { buildStyleContext, resolveRoomStyle, DEFAULT_STYLE } from "./style-resolver.js";
export type { StyleContext, ResolvedStyle } from "./style-resolver.js";
export type { DimensionType, LengthUnit } from "./dimension.js";
