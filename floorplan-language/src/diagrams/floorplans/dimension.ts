/**
 * Dimension line rendering for floorplan SVG generation
 * Generates architectural dimension annotations (lines with ticks and measurements)
 */

import type { Room } from "../../generated/ast.js";
import type { ResolvedPosition } from "./position-resolver.js";
import { getRoomSize } from "./variable-resolver.js";
import type { LengthUnit } from "./unit-utils.js";

/** Types of dimensions that can be displayed */
export type DimensionType = 'width' | 'depth' | 'height';

/** Re-export LengthUnit for consumers */
export type { LengthUnit } from "./unit-utils.js";

/** Options for dimension rendering */
export interface DimensionRenderOptions {
  /** Show dimension lines */
  showDimensions?: boolean;
  /** Types of dimensions to show (default: ['width', 'depth']) */
  dimensionTypes?: DimensionType[];
  /** Offset from room edge for dimension lines */
  dimensionOffset?: number;
  /** Length of tick marks */
  tickLength?: number;
  /** Font size for dimension labels */
  fontSize?: number;
  /** Default room height (for comparison) */
  defaultHeight?: number;
  /** Length unit to display (e.g., 'ft', 'm') */
  lengthUnit?: LengthUnit;
}

const DEFAULT_DIMENSION_OPTIONS: Required<DimensionRenderOptions> = {
  showDimensions: false,
  dimensionTypes: ['width', 'depth'],
  dimensionOffset: 0.8,
  tickLength: 0.3,
  fontSize: 0.5,
  defaultHeight: 3,
  lengthUnit: 'ft',
};

/**
 * Generate a single dimension line with ticks and label
 */
export function generateDimensionLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  value: number,
  options: DimensionRenderOptions = {}
): string {
  const opts = { ...DEFAULT_DIMENSION_OPTIONS, ...options };
  const { tickLength, fontSize, lengthUnit } = opts;
  
  // Calculate direction and length
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < 0.1) return '';
  
  // Normalize direction
  const nx = dx / length;
  const ny = dy / length;
  
  // Perpendicular direction (for tick marks)
  const px = -ny;
  const py = nx;
  
  // Mid point for label
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  
  // Format value with unit (round to reasonable precision)
  const valueNum = value % 1 === 0 ? value.toString() : value.toFixed(1);
  const valueText = `${valueNum}${lengthUnit}`;
  
  let svg = `<g class="dimension-line">`;
  
  // Main dimension line
  svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
    stroke="#333" stroke-width="0.03" />`;
  
  // Start tick
  svg += `<line 
    x1="${x1 + px * tickLength / 2}" y1="${y1 + py * tickLength / 2}" 
    x2="${x1 - px * tickLength / 2}" y2="${y1 - py * tickLength / 2}" 
    stroke="#333" stroke-width="0.03" />`;
  
  // End tick
  svg += `<line 
    x1="${x2 + px * tickLength / 2}" y1="${y2 + py * tickLength / 2}" 
    x2="${x2 - px * tickLength / 2}" y2="${y2 - py * tickLength / 2}" 
    stroke="#333" stroke-width="0.03" />`;
  
  // Label - offset perpendicular to the line
  const labelOffset = 0.3;
  const labelX = midX + px * labelOffset;
  const labelY = midY + py * labelOffset;
  
  // Calculate rotation angle for text
  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  // Keep text readable (not upside down)
  if (angle > 90 || angle < -90) {
    angle += 180;
  }
  
  svg += `<text x="${labelX}" y="${labelY}" 
    text-anchor="middle" dominant-baseline="middle"
    font-size="${fontSize}" fill="#333"
    transform="rotate(${angle}, ${labelX}, ${labelY})">${valueText}</text>`;
  
  svg += `</g>`;
  return svg;
}

/**
 * Generate dimension lines for a room's exterior edges
 */
export function generateRoomDimensions(
  room: Room,
  resolvedPositions: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
  options: DimensionRenderOptions = {}
): string {
  const opts = { ...DEFAULT_DIMENSION_OPTIONS, ...options };
  
  if (!opts.showDimensions) return '';
  
  const resolved = resolvedPositions.get(room.name);
  if (!resolved) return '';
  
  const size = getRoomSize(room, variables);
  const x = resolved.x;
  const y = resolved.y;
  const width = size.width;
  const height = size.height;
  
  const { dimensionOffset } = opts;
  
  let svg = `<g class="room-dimensions" data-room="${room.name}">`;
  
  // Width dimension (above room)
  if (opts.dimensionTypes.includes('width')) {
    svg += generateDimensionLine(
      x, y - dimensionOffset,
      x + width, y - dimensionOffset,
      width,
      opts
    );
  }
  
  // Depth dimension (left of room)
  if (opts.dimensionTypes.includes('depth')) {
    svg += generateDimensionLine(
      x - dimensionOffset, y,
      x - dimensionOffset, y + height,
      height,
      opts
    );
  }
  
  // Height label inside room (if non-default and requested)
  if (opts.dimensionTypes.includes('height') && room.height?.value !== undefined) {
    const roomHeight = room.height.value;
    if (roomHeight !== opts.defaultHeight) {
      const centerX = x + width / 2;
      const labelY = y + height - 0.8; // Near bottom of room
      const heightText = `h: ${roomHeight}${opts.lengthUnit}`;
      svg += `<text x="${centerX}" y="${labelY}" 
        text-anchor="middle" dominant-baseline="middle"
        font-size="${opts.fontSize * 0.9}" fill="#666">${heightText}</text>`;
    }
  }
  
  svg += `</g>`;
  return svg;
}

/**
 * Generate dimension lines for all rooms on a floor
 */
export function generateFloorDimensions(
  rooms: Room[],
  resolvedPositions: Map<string, ResolvedPosition>,
  variables?: Map<string, { width: number; height: number }>,
  options: DimensionRenderOptions = {}
): string {
  const opts = { ...DEFAULT_DIMENSION_OPTIONS, ...options };
  
  if (!opts.showDimensions) return '';
  
  let svg = `<g class="floor-dimensions">`;
  
  for (const room of rooms) {
    svg += generateRoomDimensions(room, resolvedPositions, variables, opts);
  }
  
  svg += `</g>`;
  return svg;
}

/**
 * Generate bounding box dimensions for a floor
 */
export function generateBoundingBoxDimensions(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  options: DimensionRenderOptions = {}
): string {
  const opts = { ...DEFAULT_DIMENSION_OPTIONS, ...options };
  
  if (!opts.showDimensions) return '';
  
  const { dimensionOffset } = opts;
  const bbOffset = dimensionOffset * 2; // Further out than room dimensions
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  let svg = `<g class="bounding-box-dimensions">`;
  
  // Overall width dimension (above all rooms)
  if (opts.dimensionTypes.includes('width')) {
    svg += generateDimensionLine(
      minX, minY - bbOffset,
      maxX, minY - bbOffset,
      width,
      opts
    );
  }
  
  // Overall depth dimension (left of all rooms)
  if (opts.dimensionTypes.includes('depth')) {
    svg += generateDimensionLine(
      minX - bbOffset, minY,
      minX - bbOffset, maxY,
      height,
      opts
    );
  }
  
  svg += `</g>`;
  return svg;
}

